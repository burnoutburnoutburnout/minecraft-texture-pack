/* =====================================================================
   Hotbar: animated styles for the hotbar and its selection frame (textures/gui/widgets.png).
   widgets.png also holds the menu buttons, so the pack draws matching buttons too.
   Base px: the hotbar is 182 x 22 with nine 20 px slots (items sit 16 x 16 at x = 3 + 20i, y = 3);
   the selection frame is 24 x 24 and is drawn one pixel up and left of its slot.
   ===================================================================== */
const HOTBAR_STYLES = { galaxy: "Galaxy rails", nebula: "Nebula glass", rainbow: "Rainbow", glass: "Dark glass", constellation: "Constellation",
  rift: "Rift", neon: "Neon", celestial: "Celestial gold", crystal: "Crystal", lava: "Molten", minimal: "Minimal", pixel: "Retro pixel", stone: "Plain stone (still)" };
const HB_SEL_STYLES = { auto: "Match the hotbar", frame: "Galaxy frame", glow: "Glow", rainbow: "Rainbow ring", corners: "Corners", orbit: "Orbiting star", stone: "Plain" };
const HB_BUTTONS = { galaxy: "Galaxy", dark: "Dark", stone: "Grey stone" };
const HB_AUTO_SEL = { galaxy: "frame", nebula: "glow", rainbow: "rainbow", glass: "glow", constellation: "orbit", rift: "glow", neon: "glow", celestial: "frame",
  crystal: "glow", lava: "glow", minimal: "corners", pixel: "stone", stone: "stone" };
/* slot shapes: sd(x, y, h, round) in slot-local coords, h ~ half size; pts = outline used to fit the shape in its cell */
const polyUnit = (n, r, rot) => Array.from({ length: n }, (_, i) => [r * Math.cos(rot + TAU * i / n), r * Math.sin(rot + TAU * i / n)]);
const polySD = pts => (x, y, h, rd) => { const rr = rd * h * 0.45, k = Math.max(0.2, h - rr); return sdPolygon(x / k, y / k, pts) * k - rr; };
const HB_SHAPES = {
  square: { label: "Square", sym: 4, pts: [[1, 1], [-1, 1], [-1, -1], [1, -1]], sd: (x, y, h, rd) => sdBox(x, y, 0, 0, h, h, rd * h) },
  circle: { label: "Circle", sym: 1, pts: polyUnit(16, 1.08, 0), sd: (x, y, h) => Math.hypot(x, y) - h * 1.08 },
  hex: { label: "Hexagon", sym: 6, pts: polyUnit(6, 1.13, 0) },
  octagon: { label: "Octagon", sym: 8, pts: polyUnit(8, 1.08, Math.PI / 8) },
  diamond: { label: "Diamond", sym: 4, pts: polyUnit(4, 1.32, 0) },
  star: { label: "Star", sym: 5, pts: starPts(5, 1.42, 0.68, -Math.PI / 2, 0, 0) },
  plus: { label: "Plus", sym: 4, pts: [[1, 0.55], [-1, 0.55], [-1, -0.55], [1, -0.55], [0.55, 1], [-0.55, 1], [-0.55, -1], [0.55, -1]],
    sd: (x, y, h, rd) => Math.min(sdBox(x, y, 0, 0, h, h * 0.55, rd * h * 0.5), sdBox(x, y, 0, 0, h * 0.55, h, rd * h * 0.5)) },
  shield: { label: "Shield", sym: 0, pts: [[-1, -1], [1, -1], [1, 0.25], [0, 1.15], [-1, 0.25]] },
};
for (const sh of Object.values(HB_SHAPES)) if (!sh.sd) sh.sd = polySD(sh.pts);
const HB_BAR_SHAPES = { box: "Straight", rounded: "Rounded", pill: "Pill", chamfer: "Cut corners", slant: "Slanted", notch: "Notched", scallop: "Scalloped", tiles: "Separate tiles" };
/* how far the shape reaches (x, y) at angle a, for size h */
function shapeExt(shape, h, a, k = 0) {
  const c = Math.cos(a), sn = Math.sin(a); let ex = 0, ey = 0;
  for (const [x, y] of HB_SHAPES[shape].pts) { const rx = x * c - y * sn, ry = x * sn + y * c; ex = Math.max(ex, Math.abs(rx + k * ry)); ey = Math.max(ey, Math.abs(ry)); }
  return [ex * h, ey * h];
}
const shapeR = (shape, k = 0) => Math.max(...HB_SHAPES[shape].pts.map(([x, y]) => Math.hypot(x, y))) * (1 + Math.abs(k));
const HB_ROT_MODES = { same: "All the same", alternate: "Alternate left / right", fan: "Fan out (like cards)", random: "Random tilt", rock: "Rock together (animated)",
  wave: "Wave along the bar (animated)" };
