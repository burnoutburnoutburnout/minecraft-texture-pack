/* =====================================================================
   Crosshair: built from parts (lines, dot, circle, brackets, diamond, chevron), 16 x 16 base px at
   the top-left of icons.png, centre at (7.5, 7.5).
   Minecraft 1.8.9 draws the crosshair with an inverting blend (ONE_MINUS_DST_COLOR, ONE_MINUS_SRC_COLOR):
   white inverts what is behind it, colours are mixed with it, black is invisible, and alpha is ignored
   apart from cutting out pixels under 0.1. So the texture is stored with colour multiplied by alpha.
   ===================================================================== */
const CROSS_BASE = { preset: "classic", col: "#ffffff", fill: "solid", galVariant: "deep", rbSat: 1, opacity: 1,
  arms: true, armMode: "plus", len: 4.5, thick: 1, gap: 0, armRound: 0, taper: 0,
  dot: false, dotSize: 0.8, dotShape: "round",
  ring: false, ringR: 4.2, ringThick: 0.8, ringSegs: 0, ringFill: 0.6,
  brackets: false, brSize: 5, brLen: 2, brThick: 0.8,
  diamond: false, diaSize: 4, diaThick: 0.7,
  chevron: false, chevSize: 2.6, chevThick: 0.8, chevY: 1.6,
  rot: 0, scale: 1, anim: "none", spin: 1, pulse: 0.25, cycles: 1, speed: 2, loopSec: 3, animFps: "ticks" };
