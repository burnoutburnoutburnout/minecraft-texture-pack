#!/usr/bin/env python3
"""
Galaxy GUI - resource pack generator for Minecraft 1.8.9.

Everything in the pack is drawn procedurally by this script:
  * animated galaxy hearts (a slowly spinning spiral galaxy inside each heart)
  * steak hunger bar (replaces the drumsticks)
  * animated galaxy XP bar (teal/violet nebula that flows along the bar)
  * matching crosshair, armor, air bubbles, boss/jump bars and ping icons

The animation uses OptiFine "custom animations" (assets/minecraft/mcpatcher/anim),
because vanilla 1.8.9 cannot animate GUI textures. Without OptiFine the hearts and
XP bar still show as a static galaxy frame.

Usage:
    python3 generator/build.py                  # builds 256x and 512x into dist/
    python3 generator/build.py --res 256        # only one resolution
    python3 generator/build.py --preview        # also writes preview images

Requires: numpy, Pillow
"""
import argparse
import io
import json
import math
import os
import zipfile

import numpy as np
from PIL import Image

TAU = 2.0 * math.pi
PACK_NAME = "Galaxy GUI"

# Animation settings (OptiFine: duration is in game ticks, 20 ticks = 1 second)
HEART_FRAMES = 40
HEART_DURATION = 2     # 40 frames * 2 ticks = 4 s per full galaxy rotation
XP_FRAMES = 40
XP_DURATION = 2


# --------------------------------------------------------------------------- #
# Small math helpers
# --------------------------------------------------------------------------- #
def sat(x):
    return np.clip(x, 0.0, 1.0)


def smoothstep(a, b, x):
    t = sat((x - a) / (b - a))
    return t * t * (3.0 - 2.0 * t)


def rgb(*c):
    return np.array(c, dtype=np.float32) / 255.0


def mix(a, b, t):
    """Linear blend of colours; a scalar-field t is broadcast over the RGB axis."""
    t = np.asarray(t, dtype=np.float32)
    if t.ndim:
        t = t[..., None]
    return a * (1.0 - t) + b * t


def smin(a, b, k):
    h = sat(0.5 + 0.5 * (b - a) / k)
    return b * (1.0 - h) + a * h - k * h * (1.0 - h)


# --------------------------------------------------------------------------- #
# Tileable noise (periodic by construction, so animations loop seamlessly)
# --------------------------------------------------------------------------- #
def tile_noise(n, beta, seed):
    rng = np.random.default_rng(seed)
    white = rng.standard_normal((n, n))
    f = np.fft.fftfreq(n)
    fx, fy = np.meshgrid(f, f)
    rad = np.sqrt(fx * fx + fy * fy)
    rad[0, 0] = 1.0
    spec = np.fft.fft2(white) / rad ** (beta / 2.0)
    spec[0, 0] = 0.0
    out = np.real(np.fft.ifft2(spec))
    return ((out - out.mean()) / out.std()).astype(np.float32)


NOISE_N = 256
NOISE = [tile_noise(NOISE_N, 2.7, s) for s in range(6)]


def samp(tex, u, v):
    """Bilinear sample with wrap-around."""
    n = tex.shape[0]
    u = np.mod(u, n)
    v = np.mod(v, n)
    x0 = np.floor(u).astype(np.int32)
    y0 = np.floor(v).astype(np.int32)
    fx = (u - x0).astype(np.float32)
    fy = (v - y0).astype(np.float32)
    x0 %= n
    y0 %= n
    x1 = (x0 + 1) % n
    y1 = (y0 + 1) % n
    a = tex[y0, x0]
    b = tex[y0, x1]
    c = tex[y1, x0]
    d = tex[y1, x1]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy


def fbm(k, u, v):
    """Two octaves; the octave factor is exactly 2 so tiling (and looping) is kept."""
    return (samp(NOISE[k % 6], u, v)
            + 0.5 * samp(NOISE[(k + 3) % 6], u * 2.0 + 17.0, v * 2.0 + 31.0)) / 1.118


# --------------------------------------------------------------------------- #
# Signed distance functions (units = vanilla 16x pixels, "base px")
# --------------------------------------------------------------------------- #
def sd_heart_unit(px, py):
    # Exact heart SDF (Inigo Quilez). Point (0,0) is the bottom tip, y up.
    px = np.abs(px)
    d1 = np.hypot(px - 0.25, py - 0.75) - math.sqrt(2.0) / 4.0
    t = 0.5 * np.maximum(px + py, 0.0)
    d2 = np.sqrt(np.minimum(px * px + (py - 1.0) ** 2,
                            (px - t) ** 2 + (py - t) ** 2)) * np.sign(px - py)
    return np.where(py + px > 1.0, d1, d2)


