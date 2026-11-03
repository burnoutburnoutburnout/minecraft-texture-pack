#!/usr/bin/env python3
"""
Galaxy GUI - resource pack generator for Minecraft 1.8.9.

Everything in the pack is drawn procedurally by this script (original art):
  * animated galaxy hearts: smooth hearts filled with a drifting, twinkling
    purple starfield/nebula
  * cartoon steak hunger bar (replaces the drumsticks)
  * animated galaxy XP bar: same starfield style, shifted to blue/cyan, flowing
    along the bar
  * matching galaxy armor, plus smooth air bubbles, boss/jump bars, ping icons, crosshair

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

# Animation settings (OptiFine: duration is in game ticks, 20 ticks = 1 second).
# Heart strip height = frames * 9 * scale; keep it <= 16384 px at 512x (56 frames).
HEART_FRAMES = 56
HEART_DURATION = 2     # 56 frames * 2 ticks = 5.6 s loop
XP_FRAMES = 48
XP_DURATION = 2        # 4.8 s loop


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
NOISE = [tile_noise(NOISE_N, 2.6, s) for s in range(6)]


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
    """Three octaves; octave factors are integers so tiling (and looping) is kept."""
    return (samp(NOISE[k % 6], u, v)
            + 0.5 * samp(NOISE[(k + 3) % 6], u * 2.0 + 17.0, v * 2.0 + 31.0)
            + 0.25 * samp(NOISE[(k + 1) % 6], u * 4.0 + 5.0, v * 4.0 + 77.0)) / 1.146


# --------------------------------------------------------------------------- #
# Signed distance functions (units = vanilla 16x pixels, "base px").
# Shapes are smooth vectors rendered at full resolution with anti-aliasing.
# --------------------------------------------------------------------------- #
def smin(a, b, k):
    h = sat(0.5 + 0.5 * (b - a) / k)
    return b * (1.0 - h) + a * h - k * h * (1.0 - h)


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
    j = len(pts) - 1
    for i in range(len(pts)):
        ex, ey = pts[j] - pts[i]
        wx, wy = X - pts[i, 0], Y - pts[i, 1]
        t = np.clip((wx * ex + wy * ey) / (ex * ex + ey * ey), 0, 1)
        bx, by = wx - ex * t, wy - ey * t
        d = np.minimum(d, bx * bx + by * by)
        c1 = Y >= pts[i, 1]
        c2 = Y < pts[j, 1]
        c3 = ex * wy > ey * wx
        s = np.where((c1 & c2 & c3) | (~c1 & ~c2 & ~c3), -s, s)
        j = i
    return s * np.sqrt(d)


ARMOR_PTS = [(1.1, 1.3), (3.2, 0.8), (4.5, 2.1), (5.8, 0.8), (7.9, 1.3), (8.5, 4.1),
             (6.9, 4.4), (6.9, 8.3), (2.1, 8.3), (2.1, 4.4), (0.5, 4.1)]


# --------------------------------------------------------------------------- #
# Palettes for the starfield
# --------------------------------------------------------------------------- #
def pal(dark, deep, cloud, cloud2, bright, tint, outline, star=(255, 255, 255)):
    return dict(dark=rgb(*dark), deep=rgb(*deep), cloud=rgb(*cloud), cloud2=rgb(*cloud2),
                bright=rgb(*bright), tint=rgb(*tint), outline=rgb(*outline), star=rgb(*star))


PAL_HEART = pal((6, 4, 26), (28, 14, 84), (92, 40, 196), (58, 46, 200), (176, 92, 255),
                (138, 40, 120), (14, 4, 30))
PAL_XP = pal((2, 8, 26), (10, 30, 88), (36, 110, 214), (84, 58, 220), (110, 232, 255),
             (150, 70, 236), (6, 12, 34), (230, 250, 255))
PAL_POISON = pal((4, 18, 8), (14, 60, 24), (50, 150, 56), (30, 110, 90), (150, 240, 110),
                 (90, 130, 30), (6, 24, 8))
PAL_WITHER = pal((4, 4, 6), (18, 18, 24), (64, 62, 76), (44, 44, 58), (130, 128, 146),
                 (70, 50, 70), (2, 2, 4), (200, 200, 210))
PAL_GOLD = pal((30, 14, 2), (90, 46, 6), (210, 136, 24), (236, 176, 50), (255, 226, 110),
                (220, 90, 30), (44, 20, 2), (255, 250, 220))
PAL_ARMOR = pal((8, 10, 30), (24, 34, 90), (80, 96, 190), (60, 120, 210), (190, 200, 255),
                (120, 80, 200), (10, 8, 30))
PAL_BOSS = pal((18, 2, 22), (60, 10, 70), (180, 40, 160), (110, 40, 210), (255, 110, 220),
               (200, 40, 90), (24, 4, 28))

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
    @staticmethod
    def make_stars(seed, n, w, h, n_big=0, twinkle=True):
        rng = np.random.default_rng(seed)
        stars = []
        for i in range(n + n_big):
            big = i >= n
            b = rng.uniform(0.75, 1.0) if big else rng.uniform(0.3, 0.95)
            size = rng.uniform(0.13, 0.17) if big else rng.uniform(0.07, 0.11)
            k = int(rng.integers(1, 4)) if twinkle else 0
            stars.append((rng.uniform(0, w), rng.uniform(0, h), b, size, k, rng.random(), big))
        return stars

    def add_stars(self, col, X, Y, stars, t, tint, period=None, shift=(0.0, 0.0)):
        """Draw stars; with `period` (px, py) the star field tiles and is shifted."""
        xs = X[0, :]
        ys = Y[:, 0]
        W, H = xs[-1] + 1, ys[-1] + 1
        for (sx, sy, b, size, k, ph, glint) in stars:
            tw = 0.5 + 0.5 * math.sin(TAU * (k * t + ph)) if k else 1.0
            amp = b * (0.35 + 0.65 * tw)
            reach = 1.1 if glint else size * 4.0
            if period:
                px_, py_ = period
                bx = (sx + shift[0]) % px_
                by = (sy + shift[1]) % py_
                cx_list = [bx + i * px_ for i in range(-1, int(W / px_) + 2)]
                cy_list = [by + j * py_ for j in range(-1, int(H / py_) + 2)]
            else:
                cx_list, cy_list = [sx], [sy]
            for cy in cy_list:
                if cy + reach < 0 or cy - reach > H:
                    continue
                for cx in cx_list:
                    if cx + reach < 0 or cx - reach > W:
                        continue
                    x0 = np.searchsorted(xs, cx - reach)
                    x1 = np.searchsorted(xs, cx + reach)
                    y0 = np.searchsorted(ys, cy - reach)
                    y1 = np.searchsorted(ys, cy + reach)
                    if x1 <= x0 or y1 <= y0:
                        continue
                    dx = X[y0:y1, x0:x1] - cx
                    dy = Y[y0:y1, x0:x1] - cy
                    g = np.exp(-(dx * dx + dy * dy) / (2.0 * size * size)) * 1.6
                    if glint:
                        g = g + 0.8 * tw * (
                            np.exp(-np.abs(dx) / 0.05) * np.exp(-(dy / 0.75) ** 2)
                            + np.exp(-np.abs(dy) / 0.05) * np.exp(-(dx / 0.75) ** 2))
                    col[y0:y1, x0:x1] += (amp * g)[..., None] * tint

    # ---------------- starfield / nebula ----------------
    def starfield(self, X, Y, t, P, seed=0, scale=(12.0, 12.0), drift=(1, 1),
                  star_density=0.09, big_density=0.012):
        """Deep-space nebula with stars. It tiles with period 256/scale base px and
        drifts `drift` whole periods per animation loop, so it loops seamlessly."""
        sx, sy = scale
        perx, pery = NOISE_N / sx, NOISE_N / sy
        ox, oy = perx * drift[0] * t, pery * drift[1] * t
        u = (X - ox) * sx
        v = (Y - oy) * sy
        n1 = fbm(seed, u, v)                                 # cloud density
        n2 = samp(NOISE[(seed + 2) % 6], u + 90.0, v + 40.0)  # cloud colour variation
        n3 = samp(NOISE[(seed + 4) % 6], u + 30.0, v + 150.0)  # warm tint patches
        dens = smoothstep(-1.5, 1.6, n1)
        # mostly dark space; nebula clouds only in the denser patches
        col = mix(P["dark"], P["deep"], smoothstep(0.2, 0.6, dens))
        cloud = mix(P["cloud"], P["cloud2"], sat(0.5 + 0.5 * n2))
        col = mix(col, cloud, smoothstep(0.55, 0.9, dens) * 0.9)
        col = mix(col, P["bright"], smoothstep(0.86, 1.05, dens) * 0.6)
        col = mix(col, P["tint"], sat(n3 - 0.4) * 0.45 * smoothstep(0.35, 0.7, dens))
        col = np.array(col, dtype=np.float32)
        n_small = int(perx * pery * star_density)
        n_big = max(1, int(perx * pery * big_density))
        stars = self.make_stars(seed + 101, n_small, perx, pery, n_big=n_big)
        self.add_stars(col, X, Y, stars, t, P["star"], period=(perx, pery), shift=(ox, oy))
        return col

    # ---------------- shared smooth "galaxy" look ----------------
    def galaxy_fill(self, X, Y, d, t, P, seed=0, flash=False, ow=0.5, gloss=None, **sf):
        """Starfield inside a smooth shape with a thin outline, a soft inner shadow
        for depth and a faint nebula-coloured rim light."""
        g = self.starfield(X, Y, t, P, seed=seed, **sf)
        inner = np.maximum(-d - ow, 0.0)
        g = g * (0.7 + 0.3 * smoothstep(0.0, 1.5, inner))[..., None]
        g = g + P["cloud"] * (np.exp(-inner / 0.3) * 0.32)[..., None]
        if gloss is not None:
            g = mix(g, WHITE, gloss)
        outline = P["outline"]
        if flash:
            g = mix(g, WHITE, 0.4)
            outline = rgb(250, 244, 255)
        return mix(outline, g, self.cov(d + ow))

    # ---------------- hearts ----------------
    def heart(self, t, P, kind="full", flash=False, seed=0):
        X, Y = self.grid(9, 9)
        d = sd_heart(X, Y)
        alpha = self.cov(d)
        if kind == "container":
            # an empty heart: very dim, static galaxy behind a dark outline
            g = self.starfield(X, Y, 0.0, P, seed=seed) * 0.22 + rgb(10, 6, 18)
            outline = rgb(250, 244, 255) if flash else rgb(4, 2, 8)
            return to_rgba(mix(outline, g, self.cov(d + 0.5)), alpha)
        gl = sd_ellipse(X, Y, 2.6, 2.75, 0.9, 0.42, -0.7)
        col = self.galaxy_fill(X, Y, d, t, P, seed, flash, ow=0.5,
                               gloss=sat(-gl / 0.5) * 0.28)
        if kind == "half":
            alpha = alpha * self.cov(X - 4.5)
        return to_rgba(col, alpha)

    # ---------------- steak (hunger) ----------------
    STEAK_ANGLE = -0.5

    def steak_slab(self, X, Y, drop=0.0):
        """Long rounded slab tilted up to the right (the Minecraft steak silhouette),
        with a gently lumpy top edge. Returns (signed distance, along, across)."""
        cx, cy, rx, ry, p = 4.5, 4.15 + drop, 3.95, 2.2, 2.4
        a = self.STEAK_ANGLE
        dx, dy = X - cx, Y - cy
        ex = dx * math.cos(a) + dy * math.sin(a)
        ey = -dx * math.sin(a) + dy * math.cos(a)
        ry_ = ry + np.where(ey < 0, 0.16 * np.sin(ex * 1.6 + 0.4), 0.0)
        f = (np.abs(ex / rx) ** p + np.abs(ey / ry_) ** p) ** (1.0 / p) - 1.0
        gy, gx = np.gradient(f, 1.0 / self.S)
        return f / np.maximum(np.hypot(gx, gy), 1e-4), ex, ey

    def steak(self, kind="full", flash=False, hunger=False):
        """Cartoon HD version of the Minecraft steak: same long diagonal shape and
        browns (lighter top-left, darker bottom-right rim), bold outline, cel
        shading and black grill burn lines."""
        X, Y = self.grid(9, 9)
        top, ex, ey = self.steak_slab(X, Y)
        side, _, _ = self.steak_slab(X, Y, drop=0.65)
        body = np.minimum(top, side)
        alpha = self.cov(body)
        ow = 0.42
        inner = self.cov(body + ow)
        if kind == "container":
            fill = rgb(26, 34, 14) if hunger else rgb(40, 26, 20)
            outline = rgb(250, 240, 232) if flash else rgb(14, 7, 4)
            col = mix(outline, np.broadcast_to(fill, X.shape + (3,)), inner)
            col = mix(col, rgb(28, 18, 13), self.cov(np.abs(top) - 0.1) * (side < 0) * inner)
        else:
            # top face: Minecraft-steak browns with soft, chunky lighter/darker patches
            n = fbm(2, X * 6.0 + 20.0, Y * 6.0 + 60.0)
            face = mix(rgb(156, 90, 64), rgb(142, 78, 54), sat(0.5 + 0.4 * n))
            face = mix(face, rgb(120, 62, 42), smoothstep(0.35, 0.6, n) * 0.8)
            face = mix(face, rgb(178, 110, 80), smoothstep(-0.5, -0.8, n) * 0.85)
            # broad light from the top-left, darker toward the bottom-right
            face = face * (1.08 - 0.22 * sat((ey + 1.6) / 3.2))[..., None]
            # cel shading on the rim of the top face
            gy, gx = np.gradient(top, 1.0 / self.S)
            facing = -(gx + gy) / math.sqrt(2.0)
            edge = smoothstep(-1.0, -0.3, top)
            face = mix(face, rgb(196, 128, 96), edge * smoothstep(0.2, 0.7, facing) * 0.85)
            face = mix(face, rgb(102, 50, 32), edge * smoothstep(0.2, 0.7, -facing) * 0.6)
            # black grill burn lines across the steak (slightly slanted, tapered ends)
            u = ex + 0.55 * ey
            burn = np.zeros_like(X)
            for c in (-2.1, 0.0, 2.1):
                w = 0.2 * (1.0 - 0.45 * sat(np.abs(ey) / 2.0))
                burn = np.maximum(burn, self.cov(np.abs(u - c) - w))
            burn = burn * smoothstep(-0.2, -0.55, top)
            # charred halo around each burn, then the black line itself
            halo = np.zeros_like(X)
            for c in (-2.1, 0.0, 2.1):
                halo = np.maximum(halo, np.exp(-((u - c) / 0.42) ** 2))
            face = mix(face, rgb(92, 44, 28), halo * smoothstep(-0.2, -0.55, top) * 0.5)
            face = mix(face, rgb(18, 10, 7), burn)
            # small glossy highlight
            gl = sd_ellipse(X, Y, 2.55, 4.0, 0.9, 0.26, self.STEAK_ANGLE)
            face = mix(face, rgb(255, 236, 222), sat(-gl / 0.3) * 0.5)
            # dark bottom-right rim (the thickness of the steak)
            sidec = mix(rgb(96, 46, 30), rgb(66, 30, 18), sat((X - 1.0) / 7.0))
            col = np.where((top < 0)[..., None], face, sidec)
            col = mix(col, rgb(54, 24, 14), self.cov(np.abs(top) - 0.08) * (side < 0))
            outline = rgb(40, 16, 8)
            if hunger:
                col = mix(col, rgb(100, 150, 46), 0.5)
                outline = rgb(20, 34, 8)
            if flash:
                col = mix(col, WHITE, 0.4)
                outline = rgb(250, 240, 232)
            col = mix(outline, col, inner)
        if kind == "half":
            # the food bar fills right-to-left, so the half icon keeps the right side
            alpha = alpha * self.cov(4.5 - X)
        return to_rgba(col, alpha)

    # ---------------- armor ----------------
    def armor(self, kind="full"):
        X, Y = self.grid(9, 9)
        d = sd_polygon(X, Y, ARMOR_PTS) - 0.15
        alpha = self.cov(d)
        if kind == "empty":
            col = mix(rgb(6, 4, 14), rgb(26, 20, 42), self.cov(d + 0.5))
            return to_rgba(col, alpha)
        col = self.galaxy_fill(X, Y, d, 0.0, PAL_ARMOR, seed=1, ow=0.5)
        if kind == "half":
            alpha = alpha * self.cov(X - 4.5)
        return to_rgba(col, alpha)

    # ---------------- air bubbles ----------------
    def bubble(self, popping=False):
        X, Y = self.grid(9, 9)
        r = 3.6 if popping else 3.3
        d = sd_circle(X, Y, 4.5, 4.5, r)
        ring = self.cov(np.abs(d) - 0.4)
        inside = self.cov(d)
        if popping:
            ang = np.arctan2(Y - 4.5, X - 4.5)
            ring = ring * smoothstep(-0.2, 0.25, np.cos(ang * 4.0 + 0.5))
            inside = inside * 0.0
        col = np.broadcast_to(rgb(120, 200, 255), X.shape + (3,)).copy()
        col = mix(col, rgb(214, 244, 255), ring)
        h = sat(-sd_ellipse(X, Y, 3.2, 3.1, 0.8, 0.45, -0.7) / 0.3) * (0 if popping else 1)
        col = mix(col, WHITE, h)
        return to_rgba(col, np.maximum(np.maximum(ring, inside * 0.35), h * 0.9))

    # ---------------- bars (xp / boss / horse jump) ----------------
    def bar(self, t, P, kind="fill", seed=5, flow=True):
        X, Y = self.grid(182, 5)
        d = sd_box(X, Y, 91.0, 2.5, 91.0, 2.5, 1.6)
        alpha = self.cov(d)
        if kind == "bg":
            g = self.starfield(X, Y, 0.0, P, seed=seed + 3, scale=(4.0, 12.0)) * 0.2
            g = g + rgb(8, 8, 20)
            g = g * (1.0 - 0.35 * sat((2.6 - Y) / 2.0))[..., None]   # inset shadow
            return to_rgba(mix(rgb(2, 2, 8), g, self.cov(d + 0.45)), alpha)
        # wide, horizontally stretched clouds that flow along the bar;
        # period 256/2.8125 = 91 base px drifts once per loop
        gloss = 0.06 * np.exp(-((Y - 1.25) / 0.4) ** 2)
        col = self.galaxy_fill(X, Y, d, t, P, seed=seed, ow=0.45, gloss=gloss,
                               scale=(2.8125, 12.0), drift=(1 if flow else 0, 0),
                               star_density=0.05, big_density=0.004)
        return to_rgba(col, alpha)

    # ---------------- misc ----------------
    def crosshair(self):
        X, Y = self.grid(16, 16)
        d = np.minimum(sd_box(X, Y, 7.5, 7.5, 0.5, 4.5), sd_box(X, Y, 7.5, 7.5, 4.5, 0.5))
        return to_rgba(np.broadcast_to(WHITE, X.shape + (3,)), self.cov(d))

    def ping(self, level):
        """level 0 = 5 bars ... 4 = 1 bar, 5 = no connection."""
        X, Y = self.grid(10, 8)
        col = np.zeros(X.shape + (3,), np.float32)
        a = np.zeros(X.shape, np.float32)
        active = 5 - level if level < 5 else 0
        for i in range(5):
            h = 2.0 + i * 1.5
            m = self.cov(sd_box(X, Y, 0.9 + i * 2.0, 8.0 - h / 2.0, 0.75, h / 2.0, 0.25))
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
    put(R.bar(0, PAL_BOSS, "bg", seed=8), 0, 74)
    put(R.bar(0, PAL_BOSS, "fill", seed=8, flow=False), 0, 79)
    put(R.bar(0, PAL_GOLD, "bg", seed=9), 0, 84)
    put(R.bar(0, PAL_GOLD, "fill", seed=9, flow=False), 0, 89)

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
    heart = R.heart(0.0, PAL_HEART, "full")
    img = np.zeros((256, 256, 4), np.uint8)
    oy = (256 - heart.shape[0]) // 2
    ox = (256 - heart.shape[1]) // 2
    img[oy:oy + heart.shape[0], ox:ox + heart.shape[1]] = heart
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
        anim + "hearts.png": png_bytes(hearts, palette=True),
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
    W, H = 182 * gui + 40, 40 * gui
    cont = cell(icon_img, 16, 0, 9, 9)
    steak = cell(icon_img, 52, 27, 9, 9)
    steak_half = cell(icon_img, 61, 27, 9, 9)
    steak_cont = cell(icon_img, 16, 27, 9, 9)
    xp_bg = cell(icon_img, 0, 64, 182, 5)
    armor = [cell(icon_img, x, 9, 9, 9) for x in (16, 25, 34)]
    n = HEART_FRAMES * XP_FRAMES // math.gcd(HEART_FRAMES, XP_FRAMES)
    n = min(n, 2 * max(HEART_FRAMES, XP_FRAMES))
    for f in range(n):
        frame = Image.new("RGBA", (W, H), (88, 120, 60, 255))
        hf = hearts_img.crop((0, (f % HEART_FRAMES) * 9 * S, 18 * S,
                              (f % HEART_FRAMES + 1) * 9 * S))
        full = hf.crop((0, 0, 9 * S, 9 * S)).resize((9 * gui, 9 * gui), Image.LANCZOS)
        half = hf.crop((9 * S, 0, 18 * S, 9 * S)).resize((9 * gui, 9 * gui), Image.LANCZOS)
        x0, y0 = 20, 6 * gui
        for i in range(10):
            p = (x0 + i * 8 * gui, y0)
            frame.alpha_composite(cont, p)
            if i < 9:
                frame.alpha_composite(full if i < 8 else half, p)
        for i in range(10):
            p = (x0 + 182 * gui - 9 * gui - i * 8 * gui, y0)
            frame.alpha_composite(steak_cont, p)
            if i < 8:
                frame.alpha_composite(steak if i < 7 else steak_half, p)
        by = y0 + 11 * gui
        frame.alpha_composite(xp_bg, (x0, by))
        fw = int(182 * 0.72)
        xf = xp_img.crop((0, (f % XP_FRAMES) * 5 * S, fw * S,
                          (f % XP_FRAMES + 1) * 5 * S)).resize((fw * gui, 5 * gui),
                                                               Image.LANCZOS)
        frame.alpha_composite(xf, (x0, by))
        arm_y = by + 8 * gui
        for i in range(10):
            frame.alpha_composite(armor[2] if i < 6 else (armor[1] if i == 6 else armor[0]),
                                  (x0 + i * 8 * gui, arm_y))
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