const HB_SIZE_MODES = { even: "All the same", alternate: "Big and small", center: "Bigger in the middle", ends: "Bigger at the ends", breathe: "Breathing (animated)" };
/* each slot's turn and size at time t */
function hbSlotGeo(hb, t) {
  const shape = HB_SHAPES[hb.slotShape] ? hb.slotShape : "square", SH = HB_SHAPES[shape], spin = Math.round(+hb.spin || 0), k = +hb.skew || 0;
  const mode = hb.rotMode && HB_ROT_MODES[hb.rotMode] ? hb.rotMode : hb.alt ? "alternate" : "same";
  const rot0 = (+hb.rot || 0) * Math.PI / 180, spinA = SH.sym ? spin * TAU * t / SH.sym : spin * TAU * t, animated = spin || mode === "rock" || mode === "wave";
  const hsRaw = 8 + hb.window, angs = [], hsA = [];
  for (let n = 0; n < 9; n++) {
    const sg = mode === "alternate" && n % 2 ? -1 : 1;
    const base = mode === "fan" ? rot0 * (n - 4) / 4 : mode === "random" ? rot0 * (uhash(n, 3, 9) * 2 - 1) : mode === "rock" ? rot0 * Math.sin(TAU * t)
      : mode === "wave" ? rot0 * Math.sin(TAU * (t - n / 9)) : rot0;
    angs.push(sg * (base + spinA));
    const ext = animated ? [shapeR(shape, k) * hsRaw, shapeR(shape, k) * hsRaw] : shapeExt(shape, hsRaw, angs[n], k);
    const sz = hb.sizeMode === "alternate" ? (n % 2 ? 0.8 : 1) : hb.sizeMode === "center" ? 0.74 + 0.26 * (1 - Math.abs(n - 4) / 4)
      : hb.sizeMode === "ends" ? 0.74 + 0.26 * Math.abs(n - 4) / 4 : hb.sizeMode === "breathe" ? 0.86 + 0.14 * Math.sin(TAU * (t - n / 9)) : 1;
    hsA.push(hsRaw * Math.min(1, 9.5 / ext[0], 10.2 / ext[1]) * sz);
  }
  return { shape, SH, angs, hsA, k, mode, spinA, rot0 };
}
/* galaxy variants: colours plus extra galaxy effects */
const HB_GAL_VARIANTS = {
  deep: { label: "Deep space", c: ["#160c46", "#4a2ab8", "#9c6cff", "#b48cff"], gal: {}, o: { stars: 1, shoot: 1 } },
  milky: { label: "Milky Way", c: ["#0b1430", "#3b5fa8", "#dfe8ff", "#cfe0ff"], gal: { band: 0.9, dust: 0.6 }, o: { stars: 1.6, shoot: 1 } },
  andromeda: { label: "Andromeda swirl", c: ["#1a0830", "#a0349a", "#ffb0e8", "#ff9ad8"], gal: { swirl: 1, band: 0.3 }, o: { stars: 1, shoot: 1 } },
  supernova: { label: "Supernova", c: ["#200806", "#c8461a", "#ffd27a", "#ffb060"], gal: { flare: 1, swirl: 0.3 }, o: { stars: 1, shoot: 0 } },
  emerald: { label: "Emerald nebula", c: ["#04201a", "#12a07a", "#9dffd2", "#6cf0c0"], gal: { swirl: 0.5 }, o: { stars: 1, shoot: 1 } },
  crimson: { label: "Red giant", c: ["#2a0408", "#b0182c", "#ff8a7a", "#ff5a6a"], gal: { band: 0.4, flare: 0.4 }, o: { stars: 0.8, shoot: 1 } },
  ice: { label: "Frozen cosmos", c: ["#0a2030", "#5ab4dc", "#eafaff", "#bff0ff"], gal: { dust: 0.8 }, o: { stars: 1.5, shoot: 1 } },
  void: { label: "The void", c: ["#050308", "#2a1840", "#8a70c0", "#6a50a0"], gal: { dust: 0.4 }, o: { stars: 2.2, shoot: 3 } },
  starstorm: { label: "Star storm", c: ["#0a0a28", "#3040a0", "#a0b8ff", "#9ab0ff"], gal: { dust: 1 }, o: { stars: 1.8, shoot: 5 } },
  pastel: { label: "Pastel dream", c: ["#3a2a5a", "#c08ae0", "#ffd6f0", "#ffc6e6"], gal: { band: 0.5 }, o: { stars: 1.2, shoot: 1 } },
  twilight: { label: "Twilight", c: ["#10082a", "#6a2a8a", "#ff9a5a", "#ffb07a"], gal: { band: 0.6, swirl: 0.4 }, o: { stars: 1, shoot: 2 } },
  quasar: { label: "Quasar", c: ["#08061a", "#3a1a8a", "#7ef0ff", "#9af6ff"], gal: { flare: 0.8, band: 0.5, swirl: 0.6 }, o: { stars: 1.3, shoot: 1 } },
};
const HB_GAL_BASE = { variant: "deep", band: 0, swirl: 0, dust: 0, flare: 0 };
const galParams = n => Object.assign(clone(HB_GAL_BASE), HB_GAL_VARIANTS[n].gal, { variant: n });
/* rainbow variants */
const HB_RB_BASE = { variant: "flow", mode: "flow", sat: 0.85, light: 0.95, bands: 1, cycles: 1, angle: 35, slotTint: 0.25, shimmer: 0.4 };
const HB_RB_VARIANTS = {
  flow: { label: "Classic flow", p: {} },
  pastel: { label: "Pastel", p: { sat: 0.38, light: 1 } },
  dark: { label: "Deep rainbow", p: { sat: 1, light: 0.55, slotTint: 0.15 } },
  neon: { label: "Neon tubes", p: { mode: "neon", sat: 1, light: 1 } },
  wave: { label: "Wave", p: { mode: "wave", bands: 1.5 } },
  pulse: { label: "Colour pulse", p: { mode: "pulse", cycles: 2 } },
  stripes: { label: "Candy stripes", p: { mode: "stripes", bands: 1, angle: 35, shimmer: 0.2 } },
  prism: { label: "Prism", p: { mode: "prism", bands: 1.5, shimmer: 1 } },
  holo: { label: "Holographic", p: { mode: "holo", sat: 0.45, light: 1, shimmer: 1 } },
  chroma: { label: "Chroma slots", p: { mode: "chroma", slotTint: 0.6 } },
  galaxy: { label: "Rainbow galaxy", p: { mode: "galaxy", sat: 0.9, light: 1 } },
  aurora: { label: "Aurora", p: { mode: "aurora", bands: 1.2, sat: 0.8 } },
};
const rbParams = n => Object.assign(clone(HB_RB_BASE), HB_RB_VARIANTS[n].p, { variant: n });
const HB_DEFAULTS = { enabled: true, style: "galaxy", selStyle: "auto", buttons: "galaxy",
  c1: "#160c46", c2: "#4a2ab8", c3: "#9c6cff", accent: "#b48cff", selCol: "#efe4ff", slotCol: "#0a0814", outlineCol: "#05030c", goldCol: "#e0b04a",
  slotA: 0.7, railA: 1, window: 0.6, round: 0.15, frameW: 0.5, glow: 0.8, shine: 0.6, stars: 1, texScale: 1,
  pulse: 0.5, selW: 2.4, selGlow: 0.9, orbit: 1, speed: 2, loopSec: 6, animFps: "ticks", motion: "random", shoot: 1,
  slotShape: "square", barShape: "box", rot: 0, alt: false, spin: 0, rotMode: "same", sizeMode: "even", skew: 0, gal: clone(HB_GAL_BASE), rb: clone(HB_RB_BASE) };
const hbStill = hb => ["stone"].includes(hb.style) && hbSelStyle(hb) === "stone" && !(+hb.spin);
const hbSelStyle = hb => hb.selStyle === "auto" ? HB_AUTO_SEL[hb.style] || "glow" : hb.selStyle;
function hsv(h, sv, v) {
  h = fract(h) * 6; const i = Math.floor(h), f = h - i, p = v * (1 - sv), q = v * (1 - sv * f), u = v * (1 - sv * (1 - f));
  return [[v, u, p], [q, v, p], [p, v, u], [p, q, v], [u, p, v], [v, p, q]][i % 6];
}
function hbPalette(hb) {
  const deep = unhex(hb.c1), cloud = unhex(hb.c2), bright = unhex(hb.c3);
  return { dark: scale3(deep, 0.23), deep, cloud, bright, cloud2: [cloud[0] * 0.63, Math.min(1, cloud[1] * 1.15), Math.min(1, cloud[2] * 1.02)],
    tint: [Math.min(1, cloud[0] * 1.5), cloud[1] * 0.5, cloud[2] * 0.6], star: WHITE, starMul: hb.stars };
}
const hbGalOpts = (hb, w, seed) => { const k = 1 / (hb.texScale || 1);
  return { scale: w > 40 ? [2.8125 * k, 5 * k] : [10.6667 * k, 10.6667 * k], drift: [1, 0], dens: 0.06, big: 0.006, wander: hb.motion === "random", shoot: w > 40 ? hb.shoot : 0, seed }; };