const CROSS_ARM_MODES = { plus: "Plus (4)", t: "T (no top)", x: "X (diagonal)", y: "Y (3)", six: "Six", h: "Horizontal only", v: "Vertical only" };
const CROSS_ANIMS = { none: "Still", spin: "Spin", pulse: "Pulse", rainbow: "Rainbow cycle", spinRainbow: "Spin + rainbow" };
const cp = o => Object.assign({ arms: false }, o);                               // preset helper: parts off unless set
const CROSS_PRESETS = {
  classic: { label: "Classic", set: { arms: true } },
  thin: { label: "Thin", set: { arms: true, thick: 0.6, len: 4 } },
  thick: { label: "Thick", set: { arms: true, thick: 1.6, len: 4 } },
  small: { label: "Small", set: { arms: true, len: 2.5, thick: 0.8 } },
  gapplus: { label: "Gap plus", set: { arms: true, gap: 1.6, len: 5, thick: 0.8 } },
  gapdot: { label: "Gap plus + dot", set: { arms: true, gap: 2, len: 5.2, thick: 0.8, dot: true, dotSize: 0.6 } },
  dot: { label: "Dot", set: cp({ dot: true, dotSize: 0.9 }) },
  bigdot: { label: "Big dot", set: cp({ dot: true, dotSize: 1.8 }) },
  sqdot: { label: "Square dot", set: cp({ dot: true, dotSize: 1, dotShape: "square" }) },
  circle: { label: "Circle", set: cp({ ring: true, ringR: 3.6, ringThick: 0.8 }) },
  circledot: { label: "Circle + dot", set: cp({ ring: true, ringR: 3.4, ringThick: 0.9, dot: true, dotSize: 0.75 }) },
  dashring: { label: "Dashed circle", set: cp({ ring: true, ringR: 4.2, ringThick: 0.8, ringSegs: 8, ringFill: 0.55, dot: true, dotSize: 0.6 }) },
  scope: { label: "Scope", set: { arms: true, gap: 2.2, len: 6.6, thick: 0.6, ring: true, ringR: 4.4, ringThick: 0.6 } },
  sniper: { label: "Sniper", set: { arms: true, gap: 0.9, len: 7.4, thick: 0.5, ring: true, ringR: 5.6, ringThick: 0.7, dot: true, dotSize: 0.45 } },
  brackets: { label: "Brackets + dot", set: cp({ brackets: true, brSize: 4.6, brLen: 1.9, brThick: 0.85, dot: true, dotSize: 0.6 }) },
  bracketplus: { label: "Brackets + plus", set: { arms: true, len: 2.2, thick: 0.7, brackets: true, brSize: 5, brLen: 2, brThick: 0.7 } },
  tee: { label: "T", set: { arms: true, armMode: "t", gap: 1.2, len: 5, thick: 0.8 } },
  teedot: { label: "T + dot", set: { arms: true, armMode: "t", gap: 1.6, len: 5, thick: 0.8, dot: true, dotSize: 0.6 } },
  ex: { label: "X", set: { arms: true, armMode: "x", len: 4.2, thick: 0.9 } },
  exgap: { label: "X with gap", set: { arms: true, armMode: "x", gap: 1.6, len: 5, thick: 0.8, dot: true, dotSize: 0.55 } },
  ydot: { label: "Y", set: { arms: true, armMode: "y", gap: 1.2, len: 4.6, thick: 0.8, dot: true, dotSize: 0.55, rot: 180 } },
  six: { label: "Six-point", set: { arms: true, armMode: "six", gap: 1.4, len: 4.4, thick: 0.6 } },
  diamond: { label: "Diamond", set: cp({ diamond: true, diaSize: 3.4, diaThick: 0.8 }) },
  diamonddot: { label: "Diamond + dot", set: cp({ diamond: true, diaSize: 4, diaThick: 0.7, dot: true, dotSize: 0.6 }) },
  chevron: { label: "Chevron", set: cp({ chevron: true }) },
  chevdot: { label: "Chevron + dot", set: cp({ chevron: true, chevY: 2.2, dot: true, dotSize: 0.6 }) },
  fourdots: { label: "Four dots", set: cp({ ring: true, ringR: 3, ringThick: 1.1, ringSegs: 4, ringFill: 0.14, rot: 45 }) },
  dotring: { label: "Ring of dots", set: cp({ ring: true, ringR: 4, ringThick: 0.8, ringSegs: 10, ringFill: 0.25, dot: true, dotSize: 0.55 }) },
  pointed: { label: "Pointed", set: { arms: true, gap: 1.2, len: 6, thick: 1.4, taper: 1 } },
  rounded: { label: "Rounded", set: { arms: true, gap: 1.4, len: 4.6, thick: 1.2, armRound: 1 } },
  hbar: { label: "Horizon", set: { arms: true, armMode: "h", gap: 1.6, len: 6.5, thick: 0.7, dot: true, dotSize: 0.55 } },
  rainbowring: { label: "Rainbow ring", set: cp({ ring: true, ringR: 4, ringThick: 1.1, dot: true, dotSize: 0.6, fill: "rainbow", anim: "rainbow" }) },
  rainbowplus: { label: "Rainbow plus", set: { arms: true, gap: 1.4, len: 5.2, thick: 1.1, fill: "rainbow", anim: "rainbow" } },
  galaxydot: { label: "Galaxy orb", set: cp({ dot: true, dotSize: 2.4, ring: true, ringR: 3.4, ringThick: 0.5, fill: "galaxy", anim: "pulse", pulse: 0.15 }) },
  spinbrackets: { label: "Spinning brackets", set: cp({ brackets: true, brSize: 4.6, brLen: 1.9, brThick: 0.85, dot: true, dotSize: 0.55, anim: "spin", spin: 1 }) },
  pulsedot: { label: "Pulsing dot", set: cp({ dot: true, dotSize: 1.1, ring: true, ringR: 3, ringThick: 0.5, ringSegs: 4, ringFill: 0.5, rot: 45, anim: "pulse", pulse: 0.3 }) },
  spinx: { label: "Spinning rainbow X", set: { arms: true, armMode: "x", gap: 1.3, len: 5, thick: 0.9, fill: "rainbow", anim: "spinRainbow", spin: 1 } },
};
const CROSS_KEEP = ["col", "galVariant", "speed", "loopSec", "animFps"];
function crossPreset(cur, name) {
  const c = Object.assign(clone(CROSS_BASE), clone(CROSS_PRESETS[name].set), { preset: name });
  for (const k of CROSS_KEEP) if (cur && cur[k] !== undefined) c[k] = cur[k];
  return c;
}
const crossAnimated = c => c.anim && c.anim !== "none";