HEART_K = 7.0


def sd_heart(X, Y):
    return sd_heart_unit((X - 4.5) / HEART_K, (8.35 - Y) / HEART_K) * HEART_K


def sd_ellipse(X, Y, cx, cy, rx, ry, ang):
    dx, dy = X - cx, Y - cy
    c, s = math.cos(ang), math.sin(ang)
    ex = dx * c + dy * s
    ey = -dx * s + dy * c
    k = np.hypot(ex / rx, ey / ry)
    g = np.hypot(ex / (rx * rx), ey / (ry * ry))
    return (k - 1.0) * k / np.maximum(g, 1e-6)


def sd_circle(X, Y, cx, cy, r):
    return np.hypot(X - cx, Y - cy) - r


def sd_box(X, Y, cx, cy, hx, hy, r=0.0):
    qx = np.abs(X - cx) - hx + r
    qy = np.abs(Y - cy) - hy + r
    return (np.hypot(np.maximum(qx, 0), np.maximum(qy, 0))
            + np.minimum(np.maximum(qx, qy), 0) - r)


def sd_polygon(X, Y, pts):
    pts = np.asarray(pts, dtype=np.float32)
    d = (X - pts[0, 0]) ** 2 + (Y - pts[0, 1]) ** 2
    s = np.ones_like(X)
    n = len(pts)
    j = n - 1
    for i in range(n):
        ex, ey = pts[j] - pts[i]
        wx, wy = X - pts[i, 0], Y - pts[i, 1]
        t = np.clip((wx * ex + wy * ey) / (ex * ex + ey * ey), 0, 1)
        bx, by = wx - ex * t, wy - ey * t
        d = np.minimum(d, bx * bx + by * by)
        c1 = Y >= pts[i, 1]
        c2 = Y < pts[j, 1]
        c3 = ex * wy > ey * wx
        flip = (c1 & c2 & c3) | (~c1 & ~c2 & ~c3)
        s = np.where(flip, -s, s)
        j = i
    return s * np.sqrt(d)


# --------------------------------------------------------------------------- #
# Palettes
# --------------------------------------------------------------------------- #
def pal(deep, neb1, neb2, arm, core, rim, outline):
    return dict(deep=rgb(*deep), neb1=rgb(*neb1), neb2=rgb(*neb2), arm=rgb(*arm),
                core=rgb(*core), rim=rgb(*rim), outline=rgb(*outline))


PAL_HEART = pal((10, 3, 30), (104, 30, 178), (38, 70, 214), (236, 72, 196),
                (255, 226, 250), (206, 160, 255), (24, 4, 44))
PAL_XP = pal((3, 10, 32), (18, 160, 190), (108, 66, 250), (84, 226, 255),
             (232, 255, 255), (166, 240, 255), (8, 22, 52))
PAL_POISON = pal((5, 22, 10), (52, 150, 60), (20, 104, 90), (150, 232, 90),
                 (232, 255, 210), (180, 255, 160), (8, 30, 12))
PAL_WITHER = pal((6, 6, 9), (58, 56, 70), (34, 34, 46), (112, 108, 124),
                 (210, 206, 220), (140, 136, 152), (2, 2, 4))
PAL_GOLD = pal((40, 18, 4), (214, 140, 26), (240, 186, 60), (255, 222, 96),
               (255, 250, 222), (255, 230, 150), (52, 24, 4))
PAL_ARMOR = pal((22, 22, 52), (96, 104, 180), (70, 130, 214), (190, 196, 255),
                (240, 242, 255), (200, 210, 255), (16, 10, 40))
PAL_BOSS = pal((24, 2, 26), (170, 30, 150), (96, 30, 200), (255, 90, 210),
               (255, 220, 250), (255, 170, 240), (30, 4, 34))

WHITE = rgb(255, 255, 255)