/* starfield plus the variant effects: Milky Way band, swirl, star dust and flares (all loop seamlessly) */
function hbGalaxy(S, w, h, t, hb, P, seed) {
  const G = Object.assign(clone(HB_GAL_BASE), hb.gal || {}), buf = starfield(S, w, h, t, P, hbGalOpts(hb, w, seed));
  if (!(G.swirl > 0 || G.band > 0 || G.dust > 0 || G.flare > 0)) return buf;
  const W = Math.round(w * S), H = Math.round(h * S), out = new Float32Array(buf.length), ct = Math.cos(TAU * t), stt = Math.sin(TAU * t);
  const flares = []; if (G.flare > 0) for (let n = 0; n < Math.max(2, Math.round(w / 45)); n++) {
    const ph = uhash(n, seed, 12), e = Math.max(0, Math.sin(TAU * (t + ph))) ** 3; flares.push([uhash(n, seed, 11) * w, 3 + uhash(n, seed, 13) * (h - 6), e * G.flare]); }
  const bandC = mixc(P.bright, WHITE, 0.45);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const X = (i + 0.5) / S, Y = (j + 0.5) / S, k = j * W + i;
    let sx = i, sy = j;
    if (G.swirl > 0) {
      const dx = G.swirl * 2.6 * vfbm(X * 0.09 + 1.7 * ct, Y * 0.25 + 1.7 * stt, 2), dy = G.swirl * 1.3 * vfbm(X * 0.09 + 5 + 1.7 * stt, Y * 0.25 + 3 - 1.7 * ct, 2);
      sx = Math.max(0, Math.min(W - 1, Math.round(i + dx * S))); sy = Math.max(0, Math.min(H - 1, Math.round(j + dy * S)));
    }
    const q = (sy * W + sx) * 3; let c = [buf[q], buf[q + 1], buf[q + 2]];
    if (G.band > 0) { const yb = h / 2 + h * 0.18 * Math.sin(X * 0.04 + TAU * t), m = G.band * Math.exp(-(((Y - yb) / (h * 0.17)) ** 2));
      c = mixc(c, bandC, m * 0.4); c = scale3(c, 1 + m * 0.25); }
    if (G.dust > 0) { const cx = Math.floor(X * 3), cy = Math.floor(Y * 3), hv = uhash(cx, cy, 77);
      if (hv > 1 - 0.06 * G.dust) { const dd = Math.hypot(X * 3 - cx - 0.5, Y * 3 - cy - 0.5), tw = 0.5 + 0.5 * Math.sin(TAU * (t * (1 + (Math.floor(hv * 997) % 3)) + hv * 7));
        c = mixc(c, WHITE, sat(1 - dd * 2.2) * tw * 0.7); } }
    for (const [fx, fy, e] of flares) if (e > 0.01) { const dx = Math.abs(X - fx), dy = Math.abs(Y - fy), r = Math.hypot(dx, dy);
      const v = e * (Math.exp(-r / 1.1) + 0.8 * Math.exp(-dx / 0.12) * Math.exp(-dy / 2.6) + 0.8 * Math.exp(-dy / 0.12) * Math.exp(-dx / 2.6));
      c = mixc(c, mixc(P.bright, WHITE, 0.6), sat(v)); }
    out[k * 3] = c[0]; out[k * 3 + 1] = c[1]; out[k * 3 + 2] = c[2];
  }
  return out;
}
/* rainbow colour for a point; si = slot index */
function rbColor(R, X, Y, si, t, g) {
  const cyc = Math.round(R.cycles), b = R.bands || 1, sv = R.sat, v = R.light;
  switch (R.mode) {
    case "wave": return hsv(X / 182 * b + 0.12 * Math.sin(Y * 0.45 + X * 0.07 + TAU * t) - t * cyc, sv, v);
    case "pulse": return hsv(X / 182 * b * 0.15 - t * cyc, sv, v);
    case "stripes": { const a = R.angle * Math.PI / 180, sw = 182 / (b * 9), u = (X * Math.cos(a) + Y * Math.sin(a)) / sw - t * cyc * 9, f = u - Math.floor(u);
      const c0 = hsv(Math.floor(u) / 9, sv, v), c1 = hsv((Math.floor(u) + 1) / 9, sv, v); return mixc(c0, c1, sstep(0.88, 1, f)); }
    case "prism": return hsv((X - 1.6 * Y) / (182 / b) - t * cyc, sv, v);
    case "holo": return hsv(0.6 * vfbm(X * 0.06, Y * 0.2, 2) + X / 182 * b * 0.5 - t * cyc, sv, v * (0.85 + 0.15 * vfbm(X * 0.3, Y * 0.8, 2)));
    case "chroma": return hsv(si / 9 - t * cyc, sv, v);
    case "galaxy": { const l = g ? Math.max(g[0], g[1], g[2]) : 0.5; return mixc(hsv(X / 182 * b - t * cyc, sv, v * Math.min(1, l * 1.7)), WHITE, sat(l - 0.8) * 2); }
    case "aurora": { const cur = 0.55 + 0.45 * vfbm(X * 0.2 + 2 * Math.cos(TAU * t), Y * 0.06 + 2 * Math.sin(TAU * t), 2);
      return hsv(X / 182 * b + 0.08 * Math.sin(X * 0.1 + TAU * t) - t * cyc, sv, v * cur); }
    default: return hsv(X / 182 * b - t * cyc, sv, v);
  }
}
/* bar outline (negative inside) */
function hbBarSD(shape, X, Y, dWn, fw) {
  const box = sdBox(X, Y, 91, 11, 91, 11, 0);
  switch (shape) {
    case "rounded": return sdBox(X, Y, 91, 11, 91, 11, 4);
    case "pill": return sdBox(X, Y, 91, 11, 91, 11, 10.9);
    case "chamfer": return Math.max(box, (Math.abs(X - 91) - 91 + Math.abs(Y - 11) - 11 + 6) * Math.SQRT1_2);
    case "notch": { const n = Math.max(1, Math.min(8, Math.round((X - 1) / 20))); return Math.max(box, -(Math.hypot(X - (1 + 20 * n), Y - (Y < 11 ? 0 : 22)) - 2.3)); }
    case "scallop": return Math.max(Math.abs(X - 91) - 91, Math.abs(Y - 11) - (9.7 + 1.3 * Math.cos(TAU * (X - 11) / 20)));
    case "tiles": return Math.max(box, dWn - 1.4 - fw);
    case "slant": return Math.max(Math.abs(Y - 11) - 11, (Math.abs(X - 91 + (Y - 11) * 0.5) - 85.5) * 0.894);
    default: return box;
  }
}
/* layer compositor: premultiplied "over" onto a running pixel */
function px0() { return { a: 0, r: 0, g: 0, b: 0 }; }
function over(p, a, c) { if (a <= 0) return; a = Math.min(1, a); p.r = c[0] * a + p.r * (1 - a); p.g = c[1] * a + p.g * (1 - a); p.b = c[2] * a + p.b * (1 - a); p.a = a + p.a * (1 - a); }
function putPx(img, k, p) { if (p.a > 0.003) setPx(img, k, p.a, [p.r / p.a, p.g / p.a, p.b / p.a]); }
const hueCycle = (cols, x) => { const n = cols.length, f = fract(x) * n, i = Math.floor(f); return mixc(cols[i % n], cols[(i + 1) % n], sstep(0, 1, f - i)); };