/* signed distance (base px) of the whole crosshair, in centred coords; t for spin and pulse */
function crossSD(c, x0, y0, t) {
  const spinA = (c.anim === "spin" || c.anim === "spinRainbow") ? Math.round(c.spin || 1) * TAU * t : 0;
  const pz = c.anim === "pulse" ? 1 + c.pulse * Math.sin(TAU * t) : 1, k = (c.scale || 1) * pz;
  const a = (c.rot || 0) * Math.PI / 180 + spinA, ca = Math.cos(a), sa = Math.sin(a);
  const x = (ca * x0 + sa * y0) / k, y = (-sa * x0 + ca * y0) / k, r = Math.hypot(x, y);
  let d = 9;
  if (c.arms && c.len > c.gap) {
    const dirs = { plus: [0, 90, 180, 270], t: [0, 90, 180], x: [45, 135, 225, 315], y: [90, 210, 330], six: [0, 60, 120, 180, 240, 300], h: [0, 180], v: [90, 270] }[c.armMode] || [0, 90, 180, 270];
    for (const deg of dirs) {
      const th = deg * Math.PI / 180, u = x * Math.cos(th) + y * Math.sin(th), v = -x * Math.sin(th) + y * Math.cos(th);
      const f = sat((u - c.gap) / Math.max(0.01, c.len - c.gap)), hw = c.thick / 2 * (1 - c.taper * f * 0.92);
      const mid = (c.gap + c.len) / 2, hl = (c.len - c.gap) / 2, rr = Math.min(hw, hl) * c.armRound;
      d = Math.min(d, sdBox(u, v, mid, 0, hl, hw, rr));
    }
  }
  if (c.dot) {
    const s = c.dotSize;
    d = Math.min(d, c.dotShape === "square" ? sdBox(x, y, 0, 0, s, s, 0) : c.dotShape === "diamond" ? (Math.abs(x) + Math.abs(y) - s * 1.3) * Math.SQRT1_2 : r - s);
  }
  if (c.ring) {
    let rd = Math.abs(r - c.ringR) - c.ringThick / 2;
    if (c.ringSegs > 0) { const seg = TAU / c.ringSegs, fa = fract(Math.atan2(y, x) / seg + 0.5) - 0.5; rd = Math.max(rd, (Math.abs(fa) - c.ringFill / 2) * seg * c.ringR); }
    d = Math.min(d, rd);
  }
  if (c.brackets) {
    const B = c.brSize, box = Math.abs(sdBox(x, y, 0, 0, B, B, 0)) - c.brThick / 2, m2 = Math.min(Math.abs(x), Math.abs(y));
    d = Math.min(d, Math.max(box, (B - c.brLen) - m2));
  }
  if (c.diamond) d = Math.min(d, Math.abs((Math.abs(x) + Math.abs(y) - c.diaSize) * Math.SQRT1_2) - c.diaThick / 2);
  if (c.chevron) {
    const w = c.chevSize, yy = y - c.chevY;
    const seg = (ax, ay, bx, by) => { const ex = bx - ax, ey = by - ay, q = sat(((x - ax) * ex + (yy - ay) * ey) / (ex * ex + ey * ey)); return Math.hypot(x - ax - ex * q, yy - ay - ey * q); };
    d = Math.min(d, Math.min(seg(-w, w * 0.75, 0, 0), seg(0, 0, w, w * 0.75)) - c.chevThick / 2);
  }
  return d * k;
}
function crosshairIcon(S, cfg, t = 0) {
  const c = Object.assign(clone(CROSS_BASE), cfg || {}), img = newImg(S, 16, 16), cov = covf(S), col = unhex(c.col);
  const gv = HB_GAL_VARIANTS[c.galVariant] || HB_GAL_VARIANTS.deep;
  const pseudo = { c1: gv.c[0], c2: gv.c[1], c3: gv.c[2], accent: gv.c[3], stars: 1.4, texScale: 0.6, motion: "loop", shoot: 0, gal: galParams(c.galVariant in HB_GAL_VARIANTS ? c.galVariant : "deep") };
  const buf = c.fill === "galaxy" ? hbGalaxy(S, 16, 16, t, pseudo, hbPalette(pseudo), 61) : null;
  const hueT = (c.anim === "rainbow" || c.anim === "spinRainbow") ? Math.max(1, Math.round(c.cycles || 1)) * t : 0;
  for (let j = 0; j < img.H; j++) for (let i = 0; i < img.W; i++) {
    const X = (i + 0.5) / S, Y = (j + 0.5) / S, p = j * img.W + i, a = cov(crossSD(c, X - 7.5, Y - 7.5, t)) * c.opacity;
    if (a <= 0.003) continue;
    const fc = c.fill === "rainbow" ? hsv(Math.atan2(Y - 7.5, X - 7.5) / TAU - hueT, c.rbSat, 1)
      : c.fill === "galaxy" ? scale3(mixc(gal(buf, p), unhex(gv.c[2]), 0.2), 1.4) : col;
    setPx(img, p, a, fc);
  }
  const out = toRGBA(img), d = out.data;                                          // colour times alpha (see above)
  for (let q = 0; q < d.length; q += 4) { const al = d[q + 3] / 255; d[q] *= al; d[q + 1] *= al; d[q + 2] *= al; }
  return out;
}