# --------------------------------------------------------------------------- #
# Renderer
# --------------------------------------------------------------------------- #
class Renderer:
    def __init__(self, S):
        self.S = S          # output pixels per base px (16 -> 256x, 32 -> 512x)
        self.px = 1.0 / S

    def grid(self, w, h):
        xs = (np.arange(int(round(w * self.S)), dtype=np.float32) + 0.5) / self.S
        ys = (np.arange(int(round(h * self.S)), dtype=np.float32) + 0.5) / self.S
        return np.meshgrid(xs, ys)

    def cov(self, d):
        """Anti-aliased coverage from a signed distance (in base px)."""
        return sat(0.5 - d / self.px).astype(np.float32)

    # ---------------- stars ----------------
    def add_stars(self, col, X, Y, stars, t, tint=WHITE):
        xs = X[0, :]
        ys = Y[:, 0]
        for (sx, sy, b, size, k, ph, glint) in stars:
            tw = 0.55 + 0.45 * math.sin(TAU * (k * t + ph)) if k else 1.0
            amp = b * tw
            reach = 1.3 if glint else size * 4.0
            x0 = np.searchsorted(xs, sx - reach)
            x1 = np.searchsorted(xs, sx + reach)
            y0 = np.searchsorted(ys, sy - reach)
            y1 = np.searchsorted(ys, sy + reach)
            if x1 <= x0 or y1 <= y0:
                continue
            dx = X[y0:y1, x0:x1] - sx
            dy = Y[y0:y1, x0:x1] - sy
            g = np.exp(-(dx * dx + dy * dy) / (2.0 * size * size))
            if glint:
                g = g + 0.55 * tw * (np.exp(-np.abs(dx) / 0.06) * np.exp(-(dy / 0.8) ** 2)
                                     + np.exp(-np.abs(dy) / 0.06) * np.exp(-(dx / 0.8) ** 2))
            col[y0:y1, x0:x1] += (amp * g)[..., None] * tint

    @staticmethod
    def make_stars(seed, n, w, h, rot_center=None, twinkle=True):
        rng = np.random.default_rng(seed)
        stars = []
        for i in range(n):
            x = rng.uniform(0, w)
            y = rng.uniform(0, h)
            big = rng.random() < 0.18
            b = rng.uniform(0.7, 1.0) if big else rng.uniform(0.25, 0.65)
            size = rng.uniform(0.11, 0.16) if big else rng.uniform(0.06, 0.1)
            k = int(rng.integers(1, 4)) if twinkle else 0
            stars.append([x, y, b, size, k, rng.random(), big])
        return stars

    # ---------------- galaxy fill ----------------
    def galaxy(self, X, Y, t, P, cx=4.5, cy=4.7, seed=0, stars=None):
        ang = TAU * t
        dx, dy = X - cx, Y - cy
        r = np.hypot(dx, dy)
        phi = np.arctan2(dy, dx)
        twist = 0.38
        th = -ang + twist * r
        c, s = np.cos(th), np.sin(th)
        qx = dx * c - dy * s
        qy = dx * s + dy * c
        sc = 9.0
        n1 = fbm(seed, qx * sc + 60.0, qy * sc + 90.0)
        n2 = fbm(seed + 1, qx * sc * 0.5 + 140.0, qy * sc * 0.5 + 10.0)
        arm = (0.5 + 0.5 * np.cos(2.0 * (phi - ang + twist * r))) ** 2.5 * np.exp(-r / 3.4)
        core = np.exp(-(r / 1.05) ** 2)
        neb = sat(0.5 + 0.33 * n1)
        hue = sat(0.5 + 0.45 * n2)
        nebc = mix(P["neb1"], P["neb2"], hue)
        col = mix(P["deep"], nebc, sat(neb * (0.3 + 0.95 * arm) + 0.08))
        col = col + P["arm"] * (arm * (0.3 + 0.7 * neb) * 0.75)[..., None]
        col = mix(col, P["core"], core * 0.92)
        col = np.array(col, dtype=np.float32)
        if stars is not None:
            # stars orbit with the galaxy (rigid rotation -> loops every cycle)
            cs, sn = math.cos(ang), math.sin(ang)
            moved = []
            for st in stars:
                ox, oy = st[0] - cx, st[1] - cy
                moved.append([cx + ox * cs - oy * sn, cy + ox * sn + oy * cs] + st[2:])
            self.add_stars(col, X, Y, moved, t)
        return col

    # ---------------- hearts ----------------
    def heart(self, t, P, kind="full", flash=False, seed=0):
        X, Y = self.grid(9, 9)
        d = sd_heart(X, Y)
        alpha = self.cov(d)
        ow = 0.85
        inner = self.cov(d + ow)
        if kind == "container":
            interior = rgb(26, 14, 40)
            outline = rgb(250, 240, 255) if flash else rgb(6, 2, 12)
            col = np.broadcast_to(interior, X.shape + (3,)).copy()
            # faint static star dust inside the empty heart
            self.add_stars(col, X, Y, self.make_stars(99, 7, 9, 9, twinkle=False), 0,
                           tint=rgb(120, 90, 160))
            col = mix(outline, col, inner)
        else:
            stars = self.make_stars(seed + 11, 16, 9, 9)
            g = self.galaxy(X, Y, t, P, seed=seed, stars=stars)
            rim = np.exp(-np.maximum(-d - ow, 0.0) / 0.7) * 0.42
            g = g + P["rim"] * rim[..., None]
            # glossy highlight (top-left lobe)
            gl = sd_ellipse(X, Y, 2.55, 2.75, 0.95, 0.55, -0.7)
            g = mix(g, WHITE, sat(-gl / 0.45) * 0.55)
            g = g * (1.0 - 0.28 * sat((X + Y - 9.5) / 5.0))[..., None]
            outline = P["outline"]
            if flash:
                g = mix(g, WHITE, 0.45)
                outline = rgb(250, 240, 255)
            col = mix(outline, g, inner)
        if kind == "half":
            alpha = alpha * self.cov(X - 4.5)
        return to_rgba(col, alpha)

    # ---------------- steak (hunger) ----------------
    def steak_sd(self, X, Y):
        # classic cartoon steak: a fat rounded blob with a notch bitten into one side
        d = sd_ellipse(X, Y, 4.6, 4.6, 4.0, 3.15, -0.45)
        notch = sd_circle(X, Y, 1.15, 7.35, 1.85)
        d = -smin(-d, notch, 0.6)
        wob = samp(NOISE[4], X * 6.0, Y * 6.0) * 0.1
        return d + wob

    def steak(self, kind="full", flash=False, hunger=False):
        X, Y = self.grid(9, 9)
        d = self.steak_sd(X, Y)
        alpha = self.cov(d)
        ow = 0.6
        inner = self.cov(d + ow)
        if kind == "container":
            interior = rgb(40, 22, 14)
            if hunger:
                interior = rgb(26, 34, 14)
            outline = rgb(250, 240, 230) if flash else rgb(10, 5, 2)
            col = mix(outline, interior, inner)
        else:
            fatw = 1.3
            meat_in = self.cov(d + fatw)
            # fat rim: creamy, browned toward the outer edge
            fat = mix(rgb(170, 96, 50), rgb(242, 214, 172), smoothstep(-0.6, -1.15, d))
            fat = fat * (1.0 + 0.08 * samp(NOISE[5], X * 14, Y * 14))[..., None]
            # seared meat: darker crust near the fat, juicier centre, light marbling
            n1 = fbm(2, X * 11.0 + 30, Y * 11.0 + 70)
            meat = mix(rgb(92, 34, 16), rgb(146, 58, 28), sat(0.55 + 0.25 * n1))
            meat = mix(rgb(70, 26, 12), meat, smoothstep(-1.3, -2.3, d))
            marb = np.exp(-(fbm(3, X * 7.0, Y * 7.0) / 0.1) ** 2)
            meat = mix(meat, rgb(188, 112, 74), marb * 0.35)
            # grill marks
            s = X * 0.74 - Y * 0.67
            band = np.abs(np.mod(s + 0.9, 2.2) - 1.1)
            grill = smoothstep(0.36, 0.2, band) * self.cov(d + fatw + 0.3)
            meat = mix(meat, rgb(40, 14, 6), grill * 0.9)
            col = mix(fat, meat, meat_in)
            # soft lighting + a small juicy highlight
            col = col * (1.1 - 0.32 * sat((X + Y - 6.0) / 8.0))[..., None]
            gl = sd_ellipse(X, Y, 3.3, 3.0, 0.75, 0.3, -0.75)
            col = mix(col, rgb(255, 236, 220), sat(-gl / 0.3) * 0.45)
            outline = rgb(42, 14, 4)
            if hunger:
                col = mix(col, rgb(96, 150, 46), 0.5)
                outline = rgb(18, 34, 6)
            if flash:
                col = mix(col, WHITE, 0.42)
                outline = rgb(250, 240, 230)
            col = mix(outline, col, inner)
        if kind == "half":
            # the food bar fills right-to-left, so the half icon keeps the right side
            alpha = alpha * self.cov(4.5 - X)
        return to_rgba(col, alpha)

    # ---------------- armor ----------------
    ARMOR_PTS = [(1.1, 1.3), (3.2, 0.8), (4.5, 2.1), (5.8, 0.8), (7.9, 1.3), (8.5, 4.1),
                 (6.9, 4.4), (6.9, 8.3), (2.1, 8.3), (2.1, 4.4), (0.5, 4.1)]

    def armor(self, kind="full"):
        X, Y = self.grid(9, 9)
        d = sd_polygon(X, Y, self.ARMOR_PTS) - 0.15
        alpha = self.cov(d)
        ow = 0.65
        inner = self.cov(d + ow)
        if kind == "empty":
            col = mix(rgb(8, 4, 18), rgb(30, 22, 48), inner)
            return to_rgba(col, alpha)
        g = self.galaxy(X, Y, 0.0, PAL_ARMOR, cy=4.6, seed=1,
                        stars=self.make_stars(31, 10, 9, 9, twinkle=False))
        g = g + PAL_ARMOR["rim"] * (np.exp(-np.maximum(-d - ow, 0) / 0.6) * 0.35)[..., None]
        g = g * (1.0 - 0.25 * sat((X + Y - 9.0) / 6.0))[..., None]
        col = mix(PAL_ARMOR["outline"], g, inner)
        if kind == "half":
            alpha = alpha * self.cov(X - 4.5)
        return to_rgba(col, alpha)

    # ---------------- air bubbles ----------------
    def bubble(self, popping=False):
        X, Y = self.grid(9, 9)
        r = 3.3 if not popping else 3.6
        d = sd_circle(X, Y, 4.5, 4.5, r)
        ring = self.cov(np.abs(d) - 0.45)
        inside = self.cov(d)
        if popping:
            ang = np.arctan2(Y - 4.5, X - 4.5)
            ring = ring * smoothstep(-0.2, 0.25, np.cos(ang * 4.0 + 0.5))
            inside = inside * 0.0
        col = np.broadcast_to(rgb(120, 200, 255), X.shape + (3,)).copy()
        col = mix(col, rgb(214, 244, 255), ring)
        hl = sd_ellipse(X, Y, 3.2, 3.1, 0.8, 0.45, -0.7)
        h = sat(-hl / 0.3) * (0 if popping else 1)
        col = mix(col, WHITE, h)
        a = np.maximum(np.maximum(ring, inside * 0.35), h * 0.9)
        return to_rgba(col, a)

    # ---------------- bars (xp / boss / horse jump) ----------------
    def bar(self, t, P, kind="fill", stars_seed=5, flow=True):
        X, Y = self.grid(182, 5)
        d = sd_box(X, Y, 91.0, 2.5, 91.0, 2.5, 1.6)
        alpha = self.cov(d)
        ow = 0.7
        inner = self.cov(d + ow)
        if kind == "bg":
            col = np.broadcast_to(rgb(14, 14, 34), X.shape + (3,)).copy()
            col *= (1.0 - 0.35 * sat((2.6 - Y) / 2.0))[..., None]  # inset shadow
            self.add_stars(col, X, Y, self.make_stars(stars_seed + 50, 40, 182, 5,
                                                      twinkle=False), 0,
                           tint=rgb(90, 90, 140))
            col = mix(rgb(4, 4, 12), col, inner)
            return to_rgba(col, alpha)
        ang = TAU * t
        period = 45.5                     # base px; drifts exactly one period per loop
        sc = NOISE_N / period
        drift = period * t if flow else 0.0
        n1 = fbm(0, (X - drift) * sc, Y * sc * 1.6 + 40)
        n2 = fbm(2, (X - drift) * sc * 0.5 + 90, Y * sc * 0.8)
        evo = (math.cos(ang) * fbm(4, X * 5.0, Y * 5.0)
               + math.sin(ang) * fbm(5, X * 5.0 + 50, Y * 5.0 + 20))
        neb = sat(0.5 + 0.3 * n1 + 0.22 * evo)
        hue = sat(0.5 + 0.5 * n2)
        nebc = mix(P["neb1"], P["neb2"], hue)
        col = mix(P["deep"], nebc, neb ** 1.15)
        fil = np.exp(-((n1 + 0.25 * evo - 0.85) / 0.28) ** 2)
        col = col + P["arm"] * (fil * 0.75)[..., None]
        col = np.array(col, dtype=np.float32)
        self.add_stars(col, X, Y, self.make_stars(stars_seed, 70, 182, 5), t)
        col = col + (0.2 * np.exp(-((Y - 1.35) / 0.45) ** 2))[..., None]   # top shine
        col = col * (1.0 - 0.3 * sat((Y - 3.0) / 1.6))[..., None]
        col = mix(P["outline"], col, inner)
        return to_rgba(col, alpha)

    # ---------------- misc ----------------
    def crosshair(self):
        X, Y = self.grid(16, 16)
        d = np.minimum(sd_box(X, Y, 7.5, 7.5, 0.5, 4.5), sd_box(X, Y, 7.5, 7.5, 4.5, 0.5))
        col = np.broadcast_to(WHITE, X.shape + (3,))
        return to_rgba(col, self.cov(d))

    def ping(self, level):
        """level 0 = 5 bars ... 4 = 1 bar, 5 = no connection."""
        X, Y = self.grid(10, 8)
        col = np.zeros(X.shape + (3,), np.float32)
        a = np.zeros(X.shape, np.float32)
        active = 5 - level if level < 5 else 0
        for i in range(5):
            h = 2.0 + i * 1.5
            d = sd_box(X, Y, 0.9 + i * 2.0, 8.0 - h / 2.0, 0.75, h / 2.0, 0.25)
            m = self.cov(d)
            if level == 5:
                c = rgb(150, 30, 50)
            elif i < active:
                c = mix(rgb(70, 230, 220), rgb(170, 120, 255), i / 4.0)
            else:
                c = rgb(46, 40, 66)
            col = mix(col, c, m)
            a = np.maximum(a, m)
        if level == 5:
            d = np.minimum(np.abs((X - 5) - (Y - 4)), np.abs((X - 5) + (Y - 4))) - 0.5
            d = np.maximum(d, np.maximum(np.abs(X - 5), np.abs(Y - 4)) - 2.6)
            m = self.cov(d)
            col = mix(col, rgb(255, 80, 100), m)
            a = np.maximum(a, m)
        return to_rgba(col, a)