function hotbarIcon(S, hb, t) {
  const img = newImg(S, 182, 22), W = img.W, H = img.H, cov = covf(S), P = hbPalette(hb), style = hb.style;
  const R = Object.assign(clone(HB_RB_BASE), hb.rb || {});
  const buf = ["galaxy", "nebula", "celestial"].includes(style) || (style === "rainbow" && R.mode === "galaxy") ? hbGalaxy(S, 182, 22, t, hb, P, 21) : null;
  const acc = unhex(hb.accent), slotC = unhex(hb.slotCol), outC = unhex(hb.outlineCol), gold = unhex(hb.goldCol);
  // slot shape, size fitted to its cell, rotation (alternating and spinning)
  const GEO = hbSlotGeo(hb, t), SH = GEO.SH, angs = GEO.angs, hsA = GEO.hsA, kS = GEO.k;
  const fw = hb.frameW, glow = hb.glow, pulse = 1 + hb.pulse * 0.3 * Math.sin(TAU * 2 * t);
  const twinkle = (n, seed) => 0.5 + 0.5 * Math.sin(TAU * ((1 + (n % 3)) * t + uhash(n, seed, 3)));
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const k = j * W + i, X = (i + 0.5) / S, Y = (j + 0.5) / S, p = px0();
    const si = Math.max(0, Math.min(8, Math.floor((X - 1) / 20))), cx = 11 + 20 * si;
    const a = angs[si], ca = Math.cos(a), sa = Math.sin(a), hs = hsA[si], dx = X - cx - kS * (Y - 11), lx = ca * dx + sa * (Y - 11), ly = -sa * dx + ca * (Y - 11);
    const dW = SH.sd(lx, ly, hs, hb.round), dB = hbBarSD(hb.barShape, X, Y, dW, fw), inBar = cov(dB);
    if (inBar <= 0) continue;
    const inWin = cov(dW), rail = 1 - inWin, edgeBand = 1 - cov(dB + fw);           // outer outline band
    const g = buf ? gal(buf, k) : null;
    if (style === "galaxy") {
      over(p, hb.slotA * inWin, mixc(slotC, g, 0.18));
      over(p, inWin * 0.5 * Math.exp(dW / 0.9), scale3(slotC, 0.4));                 // inner shadow at the window edge
      over(p, hb.railA * rail, scale3(g, 1.1));
      over(p, glow * Math.exp(-Math.abs(dW) / 0.22) * 0.8 * pulse, mixc(acc, WHITE, 0.35));
      over(p, glow * Math.exp((dB + fw) / 0.45) * rail * 0.6, mixc(P.bright, WHITE, 0.4));
      over(p, edgeBand, outC);
    } else if (style === "nebula") {
      over(p, hb.railA * rail, scale3(g, 1.05));
      over(p, hb.slotA * inWin, mixc(scale3(g, 0.55), slotC, 0.45));
      over(p, glow * Math.exp(-Math.abs(dW) / 0.35) * 0.55 * pulse, mixc(P.bright, WHITE, 0.3));
      over(p, glow * Math.exp((dB + fw) / 0.35) * 0.7, mixc(P.bright, WHITE, 0.5));
      over(p, edgeBand, outC);
    } else if (style === "glass") {
      over(p, hb.railA * 0.85 * rail, mixc(slotC, acc, 0.16));
      over(p, hb.slotA * inWin, slotC);
      over(p, glow * Math.exp(-Math.abs(dW) / 0.16) * 0.55, mixc(acc, WHITE, 0.5));
      const band = (X - 0.45 * Y) - (-30 + 242 * t);                                // light sweep, off the bar at both loop ends
      over(p, hb.shine * 0.3 * Math.exp(-((band / 5) ** 2)) * (rail * 0.8 + 0.4), WHITE);
      for (let n = 0; n < 18; n++) { const sx = uhash(n, 4, 1) * 182, sy = uhash(n, 4, 2) < 0.5 ? 1.6 + uhash(n, 4, 5) * 0.8 : 20.4 - uhash(n, 4, 5) * 0.8;
        const dd = Math.hypot(X - sx, Y - sy); if (dd < 0.8) over(p, hb.stars * twinkle(n, 4) * Math.exp(-((dd / 0.3) ** 2)), WHITE); }
      over(p, glow * Math.exp((dB + fw) / 0.3) * 0.5, mixc(acc, WHITE, 0.6));
      over(p, edgeBand, outC);
    } else if (style === "constellation") {
      over(p, hb.railA * 0.9 * rail, scale3(slotC, 1.2));
      over(p, hb.slotA * inWin, slotC);
      const line = Math.min(Math.abs(dB + 1.3), hb.barShape === "tiles" ? 9 : Math.abs(X - (1 + 20 * Math.max(1, Math.min(8, Math.round((X - 1) / 20))))) + Math.max(0, Math.abs(Y - 11) - 9.7));
      over(p, glow * 0.55 * Math.exp(-((line / 0.16) ** 2)), mixc(acc, WHITE, 0.25));
      for (let n = 0; n <= 9; n++) for (const yy of [1.3, 20.7]) {                     // star at every slot corner
        const sx = n === 0 ? 1.3 : n === 9 ? 180.7 : 1 + 20 * n, dd = Math.hypot(X - sx, Y - yy), tw = twinkle(n * 2 + (yy > 10), 9);
        if (dd < 1.2) { over(p, Math.exp(-((dd / (0.35 + 0.2 * tw)) ** 2)), mixc(acc, WHITE, 0.6 + 0.4 * tw)); }
      }
      for (const [ph, yy] of [[0, 1.3], [0.5, 1.3], [0.25, 20.7], [0.75, 20.7]]) {      // lights travelling along the lines
        const sx = yy < 10 ? fract(t + ph) * 182 : (1 - fract(t + ph)) * 182, dd = Math.hypot((X - sx) * 0.5, Y - yy);
        over(p, hb.shine * Math.exp(-((dd / 0.45) ** 2)) * sstep(0, 8, Math.min(sx, 182 - sx)), mixc(acc, WHITE, 0.7));
      }
      for (let n = 0; n < 26; n++) { const sx = uhash(n, 6, 1) * 182, sy = 3 + uhash(n, 6, 2) * 16, dd = Math.hypot(X - sx, Y - sy);
        if (dd < 0.6 && (Math.abs(X - (11 + 20 * Math.round((sx - 11) / 20))) > 7.5 || Math.abs(sy - 11) > 7.5)) over(p, hb.stars * 0.8 * twinkle(n, 6) * Math.exp(-((dd / 0.22) ** 2)), WHITE); }
      over(p, edgeBand * 0.85, outC);
    } else if (style === "rift") {
      over(p, hb.railA * rail, scale3(slotC, 0.8));
      over(p, hb.slotA * inWin, slotC);
      const hm = 0.5 + 0.5 * Math.sin(X * 0.05 + TAU * t), col = mixc(acc, P.bright, hm);
      const fl = 1 + hb.pulse * 0.35 * (Math.sin(TAU * 3 * t + X * 0.08) * 0.6 + Math.sin(TAU * 5 * t - X * 0.13) * 0.4);
      const jag = 0.55 + 0.45 * vfbm(X * 1.3 + 3, Y < 11 ? 1.7 : 9.1, 3), dEdge = -dB - fw - jag;          // jagged glowing edge, top and bottom
      over(p, glow * fl * sat(Math.exp(-Math.max(0, dEdge) / 0.35)) * 0.9, col);
      over(p, glow * fl * Math.exp(-Math.abs(dEdge) / 0.1) * 0.7, mixc(col, WHITE, 0.7));
      const crack = Math.abs(X - (1 + 20 * Math.round((X - 1) / 20))) + 0.35 * vfbm(Y * 1.4, X * 0.3, 2) - 0.15;
      if (X > 5 && X < 177) over(p, glow * fl * 0.8 * Math.exp(-Math.max(0, crack) / 0.18), mixc(col, WHITE, 0.3));
      over(p, edgeBand, outC);
    } else if (style === "neon") {
      over(p, hb.railA * 0.6 * rail, slotC);
      over(p, hb.slotA * inWin, slotC);
      const col = hueCycle([acc, P.bright, P.cloud], X / 182 * 1.5 - t), dd = Math.abs(dW + 0.2);
      over(p, glow * pulse * 0.6 * Math.exp(-dd / 0.6), col);
      over(p, Math.exp(-((dd / 0.24) ** 2)), mixc(col, WHITE, 0.55));
      over(p, glow * 0.6 * Math.exp((dB + fw) / 0.3), col);
      over(p, edgeBand * 0.8, outC);
    } else if (style === "celestial") {
      over(p, hb.slotA * inWin, mixc(scale3(g, 0.6), slotC, 0.3));
      const lit = sat(0.62 - (Y - 11) / 16), bev = sat(0.5 + (Math.exp(-Math.abs(dW) / 0.4) - Math.exp((dB + fw) / 0.4)) * 0.6);
      let gc = mixc(scale3(gold, 0.45), mixc(gold, WHITE, 0.35), lit * 0.7 + bev * 0.3);
      gc = scale3(gc, 0.9 + 0.12 * vfbm(X * 0.9, Y * 2.3, 2));
      over(p, hb.railA * rail, gc);
      over(p, Math.exp(-((Math.abs(dW) / 0.18) ** 2)) * 0.8, scale3(gold, 0.3));
      for (let n = 0; n < 12; n++) { const sx = 11 + 20 * (n % 9) + (n >= 9 ? 10 : 0), sy = n >= 9 ? 11 : uhash(n, 8, 1) < 0.5 ? 1.5 : 20.5;
        const tw = twinkle(n, 8), d4 = star4(X, Y, n >= 9 ? 1 + 20 * (2 + n % 3 * 3) : sx, sy, 0.8 + 0.6 * tw, 0.14);
        over(p, hb.stars * sat(0.5 - d4 * S) * (0.5 + 0.5 * tw), mixc(gold, WHITE, 0.8)); }
      over(p, glow * 0.35 * Math.exp(-Math.abs(dW) / 0.5) * pulse, mixc(gold, WHITE, 0.5));
      over(p, edgeBand, scale3(gold, 0.18));
    } else if (style === "rainbow") {
      const rc = rbColor(R, X, Y, si, t, g);
      if (R.mode === "neon") {
        over(p, hb.railA * 0.6 * rail, slotC); over(p, hb.slotA * inWin, slotC);
        const dd = Math.abs(dW + 0.2);
        over(p, glow * pulse * 0.65 * Math.exp(-dd / 0.6), rc); over(p, Math.exp(-((dd / 0.24) ** 2)), mixc(rc, WHITE, 0.5));
        over(p, glow * 0.6 * Math.exp((dB + fw) / 0.3), rbColor(R, X + 40, Y, si, t, g));
        over(p, edgeBand * 0.8, outC);
      } else {
        over(p, hb.slotA * inWin, mixc(slotC, scale3(rc, 0.45), R.slotTint));
        over(p, inWin * 0.45 * Math.exp(dW / 0.9), scale3(slotC, 0.4));
        over(p, hb.railA * rail, scale3(rc, 0.92 + 0.08 * Math.exp(-Math.abs(dW) / 0.6)));
        if (R.shimmer > 0) {                                                         // moving glints
          const u = R.mode === "prism" ? fract((X - 1.6 * Y) / 23 - t * 2) : fract((X - 0.5 * Y) / 60 - t);
          over(p, R.shimmer * 0.45 * Math.exp(-(((u - 0.5) / (R.mode === "prism" ? 0.05 : 0.08)) ** 2)) * (rail * 0.85 + 0.15), WHITE);
        }
        over(p, glow * Math.exp(-Math.abs(dW) / 0.2) * 0.7 * pulse, mixc(rc, WHITE, 0.6));
        over(p, glow * Math.exp((dB + fw) / 0.4) * rail * 0.5, WHITE);
        over(p, edgeBand, mixc(outC, scale3(rc, 0.3), 0.3));
      }
    } else if (style === "crystal") {
      const ice = mixc(acc, WHITE, 0.55), f = Math.floor((vfbm(X * 0.32 + 4, Y * 0.85, 1) * 0.5 + 0.5) * 5) / 5;
      over(p, hb.slotA * inWin, mixc(slotC, acc, 0.18));
      over(p, hb.railA * 0.9 * rail, scale3(mixc(scale3(acc, 0.5), ice, f), 0.75 + 0.35 * f));
      const band = (X - 0.6 * Y) - (-30 + 242 * t);
      over(p, hb.shine * 0.55 * Math.exp(-((band / 3) ** 2)) * rail, WHITE);
      for (let n = 0; n < 14; n++) { const sx = uhash(n, 14, 1) * 182, sy = uhash(n, 14, 2) < 0.5 ? 1.5 : 20.5, tw = twinkle(n, 14);
        over(p, hb.stars * sat(0.5 - star4(X, Y, sx, sy, 0.6 + 0.9 * tw, 0.12) * S) * tw, WHITE); }
      over(p, glow * Math.exp(-Math.abs(dW) / 0.18) * 0.75, WHITE);
      over(p, edgeBand, scale3(acc, 0.35));
    } else if (style === "lava") {
      const n = vfbm(X * 0.22 + 2.2 * Math.cos(TAU * t), Y * 0.7 + 2.2 * Math.sin(TAU * t), 3), ridge = 1 - Math.abs(n);
      const hot = sstep(0.72, 0.95, ridge) * pulse, rock = scale3(rgb(38, 22, 18), 0.8 + 0.3 * vfbm(X * 1.2, Y * 1.2, 2));
      over(p, hb.railA * rail, mixc(rock, mixc(rgb(255, 90, 20), rgb(255, 220, 90), hot), sat(hot * 1.1)));
      over(p, hb.slotA * inWin, slotC);
      over(p, inWin * glow * 0.45 * Math.exp(dW / 1.1), rgb(255, 80, 20));
      over(p, edgeBand, rgb(14, 6, 4));
    } else if (style === "minimal") {
      over(p, hb.railA * 0.25 * rail, slotC);
      over(p, hb.slotA * 0.75 * inWin, slotC);
      const ang = Math.atan2(Y - 11, X - cx) / TAU, dA = Math.abs(fract(ang - t - si / 9 + 0.5) - 0.5), lineV = Math.exp(-(((dW + 0.15) / 0.13) ** 2));
      over(p, lineV * (0.55 + hb.shine * 0.45 * Math.exp(-((dA / 0.09) ** 2))), mixc(acc, WHITE, 0.65));
    } else if (style === "pixel") {
      const PX = Math.floor(X) + 0.5, PY = Math.floor(Y) + 0.5, pa = angs[si], pc = Math.cos(pa), ps = Math.sin(pa);
      const pdx = PX - cx - kS * (PY - 11), pd = SH.sd(pc * pdx + ps * (PY - 11), -ps * pdx + pc * (PY - 11), hs, hb.round), pb = hbBarSD(hb.barShape, PX, PY, pd, fw);
      const shine = Math.floor(fract(t) * 46) * 4 - 2;                               // a stepped light column
      if (pd < 0) over(p, hb.slotA, pd > -1 ? scale3(slotC, 2.2) : slotC);
      else if (pb <= 0) { let c = pb > -1 ? scale3(unhex(hb.c1), 0.5) : pd < 1 ? mixc(unhex(hb.c3), WHITE, 0.3) : PY < 3 ? unhex(hb.c3) : PY > 19 ? unhex(hb.c1) : unhex(hb.c2);
        if (Math.abs(PX - shine + (PY - 11) * 0.5) < 1) c = mixc(c, WHITE, 0.6 * hb.shine); over(p, hb.railA, c); }
    } else {                                                                         // plain stone, still
      const n = 0.9 + 0.1 * vfbm(X * 1.7, Y * 1.7, 2);
      const bev = Math.exp((dB + fw) / 0.35) * (Y < 11 ? 0.25 : -0.2);
      over(p, hb.railA * rail, scale3(rgb(122, 122, 122), n + bev));
      over(p, hb.slotA * inWin, scale3(rgb(60, 60, 60), n));
      over(p, Math.exp(-((Math.abs(dW) / 0.25) ** 2)) * 0.6, dW < 0 ? rgb(30, 30, 30) : rgb(170, 170, 170));
      over(p, edgeBand, rgb(16, 16, 16));
    }
    if (style !== "pixel") p.a *= inBar;
    putPx(img, k, p);
  }
  return toRGBA(img);
}

