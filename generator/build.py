#!/usr/bin/env python3
"""
Galaxy GUI - resource pack generator for Minecraft 1.8.9.

Everything in the pack is drawn procedurally by this script (original art):
  * animated galaxy hearts: pixel-art heart shapes filled with a drifting,
    twinkling purple starfield/nebula
  * pixel-art steak hunger bar (replaces the drumsticks)
  * animated galaxy XP bar: same starfield style, shifted to blue/cyan, flowing
    along the bar
  * matching galaxy armor, plus air bubbles, boss/jump bars, ping icons, crosshair

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
# Pixel-art shapes (9x9, like the vanilla HUD icons). o = outline, f = fill
# --------------------------------------------------------------------------- #
HEART_PIX = [
    ".ooo.ooo.",
    "offfofffo",
    "offfffffo",
    "offfffffo",
    ".offfffo.",
    "..offfo..",
    "...ofo...",
    "....o....",
    ".........",
]
HEART_SHINE = [(1, 1)]   # (x, y) pixels that get a soft highlight

ARMOR_PIX = [
    "ooo...ooo",
    "offoooffo",
    "offfffffo",
    "oofffffoo",
    ".offfffo.",
    ".offfffo.",
    ".offfffo.",
    ".ooooooo.",
    ".........",
]

BUBBLE_PIX = [
    ".........",
    "...ooo...",
    "..offfo..",
    ".offfffo.",
    ".offfffo.",
    ".offfffo.",
    "..offfo..",
    "...ooo...",
    ".........",
]
BUBBLE_POP_PIX = [
    ".........",
    ".o.....o.",
    "..o...o..",
    ".........",
    ".........",
    ".........",
    "..o...o..",
    ".o.....o.",
    ".........",
]


def pix_masks(rows):
    a = np.array([list(r) for r in rows])
    return (a == "o").astype(np.float32), (a == "f").astype(np.float32)


def upscale(grid, k):
    """Nearest-neighbour upscale of a small grid (keeps the crisp pixel look)."""
    return np.repeat(np.repeat(grid, k, axis=0), k, axis=1)


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

    def pixel_icon(self, rows, fill_col, outline_col, half=None, sub=1):
        """Compose a pixel-art silhouette: fill_col/outline_col are (h,w,3) or (3,)."""
        o, f = pix_masks(rows)
        k = self.S // sub
        o = upscale(o, k)
        f = upscale(f, k)
        if half == "left":
            o[:, o.shape[1] // 2 + k // 2:] = 0
            f[:, f.shape[1] // 2 + k // 2:] = 0
        col = mix(np.broadcast_to(outline_col, o.shape + (3,)), fill_col, f)
        return to_rgba(col, np.maximum(o, f))

    # ---------------- hearts ----------------
    def heart(self, t, P, kind="full", flash=False, seed=0):
        X, Y = self.grid(9, 9)
        if kind == "container":
            # an empty heart: very dim, static galaxy behind a dark outline
            g = self.starfield(X, Y, 0.0, P, seed=seed) * 0.22 + rgb(10, 6, 18)
            outline = rgb(250, 244, 255) if flash else rgb(4, 2, 8)
            return self.pixel_icon(HEART_PIX, g, outline)
        g = self.starfield(X, Y, t, P, seed=seed)
        # soft shine on the upper-left lobe (like vanilla's highlight pixel)
        shine = np.zeros((9, 9), np.float32)
        for (x, y) in HEART_SHINE:
            shine[y, x] = 1.0
        g = mix(g, WHITE, upscale(shine, self.S) * 0.16)
        outline = P["outline"]
        if flash:
            g = mix(g, WHITE, 0.42)
            outline = rgb(250, 244, 255)
        return self.pixel_icon(HEART_PIX, g, outline,
                               half="left" if kind == "half" else None)

    # ---------------- steak (hunger) ----------------
    @staticmethod
    def steak_grid():
        """Original 18x18 pixel-art cooked steak (drawn at 2x the HUD pixel grid).
        Returns an (18, 18, 4) float array in 0..1."""
        n = 18
        yy, xx = np.mgrid[0:n, 0:n] + 0.5
        a = -0.5                                  # long axis rises to the right
        dx, dy = xx - 9.0, yy - 9.4
        ex = dx * math.cos(a) + dy * math.sin(a)
        ey = -dx * math.sin(a) + dy * math.cos(a)
        lump = 0.35 * np.sin(ex * 0.9 + 1.0)      # slightly irregular top edge
        inside = (ex / 8.5) ** 2 + ((ey + np.where(ey < 0, lump, 0)) / 5.1) ** 2 <= 1.0

        def nb(mask, dx_, dy_):
            out = np.zeros_like(mask)
            src = mask[max(0, dy_):n + min(0, dy_), max(0, dx_):n + min(0, dx_)]
            out[max(0, -dy_):n + min(0, -dy_), max(0, -dx_):n + min(0, -dx_)] = src
            return out

        down, right = nb(inside, 0, 1), nb(inside, 1, 0)
        up, left = nb(inside, 0, -1), nb(inside, -1, 0)
        edge = inside & ~(down & right & up & left)
        edge_br = edge & (~down | ~right)
        ring = inside & ~edge
        ring2 = ring & ~(nb(ring, 0, 1) & nb(ring, 1, 0))    # inner bottom-right band
        ring_tl = ring & ~(nb(ring, 0, -1) & nb(ring, -1, 0))  # inner top-left band

        col = np.zeros((n, n, 3), np.float32)
        col[inside] = rgb(150, 86, 60)
        # chunky speckle pattern, deterministic
        rng = np.random.default_rng(7)
        speck = (rng.random((n, n)) < 0.32) & ring
        speck |= (((xx.astype(int) * 3 + yy.astype(int) * 5) % 7) == 0) & ring
        col[speck] = rgb(122, 66, 46)
        lite = (rng.random((n, n)) < 0.12) & ring & ~speck
        col[lite] = rgb(172, 104, 74)
        col[ring_tl & ~speck] = rgb(176, 110, 80)
        col[ring2] = rgb(110, 58, 40)
        col[edge] = rgb(104, 56, 38)
        col[edge_br] = rgb(74, 36, 24)
        alpha = inside.astype(np.float32)
        return np.concatenate([col, alpha[..., None]], axis=-1), inside, edge

    def steak(self, kind="full", flash=False, hunger=False):
        g, inside, edge = self.steak_grid()
        col = g[..., :3].copy()
        alpha = g[..., 3].copy()
        if kind == "container":
            col[inside] = rgb(40, 26, 20)
            col[edge] = rgb(250, 240, 232) if flash else rgb(14, 7, 4)
            if hunger:
                col[inside & ~edge] = rgb(26, 34, 14)
        else:
            if hunger:
                col = mix(col, rgb(100, 150, 46), 0.5)
            if flash:
                col = mix(col, WHITE, 0.4)
                col[edge] = rgb(250, 240, 232)
        if kind == "half":
            # the food bar fills right-to-left, so the half icon keeps the right side
            alpha[:, :9] = 0
        k = self.S // 2
        return to_rgba(upscale(col, k), upscale(alpha, k))

    # ---------------- armor ----------------
    def armor(self, kind="full"):
        X, Y = self.grid(9, 9)
        if kind == "empty":
            g = np.broadcast_to(rgb(24, 20, 40), X.shape + (3,))
            return self.pixel_icon(ARMOR_PIX, g, rgb(4, 2, 10))
        g = self.starfield(X, Y, 0.0, PAL_ARMOR, seed=1)
        return self.pixel_icon(ARMOR_PIX, g, PAL_ARMOR["outline"],
                               half="left" if kind == "half" else None)

    # ---------------- air bubbles ----------------
    def bubble(self, popping=False):
        X, Y = self.grid(9, 9)
        if popping:
            return self.pixel_icon(BUBBLE_POP_PIX, rgb(0, 0, 0), rgb(200, 236, 255))
        g = mix(rgb(70, 150, 230), rgb(150, 210, 255), sat((9 - X - Y) / 9.0))
        icon = self.pixel_icon(BUBBLE_PIX, g, rgb(220, 244, 255))
        k = self.S
        icon[3 * k:4 * k, 3 * k:4 * k, :3] = 255      # highlight pixel
        return icon

    # ---------------- bars (xp / boss / horse jump) ----------------
    def bar_shape(self, w=182, h=5):
        o = np.zeros((h, w), np.float32)
        o[0, :] = o[-1, :] = 1
        o[:, 0] = o[:, -1] = 1
        f = np.zeros((h, w), np.float32)
        f[1:-1, 1:-1] = 1
        for (y, x) in ((0, 0), (0, w - 1), (h - 1, 0), (h - 1, w - 1)):
            o[y, x] = 0               # cut corners for a rounded pixel look
        return upscale(o, self.S), upscale(f, self.S)

    def bar(self, t, P, kind="fill", seed=5, flow=True):
        X, Y = self.grid(182, 5)
        o, f = self.bar_shape()
        if kind == "bg":
            g = self.starfield(X, Y, 0.0, P, seed=seed + 3, scale=(4.0, 12.0)) * 0.2
            g = g + rgb(8, 8, 20)
            col = mix(np.broadcast_to(rgb(2, 2, 8), X.shape + (3,)), g, f)
            return to_rgba(col, np.maximum(o, f))
        # wide, horizontally stretched clouds that flow along the bar;
        # period 256/2.8 = 91 base px drifts once per loop
        g = self.starfield(X, Y, t, P, seed=seed, scale=(2.8125, 12.0),
                           drift=(1 if flow else 0, 0), star_density=0.05,
                           big_density=0.004)
        # pixel-style shine on the top row of the fill
        shine = np.zeros((5, 182), np.float32)
        shine[1, 1:-1] = 1
        g = mix(g, WHITE, upscale(shine, self.S) * 0.07)
        col = mix(np.broadcast_to(P["outline"], X.shape + (3,)), g, f)
        return to_rgba(col, np.maximum(o, f))

    # ---------------- misc ----------------
    def crosshair(self):
        c = np.zeros((16, 16), np.float32)
        c[7, 3:12] = 1
        c[3:12, 7] = 1
        return to_rgba(np.broadcast_to(WHITE, (16 * self.S, 16 * self.S, 3)),
                       upscale(c, self.S))

    def ping(self, level):
        """level 0 = 5 bars ... 4 = 1 bar, 5 = no connection."""
        g = np.zeros((8, 10, 3), np.float32)
        a = np.zeros((8, 10), np.float32)
        active = 5 - level if level < 5 else 0
        for i in range(5):
            h = 2 + i
            x = i * 2
            if level == 5:
                c = rgb(120, 30, 50)
            elif i < active:
                c = mix(rgb(70, 230, 220), rgb(170, 120, 255), i / 4.0)
            else:
                c = rgb(46, 40, 66)
            g[8 - h:8, x] = c
            a[8 - h:8, x] = 1
        if level == 5:
            for i in range(5):
                for (x, y) in ((3 + i, 1 + i), (7 - i, 1 + i)):
                    g[y, x] = rgb(255, 80, 100)
                    a[y, x] = 1
        return to_rgba(upscale(g, self.S), upscale(a, self.S))


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
    heart = heart[:8 * 28]                     # the bottom pixel row is empty
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
                    help="pack resolutions to build (multiples of 32)")
    ap.add_argument("--out", default="dist")
    ap.add_argument("--preview", action="store_true")
    a = ap.parse_args()
    for res in a.res:
        build_pack(res, a.out, preview_dir="previews" if a.preview else None)


if __name__ == "__main__":
    main()