def to_rgba(col, alpha):
    col = np.clip(np.asarray(col, dtype=np.float32), 0.0, 1.0)
    out = np.empty(col.shape[:2] + (4,), np.uint8)
    out[..., :3] = np.round(col * 255.0)
    out[..., 3] = np.round(sat(alpha) * 255.0)
    out[out[..., 3] == 0] = 0
    return out


# --------------------------------------------------------------------------- #
# Pack assembly
# --------------------------------------------------------------------------- #
def build_icons(R):
    """Return (icons.png array, hearts strip, xp strip)."""
    S = R.S
    W = 256 * S
    icons = np.zeros((W, W, 4), np.uint8)

    def put(arr, bx, by):
        y, x = by * S, bx * S
        icons[y:y + arr.shape[0], x:x + arr.shape[1]] = arr

    put(R.crosshair(), 0, 0)

    # ---- hearts row (y=0) and hardcore row (y=45) ----
    for row in (0, 45):
        put(R.heart(0, PAL_HEART, "container"), 16, row)
        put(R.heart(0, PAL_HEART, "container", flash=True), 25, row)
        put(R.heart(0, PAL_HEART, "container"), 34, row)
        put(R.heart(0, PAL_HEART, "container", flash=True), 43, row)
        x = 52
        for P, sd in ((PAL_HEART, 0), (PAL_POISON, 2), (PAL_WITHER, 3)):
            put(R.heart(0, P, "full", seed=sd), x, row)
            put(R.heart(0, P, "half", seed=sd), x + 9, row)
            put(R.heart(0, P, "full", flash=True, seed=sd), x + 18, row)
            put(R.heart(0, P, "half", flash=True, seed=sd), x + 27, row)
            x += 36
        put(R.heart(0, PAL_GOLD, "full", seed=4), 160, row)
        put(R.heart(0, PAL_GOLD, "half", seed=4), 169, row)

    # ---- armor + mount hearts (y=9) ----
    put(R.armor("empty"), 16, 9)
    put(R.armor("half"), 25, 9)
    put(R.armor("full"), 34, 9)
    put(R.heart(0, PAL_HEART, "container"), 52, 9)
    put(R.heart(0, PAL_HEART, "full"), 88, 9)
    put(R.heart(0, PAL_HEART, "half"), 97, 9)

    # ---- air (y=18) ----
    put(R.bubble(), 16, 18)
    put(R.bubble(popping=True), 25, 18)

    # ---- food (y=27): steak ----
    put(R.steak("container"), 16, 27)
    put(R.steak("container", flash=True), 25, 27)
    put(R.steak("container"), 34, 27)
    put(R.steak("container", flash=True), 43, 27)
    put(R.steak("full"), 52, 27)
    put(R.steak("half"), 61, 27)
    put(R.steak("full", flash=True), 70, 27)
    put(R.steak("half", flash=True), 79, 27)
    put(R.steak("full", hunger=True), 88, 27)
    put(R.steak("half", hunger=True), 97, 27)
    put(R.steak("full", flash=True, hunger=True), 106, 27)
    put(R.steak("half", flash=True, hunger=True), 115, 27)
    put(R.steak("container", hunger=True), 133, 27)
    put(R.steak("container", flash=True, hunger=True), 142, 27)

    # ---- bars ----
    put(R.bar(0, PAL_XP, "bg"), 0, 64)
    put(R.bar(0, PAL_XP, "fill"), 0, 69)
    put(R.bar(0, PAL_BOSS, "bg", stars_seed=8), 0, 74)
    put(R.bar(0, PAL_BOSS, "fill", stars_seed=8, flow=False), 0, 79)
    put(R.bar(0, PAL_GOLD, "bg", stars_seed=9), 0, 84)
    put(R.bar(0, PAL_GOLD, "fill", stars_seed=9, flow=False), 0, 89)

    # ---- tab-list ping ----
    for lvl in range(6):
        put(R.ping(lvl), 0, 176 + lvl * 8)

    # ---- animation strips ----
    hearts = []
    for f in range(HEART_FRAMES):
        t = f / HEART_FRAMES
        hearts.append(np.concatenate([R.heart(t, PAL_HEART, "full"),
                                      R.heart(t, PAL_HEART, "half")], axis=1))
    xp = [R.bar(f / XP_FRAMES, PAL_XP, "fill") for f in range(XP_FRAMES)]
    return icons, np.concatenate(hearts, axis=0), np.concatenate(xp, axis=0)