/* the 24 x 24 selection frame; the middle (where the item is) stays clear */
function hotbarSelIcon(S, hb, t) {
  const img = newImg(S, 24, 24), W = img.W, H = img.H, cov = covf(S), P = hbPalette(hb), style = hbSelStyle(hb);
  const buf = style === "frame" ? hbGalaxy(S, 24, 24, t, hb, P, 23) : null, R = Object.assign(clone(HB_RB_BASE), hb.rb || {});
  const col = hb.style === "celestial" && hb.selStyle === "auto" ? unhex(hb.goldCol) : unhex(hb.selCol), acc = unhex(hb.accent);
  // the frame follows the slots' turn where every slot shares it (same, alternate, rock, spin); otherwise it only takes the spin
  const G = hbSlotGeo(hb, t), shape = G.shape, SH = G.SH, spin = Math.round(+hb.spin || 0), kS = G.k;
  const a = ["same", "alternate", "rock"].includes(G.mode) ? G.angs[0] : G.spinA, ca = Math.cos(a), sa = Math.sin(a);
  const e1 = spin || G.mode === "rock" ? [shapeR(shape, kS), shapeR(shape, kS)] : shapeExt(shape, 1, a, kS), ef = Math.max(e1[0], e1[1]);
  const ho = 11.8 / ef, hh = Math.max(ho * 0.55, ho - hb.selW / ef), hm = (ho + hh) / 2, roundK = hb.round;
  const pulse = 1 + hb.pulse * 0.4 * Math.sin(TAU * 2 * t), squareish = shape === "square";
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const k = j * W + i, X = (i + 0.5) / S, Y = (j + 0.5) / S, p = px0();
    const dx = X - 12 - kS * (Y - 12), lx = ca * dx + sa * (Y - 12), ly = -sa * dx + ca * (Y - 12);
    const dO = SH.sd(lx, ly, ho, roundK), dH = SH.sd(lx, ly, hh, roundK);
    const ring = cov(dO) * (1 - cov(dH));
    if (style === "frame") {
      const gold = hb.style === "celestial" && hb.selStyle === "auto";
      const base = gold ? scale3(col, 0.6 + 0.5 * sat(0.6 - (Y - 12) / 20)) : scale3(gal(buf, k), 1.25);
      over(p, ring, base);
      over(p, ring * Math.exp(-Math.abs(dH) / 0.2) * hb.selGlow * pulse, mixc(col, WHITE, 0.4));
      over(p, ring * Math.exp(dO / 0.3) * 0.9, scale3(col, gold ? 0.25 : 1));
      over(p, (1 - cov(dO + 0.45)) * cov(dO), unhex(hb.outlineCol));
    } else if (style === "glow") {
      const g = dH > 0 ? Math.exp(-dH / 1.1) * sat(-dO / 0.8) : Math.exp(dH / 0.35) * 0.4;
      over(p, hb.selGlow * pulse * g * 0.85, col);
      over(p, Math.exp(-((dH / 0.22) ** 2)), mixc(col, WHITE, 0.6));
      over(p, (1 - cov(dO + 0.4)) * 0.6 * cov(dO), scale3(col, 0.5));
    } else if (style === "corners") {
      // corners follow the spin only on four-fold shapes; others keep them still so the loop matches up
      const ac = SH.sym === 4 ? a : (+hb.rot || 0) * Math.PI / 180, sx2 = X - 12 - kS * (Y - 12), cx2 = Math.cos(ac) * sx2 + Math.sin(ac) * (Y - 12), cy2 = -Math.sin(ac) * sx2 + Math.cos(ac) * (Y - 12);
      const L = (5 + 1.2 * hb.pulse * Math.sin(TAU * 2 * t)) / ef, m2 = Math.min(Math.abs(cx2), Math.abs(cy2)), near = m2 > ho - L ? 1 : 0;
      over(p, ring * near * cov(-(m2 - (ho - L))), mixc(col, WHITE, 0.2));
      over(p, ring * near * Math.exp(-Math.abs(dH) / 0.25) * hb.selGlow, WHITE);
    } else if (style === "orbit") {
      const dl = Math.abs(SH.sd(lx, ly, hm, roundK)), mid = squareish ? hm : hm * ef;
      over(p, 0.75 * Math.exp(-((dl / 0.22) ** 2)), mixc(col, acc, 0.3));
      over(p, hb.selGlow * 0.3 * Math.exp(-dl / 0.7), col);
      const n = Math.max(1, Math.round(hb.orbit));
      for (let q = 0; q < n; q++) {                                                // star(s) running around the square, with a tail
        for (let tr = 0; tr < 6; tr++) {
          const u = fract(t + q / n - tr * 0.012 - (SH.sym ? spin / SH.sym : spin) * t) * 4, sideI = Math.floor(u), f = u - sideI, m = mid;
          let pl = sideI === 0 ? [-m + 2 * m * f, -m] : sideI === 1 ? [m, -m + 2 * m * f] : sideI === 2 ? [m - 2 * m * f, m] : [-m, m - 2 * m * f];
          if (!squareish) { const th = TAU * (u / 4); pl = [Math.cos(th) * m * 0.93, Math.sin(th) * m * 0.93]; }
          const dd = Math.hypot(lx - pl[0], ly - pl[1]), w = tr === 0 ? 0.55 : 0.4 - tr * 0.04;
          over(p, (tr === 0 ? 1 : 0.5 * (1 - tr / 6)) * Math.exp(-((dd / w) ** 2)) * pulse, tr === 0 ? WHITE : mixc(col, WHITE, 0.4));
        }
      }
    } else if (style === "rainbow") {
      const rc = hsv(Math.atan2(Y - 12, X - 12) / TAU - t * Math.max(1, Math.round(R.cycles)), Math.max(0.5, R.sat), 1);
      const g = dH > 0 ? Math.exp(-dH / 1.1) * sat(-dO / 0.8) : Math.exp(dH / 0.35) * 0.4;
      over(p, hb.selGlow * pulse * g * 0.9, rc);
      over(p, ring * 0.85, scale3(rc, 0.9));
      over(p, Math.exp(-((dH / 0.22) ** 2)), mixc(rc, WHITE, 0.6));
      over(p, (1 - cov(dO + 0.4)) * cov(dO) * 0.7, scale3(rc, 0.4));
    } else {
      const lit = Y < 12 ? 1.15 : 0.85, plainC = hb.style === "stone" ? rgb(210, 210, 210) : col;
      over(p, ring, scale3(plainC, lit));
      over(p, (1 - cov(dO + 0.5)) * cov(dO), rgb(20, 20, 20));
      over(p, ring * Math.exp(-((dH / 0.25) ** 2)) * 0.6, rgb(90, 90, 90));
    }
    putPx(img, k, p);
  }
  return toRGBA(img);
}