def png_bytes(arr, palette=False):
    """PNG-encode an RGBA array. palette=True stores a dithered 256-colour PNG,
    which is ~5x smaller for the noisy galaxy strips with no visible difference."""
    img = Image.fromarray(arr, "RGBA")
    if palette:
        img = img.quantize(256, method=Image.Quantize.FASTOCTREE,
                           dither=Image.Dither.FLOYDSTEINBERG)
    buf = io.BytesIO()
    img.save(buf, "PNG", optimize=True, compress_level=9)
    return buf.getvalue()


def anim_props(src, x, y, w, h, duration):
    return (f"from=./{src}\nto=textures/gui/icons.png\n"
            f"x={x}\ny={y}\nw={w}\nh={h}\nduration={duration}\n")


def pack_icon():
    R = Renderer(28)
    heart = R.heart(0.15, PAL_HEART, "full")
    img = np.zeros((256, 256, 4), np.uint8)
    o = (256 - heart.shape[0]) // 2
    img[o:o + heart.shape[0], o:o + heart.shape[1]] = heart
    return img


def build_pack(res, outdir, preview_dir=None):
    S = res // 16
    R = Renderer(S)
    print(f"[{res}x] rendering (scale {S}, icons.png {256 * S}px)...", flush=True)
    icons, hearts, xp = build_icons(R)

    anim = "assets/minecraft/mcpatcher/anim/galaxygui/"
    files = {
        "pack.mcmeta": json.dumps({"pack": {
            "pack_format": 1,
            "description": f"§d{PACK_NAME} §7{res}x\n"
                           f"§8Galaxy hearts & XP, steak hunger"}}, indent=2).encode(),
        "pack.png": png_bytes(pack_icon()),
        "assets/minecraft/textures/gui/icons.png": png_bytes(icons),
        anim + "hearts.png": png_bytes(hearts),
        anim + "xp.png": png_bytes(xp, palette=True),
        anim + "hearts.properties": anim_props("hearts.png", 52 * S, 0, 18 * S, 9 * S,
                                               HEART_DURATION).encode(),
        anim + "hearts_hardcore.properties": anim_props("hearts.png", 52 * S, 45 * S,
                                                        18 * S, 9 * S,
                                                        HEART_DURATION).encode(),
        anim + "xp.properties": anim_props("xp.png", 0, 69 * S, 182 * S, 5 * S,
                                           XP_DURATION).encode(),
    }
    os.makedirs(outdir, exist_ok=True)
    out = os.path.join(outdir, f"Galaxy-GUI-{res}x-1.8.9.zip")
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for name, data in files.items():
            z.writestr(name, data)
    print(f"[{res}x] wrote {out} ({os.path.getsize(out) / 1e6:.1f} MB)")

    if preview_dir:
        write_previews(icons, hearts, xp, S, res, preview_dir)
    return out


# --------------------------------------------------------------------------- #
# Previews (a mock HUD so you can see the result without launching the game)
# --------------------------------------------------------------------------- #
def write_previews(icons, hearts, xp, S, res, outdir, gui=4):
    os.makedirs(outdir, exist_ok=True)
    icon_img = Image.fromarray(icons, "RGBA")

    def cell(img, bx, by, bw, bh):
        return img.crop((bx * S, by * S, (bx + bw) * S, (by + bh) * S)).resize(
            (bw * gui, bh * gui), Image.LANCZOS)

    hearts_img = Image.fromarray(hearts, "RGBA")
    xp_img = Image.fromarray(xp, "RGBA")
    frames = []
    n = max(HEART_FRAMES, XP_FRAMES)
    W, H = 182 * gui + 40, 40 * gui
    for f in range(n):
        frame = Image.new("RGBA", (W, H), (88, 66, 50, 255))
        hf = hearts_img.crop((0, (f % HEART_FRAMES) * 9 * S, 18 * S,
                              (f % HEART_FRAMES + 1) * 9 * S))
        full = hf.crop((0, 0, 9 * S, 9 * S)).resize((9 * gui, 9 * gui), Image.LANCZOS)
        half = hf.crop((9 * S, 0, 18 * S, 9 * S)).resize((9 * gui, 9 * gui), Image.LANCZOS)
        cont = cell(icon_img, 16, 0, 9, 9)
        steak = cell(icon_img, 52, 27, 9, 9)
        steak_half = cell(icon_img, 61, 27, 9, 9)
        steak_cont = cell(icon_img, 16, 27, 9, 9)
        x0, y0 = 20, 6 * gui
        for i in range(10):
            p = (x0 + i * 8 * gui, y0)
            frame.alpha_composite(cont, p)
            frame.alpha_composite(full if i < 8 else (half if i == 8 else cont), p)
        for i in range(10):
            p = (x0 + 182 * gui - 9 * gui - i * 8 * gui, y0)
            frame.alpha_composite(steak_cont, p)
            frame.alpha_composite(steak if i < 7 else (steak_half if i == 7 else steak_cont), p)
        by = y0 + 11 * gui
        frame.alpha_composite(cell(icon_img, 0, 64, 182, 5), (x0, by))
        xf = xp_img.crop((0, (f % XP_FRAMES) * 5 * S, int(182 * 0.72) * S,
                          (f % XP_FRAMES + 1) * 5 * S)).resize(
            (int(182 * 0.72) * gui, 5 * gui), Image.LANCZOS)
        frame.alpha_composite(xf, (x0, by))
        arm_y = by + 8 * gui
        for i in range(10):
            a = cell(icon_img, 34 if i < 6 else (25 if i == 6 else 16), 9, 9, 9)
            frame.alpha_composite(a, (x0 + i * 8 * gui, arm_y))
        frames.append(frame.convert("RGB"))
    frames[0].save(os.path.join(outdir, f"preview-{res}x.png"))
    frames[0].save(os.path.join(outdir, f"preview-{res}x.gif"), save_all=True,
                   append_images=frames[1:], duration=1000 * HEART_DURATION // 20, loop=0)
    # close-up sheet of the main icons at native resolution
    sheet = icon_img.crop((0, 0, 182 * S, 50 * S))
    bg = Image.new("RGBA", sheet.size, (40, 40, 48, 255))
    bg.alpha_composite(sheet)
    bg.convert("RGB").save(os.path.join(outdir, f"icons-sheet-{res}x.png"))


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--res", type=int, nargs="*", default=[256, 512],
                    help="pack resolutions to build (multiples of 16)")
    ap.add_argument("--out", default="dist")
    ap.add_argument("--preview", action="store_true")
    a = ap.parse_args()
    for res in a.res:
        build_pack(res, a.out, preview_dir="previews" if a.preview else None)


if __name__ == "__main__":
    main()