/* menu buttons (200 x 20), the language button and the difficulty lock; still images */
function hbButtonIcon(S, hb, state, w = 200, h = 20, glyph = null, locked = false) {
  const img = newImg(S, w, h), W = img.W, H = img.H, cov = covf(S), P = hbPalette(hb), style = hb.buttons;
  const buf = style === "galaxy" ? starfield(S, w, h, 0, Object.assign({}, P, { starMul: 0.5 }), { scale: [6, 6], drift: [0, 0], dens: 0.04, big: 0.002, seed: 31 }) : null;
  const acc = unhex(hb.accent), hov = state === "hover", dis = state === "disabled";
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const k = j * W + i, X = (i + 0.5) / S, Y = (j + 0.5) / S, p = px0();
    const dB = sdBox(X, Y, w / 2, h / 2, w / 2, h / 2, 0), inner = 1 - cov(dB + 1), bevel = 1 - cov(dB + 2);
    let fill;
    if (style === "galaxy") fill = mixc(scale3(gal(buf, k), 0.55), scale3(P.deep, 0.5), 0.45);
    else if (style === "dark") fill = mixc(scale3(P.deep, 0.55), scale3(P.deep, 0.3), Y / h);
    else fill = scale3(rgb(111, 111, 111), 0.9 + 0.1 * vfbm(X * 0.9, Y * 0.9, 2));
    if (hov) fill = style === "stone" ? mixc(fill, rgb(126, 136, 191), 0.55) : mixc(scale3(fill, 1.35), acc, 0.12);
    if (dis) fill = style === "stone" ? rgb(44, 44, 44) : scale3(mixc(fill, [0.2, 0.2, 0.22], 0.6), 0.6);
    over(p, 1, fill);
    const hiC = dis ? [0.3, 0.3, 0.3] : style === "stone" ? rgb(170, 170, 170) : mixc(acc, WHITE, 0.3), loC = scale3(fill, 0.45);
    over(p, (bevel - inner) * (Y < h - 2 && X < w - 2 ? 0.75 : 0), hiC);             // light top-left bevel
    over(p, (bevel - inner) * (Y >= h - 2 || X >= w - 2 ? 0.8 : 0), loC);
    over(p, inner, hov ? (style === "stone" ? WHITE : mixc(acc, WHITE, 0.5)) : rgb(0, 0, 0));
    if (glyph === "globe") {
      const d = Math.hypot(X - 10, Y - 10) - 5.2, line = Math.min(Math.abs(d), Math.abs(Y - 10) + (d > 0 ? 9 : 0),
        Math.abs(Math.hypot((X - 10) * 2.1, Y - 10) - 5.2) + (d > 0 ? 9 : 0), Math.abs(X - 10) + (d > 0 ? 9 : 0));
      over(p, sat(0.6 - (line - 0.35) * S) * (dis ? 0.4 : 1), dis ? [0.6, 0.6, 0.6] : WHITE);
    } else if (glyph === "lock") {
      const body = sdBox(X, Y, 10, 12.2, 3.6, 2.9, 0.5), sh = Math.abs(Math.hypot(X - (locked ? 10 : 12.6), Y - 8.4) - 2.3) - 0.55;
      const shackle = Math.max(sh, Y - 9.3);
      const c = dis ? [0.55, 0.55, 0.55] : locked ? mixc(acc, WHITE, 0.55) : WHITE;
      over(p, sat(0.5 - Math.min(body, shackle) * S), c);
      over(p, sat(0.5 - (Math.hypot(X - 10, Y - 12) - 0.7) * S) * 0.8, scale3(fill, 0.4));
    }
    putPx(img, k, p);
  }
  return toRGBA(img);
}
/* the whole widgets.png at S px per base px; the hotbar and selection frame are frame 0 of their animations */
function buildWidgets(S, hb) {
  const Wd = 256 * S, out = new Uint8ClampedArray(Wd * Wd * 4);
  const put = (im, x, y) => { for (let r = 0; r < im.h; r++) out.set(im.data.subarray(r * im.w * 4, (r + 1) * im.w * 4), ((y * S + r) * Wd + x * S) * 4); };
  return { Wd, out, put, jobs: [
    () => put(hotbarIcon(S, hb, 0), 0, 0), () => put(hotbarSelIcon(S, hb, 0), 0, 22),
    () => put(hbButtonIcon(S, hb, "disabled"), 0, 46), () => put(hbButtonIcon(S, hb, "normal"), 0, 66), () => put(hbButtonIcon(S, hb, "hover"), 0, 86),
    () => { put(hbButtonIcon(S, hb, "normal", 20, 20, "globe"), 0, 106); put(hbButtonIcon(S, hb, "hover", 20, 20, "globe"), 0, 126); },
    () => { for (const [lk, x] of [[true, 0], [false, 20]]) for (const [stt, y] of [["normal", 146], ["hover", 166], ["disabled", 186]]) put(hbButtonIcon(S, hb, stt, 20, 20, "lock", lk), x, y); },
  ] };
}
/* complete hotbar designs: a style, variant, shape, bar, turn and size pattern together */
const HB_DESIGNS = {
  cosmic: { label: "Cosmic classic", gal: "deep", set: { style: "galaxy" } },
  cards: { label: "Tilted cards", gal: "andromeda", set: { style: "galaxy", barShape: "tiles", rot: 10, rotMode: "alternate", round: 0.2 } },
  fan: { label: "Fanned deck", gal: "twilight", set: { style: "galaxy", barShape: "tiles", rot: 20, rotMode: "fan", round: 0.15 } },
  hive: { label: "Hex hive", gal: "emerald", set: { style: "nebula", slotShape: "hex", barShape: "tiles", rot: 30 } },
  starlight: { label: "Swaying stars", gal: "void", set: { style: "constellation", slotShape: "star", rot: 14, rotMode: "wave", barShape: "pill" } },
  gems: { label: "Spinning gems", set: { style: "crystal", slotShape: "octagon", spin: 1, barShape: "pill", accent: "#8ad8ff" } },
  candy: { label: "Candy bubbles", rb: "stripes", set: { style: "rainbow", slotShape: "circle", barShape: "pill", sizeMode: "alternate" } },
  arcade: { label: "Neon slant", rb: "neon", set: { style: "rainbow", round: 0.3, skew: 0.3, barShape: "slant" } },
  forge: { label: "Molten shields", set: { style: "lava", slotShape: "shield", barShape: "chamfer" } },
  prism: { label: "Rocking prisms", rb: "prism", set: { style: "rainbow", slotShape: "diamond", rot: 18, rotMode: "rock", barShape: "rounded" } },
  retro: { label: "Retro plus", set: { style: "pixel", slotShape: "plus", c1: "#1a1446", c2: "#4a3ab0", c3: "#9c8cff" } },
  float: { label: "Floating rings", set: { style: "minimal", slotShape: "circle", barShape: "tiles", sizeMode: "breathe", accent: "#d8c8ff" } },
  nova: { label: "Supernova stars", gal: "supernova", set: { style: "galaxy", slotShape: "star", spin: 1, barShape: "notch" } },
  holo: { label: "Holo pills", rb: "holo", set: { style: "rainbow", round: 0.5, barShape: "pill", skew: 0.2 } },
  shards: { label: "Frozen shards", gal: "ice", set: { style: "crystal", slotShape: "diamond", rot: 25, rotMode: "random", barShape: "tiles", accent: "#bff0ff" } },
  gate: { label: "Rift gates", gal: "quasar", set: { style: "rift", slotShape: "hex", rot: 90, barShape: "chamfer" } },
  crown: { label: "Celestial crests", gal: "deep", set: { style: "celestial", slotShape: "shield", barShape: "rounded", sizeMode: "center" } },
  ribbon: { label: "Aurora ribbon", rb: "aurora", set: { style: "rainbow", slotShape: "circle", barShape: "scallop", sizeMode: "breathe" } },
  milky: { label: "Milky slant", gal: "milky", set: { style: "galaxy", skew: 0.35, barShape: "slant" } },
  chroma: { label: "Chroma bubbles", rb: "chroma", set: { style: "rainbow", slotShape: "circle", barShape: "tiles", sizeMode: "center" } },
  quasar: { label: "Quasar spin", gal: "quasar", set: { style: "nebula", slotShape: "plus", spin: 1, rotMode: "alternate" } },
  glasscards: { label: "Scattered glass", set: { style: "glass", barShape: "tiles", rot: 9, rotMode: "random", round: 0.12 } },
  lavadiamonds: { label: "Lava diamonds", set: { style: "lava", slotShape: "diamond", rot: 15, rotMode: "wave" } },
  pastel: { label: "Pastel waves", gal: "pastel", set: { style: "nebula", slotShape: "circle", barShape: "scallop", sizeMode: "alternate" } },
  emeraldfan: { label: "Emerald fan", gal: "emerald", set: { style: "nebula", slotShape: "octagon", barShape: "tiles", rot: 25, rotMode: "fan", sizeMode: "center" } },
  blades: { label: "Crimson blades", gal: "crimson", set: { style: "rift", slotShape: "diamond", skew: 0.45, barShape: "slant" } },
  sunset: { label: "Sunset pills", gal: "twilight", set: { style: "galaxy", round: 0.5, barShape: "pill", sizeMode: "alternate" } },
  storm: { label: "Star storm tiles", gal: "starstorm", set: { style: "galaxy", slotShape: "star", barShape: "tiles", rot: 18, rotMode: "alternate" } },
  pastelplus: { label: "Pastel crosses", rb: "pastel", set: { style: "rainbow", slotShape: "plus", barShape: "scallop", rot: 12, rotMode: "rock" } },
  orbits: { label: "Void orbits", gal: "void", set: { style: "constellation", slotShape: "circle", barShape: "pill", selStyle: "orbit", orbit: 3 } },
  neonhex: { label: "Cyan hex grid", set: { style: "neon", slotShape: "hex", rot: 30, barShape: "tiles", accent: "#5af0ff", c2: "#2a6ad8", c3: "#7ef6ff" } },
  golddiam: { label: "Golden diamonds", set: { style: "celestial", slotShape: "diamond", barShape: "chamfer", sizeMode: "ends" } },
  icespin: { label: "Ice spinners", gal: "ice", set: { style: "crystal", round: 0.2, spin: -1, barShape: "tiles", accent: "#bff0ff" } },
  deepcards: { label: "Deep rainbow cards", rb: "dark", set: { style: "rainbow", barShape: "tiles", rot: 14, rotMode: "random" } },
  wavecandy: { label: "Candy wave", rb: "stripes", set: { style: "rainbow", slotShape: "diamond", rot: 20, rotMode: "wave", barShape: "pill" } },
  holoshield: { label: "Holo shields", rb: "holo", set: { style: "rainbow", slotShape: "shield", barShape: "notch" } },
  pixelstar: { label: "Pixel sunset stars", set: { style: "pixel", slotShape: "star", c1: "#3a1404", c2: "#b0501a", c3: "#ffc070", accent: "#ffb060" } },
  mindiam: { label: "Minimal diamonds", set: { style: "minimal", slotShape: "diamond", barShape: "tiles", sizeMode: "alternate", accent: "#ffffff" } },
  riftspin: { label: "Rift spinners", gal: "void", set: { style: "rift", slotShape: "plus", spin: 1, barShape: "chamfer", accent: "#b46cff" } },
  glassbub: { label: "Glass bubbles", set: { style: "glass", slotShape: "circle", barShape: "tiles", sizeMode: "breathe" } },
  lavarings: { label: "Lava rings", set: { style: "lava", slotShape: "circle", barShape: "scallop", sizeMode: "breathe" } },
  andslant: { label: "Andromeda slant", gal: "andromeda", set: { style: "galaxy", slotShape: "hex", skew: 0.3, barShape: "slant" } },
  aurorastar: { label: "Aurora spinning stars", rb: "aurora", set: { style: "rainbow", slotShape: "star", spin: 1, barShape: "pill" } },
  milkyfan: { label: "Milky Way shields", gal: "milky", set: { style: "nebula", slotShape: "shield", rot: 22, rotMode: "fan", barShape: "tiles" } },
  quasardiam: { label: "Quasar rockers", gal: "quasar", set: { style: "galaxy", slotShape: "diamond", rot: 20, rotMode: "rock", barShape: "notch", sizeMode: "center" } },
  prismoct: { label: "Prism octagons", rb: "prism", set: { style: "rainbow", slotShape: "octagon", rot: 22.5, rotMode: "alternate", barShape: "tiles" } },
  stonetilt: { label: "Tumbled stone", set: { style: "stone", barShape: "tiles", rot: 8, rotMode: "random", round: 0.1 } },
  redcrest: { label: "Red giant crests", gal: "crimson", set: { style: "celestial", slotShape: "shield", barShape: "rounded", rot: 10, rotMode: "rock", goldCol: "#f0c070" } },
  galpulse: { label: "Rainbow galaxy pulse", rb: "galaxy", set: { style: "rainbow", slotShape: "circle", barShape: "pill", sizeMode: "breathe" } },
  chromadiam: { label: "Chroma slant", rb: "chroma", set: { style: "rainbow", slotShape: "diamond", skew: 0.25, barShape: "tiles" } },
  cornerslant: { label: "Sharp minimal", set: { style: "minimal", round: 0, skew: 0.2, barShape: "slant", selStyle: "corners", accent: "#e6d8ff" } },
  novashards: { label: "Supernova shards", gal: "supernova", set: { style: "galaxy", slotShape: "diamond", rot: 30, rotMode: "random", barShape: "tiles" } },
  emeraldbub: { label: "Emerald bubbles", gal: "emerald", set: { style: "nebula", slotShape: "circle", barShape: "scallop", sizeMode: "alternate", selStyle: "glow" } },
  twistars: { label: "Twilight star fan", gal: "twilight", set: { style: "galaxy", slotShape: "star", rot: 30, rotMode: "fan", barShape: "tiles", sizeMode: "center" } },
};
const HB_DESIGN_KEEP = ["enabled", "speed", "loopSec", "animFps", "motion", "buttons", "selCol"];
function hbDesign(cur, name) {
  const D = HB_DESIGNS[name], hb = clone(HB_DEFAULTS);
  for (const k of HB_DESIGN_KEEP) if (cur && cur[k] !== undefined) hb[k] = cur[k];
  if (D.gal) { const v = HB_GAL_VARIANTS[D.gal]; Object.assign(hb, { c1: v.c[0], c2: v.c[1], c3: v.c[2], accent: v.c[3], gal: galParams(D.gal) }, v.o); }
  if (D.rb) hb.rb = rbParams(D.rb);
  Object.assign(hb, clone(D.set), { design: name, enabled: true });
  return hb;
}
