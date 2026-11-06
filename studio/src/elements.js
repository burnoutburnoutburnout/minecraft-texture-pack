/* =====================================================================
   HUD elements: hearts, armor and bars share one fully customizable pipeline
   (shape -> border -> texture -> lighting -> outline), like the steak.
   ===================================================================== */
const ELEM = {
  heart: { w: 9, h: 9, c: [4.5, 4.49], R: 6.5 },
  armor: { w: 9, h: 9, c: [4.5, 4.55], R: 6.5 },
  bar: { w: 182, h: 5, c: [91, 2.5], R: 0 },
};
const EL_TEXTURES = ["heartcut", "gem", "galaxy", "nebula", "starfield", "aurora", "crystal", "glossy", "solid", "gradient", "metal", "lava", "ice", "marble", "hologram", "plasma"];
const EL_TEX_LABEL = { heartcut: "Heart-cut gem", gem: "Round-cut gem", galaxy: "Galaxy", nebula: "Nebula", starfield: "Starfield", aurora: "Aurora", crystal: "Crystal", glossy: "Glossy", solid: "Solid",
  gradient: "Gradient", metal: "Metal", lava: "Lava", ice: "Ice", marble: "Marble", hologram: "Hologram", plasma: "Plasma" };
const EL_BORDERS = {
  clean: { label: "Clean" }, thin: { label: "Thin line", outline: 0.25 }, thick: { label: "Thick line", outline: 0.8 },
  none: { label: "No outline", outline: 0 }, rough: { label: "Rough", rough: [0.1, 4] }, jagged: { label: "Jagged", rough: [0.1, 9] },
  wavy: { label: "Wavy", wave: [0.1, 14] }, faceted: { label: "Faceted", facets: 12 }, double: { label: "Double line", double: true },
  slab: { label: "3D slab", thick: 0.7 },
  neon: { label: "Neon", outline: 0.25, outlineStyle: "light", glowOut: 0.9 },
  halo: { label: "Halo", outline: 0, glowOut: 0.75, glowCol: "white" },
  sticker: { label: "Sticker", outline: 0.3, sticker: 0.45 },
  ring: { label: "Outer ring", outline: 0.35, ring: 0.25 },
  dashed: { label: "Dashed", outline: 0.45, dash: 14 },
  stitched: { label: "Stitched", outline: 0.35, stitch: 12 },
  bevel: { label: "Raised bevel", outline: 0.3, bevel: 1 },
  inset: { label: "Inset bevel", outline: 0.3, bevel: -1 },
  gold: { label: "Gold rim", outline: 0.6, outlineStyle: "gold" },
  silver: { label: "Silver rim", outline: 0.6, outlineStyle: "silver" },
  rainbow: { label: "Rainbow", outline: 0.5, outlineStyle: "rainbow" },
  gradient: { label: "Shaded line", outline: 0.6, outlineStyle: "gradient" },
  spiky: { label: "Spiky", wave: [0.12, 18], waveType: "spike" },
  scalloped: { label: "Scalloped", wave: [0.1, 16], waveType: "scallop" },
  chunky: { label: "Chunky", rough: [0.18, 2.2] },
  soft: { label: "Soft edge", outline: 0, feather: 0.6 },
  shadow: { label: "Drop shadow", drop: 0.7 },
  comic: { label: "Comic", outline: 0.75, outlineStyle: "ink", double: true },
  glass: { label: "Glass", outline: 0.2, outlineStyle: "light", bevel: 0.8, glowOut: 0.3 },
  frost: { label: "Frost", outline: 0.4, outlineStyle: "frost", rough: [0.05, 10], glowOut: 0.4, glowCol: "white" },
  stoneFrame: { label: "Stone frame", outline: 0.16, outlineStyle: "ink", frame: 1.05, frameMat: "stone", rough: [0.03, 6] },
  ironFrame: { label: "Iron frame", outline: 0.14, outlineStyle: "ink", frame: 1.0, frameMat: "iron" },
  goldFrame: { label: "Gold frame", outline: 0.14, outlineStyle: "ink", frame: 1.0, frameMat: "gold" },
  bronzeFrame: { label: "Bronze frame", outline: 0.14, outlineStyle: "ink", frame: 1.0, frameMat: "bronze" },
  silverFrame: { label: "Silver frame", outline: 0.14, outlineStyle: "ink", frame: 0.9, frameMat: "silver" },
  obsidianFrame: { label: "Obsidian frame", outline: 0.14, outlineStyle: "ink", frame: 1.0, frameMat: "obsidian" },
};
/* borders that need room outside the shape (bars fill their whole row, so they are skipped there) */
const EL_OUTSIDE_BORDERS = ["faceted", "slab", "neon", "halo", "sticker", "ring", "shadow", "glass", "frost"];
const EL_BORDER_KEYS = ["outline", "rough", "wave", "facets", "double", "thick", "outlineStyle", "glowOut", "glowCol", "ring", "dash", "stitch",
  "bevel", "sticker", "feather", "drop", "waveType", "frame", "frameMat"];

const EL_COMMON = {
  design: "galaxy", texture: "galaxy", illus: "", uiStyle: "", heartShape: "", hardcore: "world", frameLight: 0, animFps: "ticks", motion: "random", shoot: 2, gemFill: "facets", facetStr: 0.6, stars: 1, texScale: 1, texStrength: 1, speed: 2, glow: 0.32,
  border: "clean", outline: 0.5, rough: [0, 4], wave: [0, 0], facets: 0, double: false, thick: 0,
  outlineStyle: "solid", glowOut: 0, glowCol: "main", ring: 0, dash: 0, stitch: 0, bevel: 0, sticker: 0, feather: 0, drop: 0, waveType: "sine", frame: 0, frameMat: "stone",
  posX: 0, posY: 0, size: 1, tilt: 0, custom: false, points: [], smooth: 0.85,
  light: 225, shade: 1, falloff: 0, rimLight: 0, rimShadow: 0, shine: 0.28, shineSize: 1, shineX: -1.9, shineY: -1.74,
};
const EL_DEFAULTS = {
  heart: Object.assign(clone(EL_COMMON), { c1: "#1c0e54", c2: "#5c28c4", c3: "#b05cff", outlineCol: "#0e041e",
    emptyCol: "#0a0612", emptyOutline: "#040208", w: 1, h: 1, round: 0, tip: 1, cleft: 0 }),
  armor: Object.assign(clone(EL_COMMON), { c1: "#18225a", c2: "#5060be", c3: "#bec8ff", outlineCol: "#0a081e", emptyCol: "#1a142a",
    shine: 0, shoulder: 3.4, neckW: 1.3, neckD: 1.3, sleeve: 4.0, sleeveY: -0.45, armpit: 2.4, waist: 2.4, top: -3.75, bottom: 3.75, round: 0 }),
  bar: Object.assign(clone(EL_COMMON), { c1: "#0a1e58", c2: "#246ed6", c3: "#6ee8ff", outlineCol: "#060c22", bgCol: "#08081a",
    outline: 0.45, shine: 0.06, shineX: 0, shineY: -1.25, barH: 5, radius: 1.6, slant: 0, taper: 0, segments: 0, segGap: 0.6 }),
};
/* angular, gem-cut heart outline: straight sides, chamfered lobes and a sharp V notch */
const GEM_HEART = [[4.5, 1.75], [5.3, 1.0], [6.6, 0.6], [7.9, 0.85], [8.6, 1.7], [8.7, 3.1], [8.2, 4.6], [6.6, 6.5], [4.5, 8.5],
  [2.4, 6.5], [0.8, 4.6], [0.3, 3.1], [0.4, 1.7], [1.1, 0.85], [2.4, 0.6], [3.7, 1.0]];
const GEM_SHAPE = { custom: true, points: GEM_HEART, smooth: 0.08 };
/* puffy classic heart: shape fitted to a reference hunger bar's hearts (wide lobes, shallow notch, short point) */
const PUFFY_SHAPE = {w:  0.908,  h:  1.057,  round:  0.589,  tip:  0.849,  cleft:  -0.381,  size:  1.114,  posY:  0.115};
/* classic heart: fitted to the blue reference hearts (wide and squat, broad lobes, shallow notch, short point) */
const CLASSIC_SHAPE = { w: 1.09, h: 1.215, round: 0.432, tip: 0.703, cleft: -0.514, size: 0.903, posY: 0.505 };
/* heart shapes you can pick in the Hearts shape card */
const HEART_SHAPES = {
  standard: { label: "Standard", set: { w: 1, h: 1, round: 0, tip: 1, cleft: 0, size: 1, posY: 0, custom: false } },
  classic: { label: "Classic", set: Object.assign({ custom: false }, CLASSIC_SHAPE) },
  puffy: { label: "Puffy", set: Object.assign({ custom: false }, PUFFY_SHAPE) },
  gemcut: { label: "Gem-cut", set: { custom: true, points: GEM_HEART, smooth: 0.08, w: 1, h: 1, round: 0, tip: 1, cleft: 0, size: 1, posY: 0 } },
};
const D_ = (texture, c1, c2, c3, outlineCol, extra = {}) => Object.assign({ texture, c1, c2, c3, outlineCol }, extra);
const EL_DESIGNS = {
  heart: {
    galaxy: D_("galaxy", "#1c0e54", "#5c28c4", "#b05cff", "#0e041e"),
    nebula: D_("nebula", "#3a0b3f", "#c2357f", "#ff9ad5", "#1c0418"),
    starlight: D_("starfield", "#0b1030", "#3a4ba8", "#cfe0ff", "#05081a"),
    ruby: D_("crystal", "#4a0310", "#c0162e", "#ff8a9a", "#2a0208", { outline: 0.3, rimLight: 0.8, shine: 0.5 }),
    candy: D_("glossy", "#8a0f2a", "#ff3b5c", "#ffb0bb", "#3a0612", { outline: 0.55, shine: 0.6, glow: 0 }),
    classic: D_("gradient", "#7a0000", "#d81818", "#ff5a5a", "#1a0000", { shine: 0.45, glow: 0, round: 0.3 }),
    lava: D_("lava", "#2a0a04", "#ff5a10", "#ffd060", "#120402", { rough: [0.06, 5], glow: 0.2 }),
    ice: D_("ice", "#1b3a6a", "#8fd0ff", "#e6f7ff", "#0d2240", { rimLight: 0.7, shine: 0.4, facets: 0 }),
    hologram: D_("hologram", "#2a1a7a", "#30d5ff", "#ff5cf0", "#0a0628", { glow: 0.2 }),
    plasma: D_("plasma", "#1a0040", "#ff2fa0", "#ffe14d", "#0a0018"),
    marble: D_("marble", "#3a1c4a", "#e9dff2", "#ffffff", "#1c0d24", { glow: 0, shine: 0.35 }),
    aurora: D_("aurora", "#04122a", "#22e0a0", "#a070ff", "#020a18"),
    puffy: D_("galaxy", "#1c0e54", "#5c28c4", "#b05cff", "#05030c", Object.assign({}, PUFFY_SHAPE, { outline: 0.7, shine: 0.75, shineSize: 0.6, shineX: -1.6, shineY: -1.7, glow: 0.08, shade: 0.35, falloff: 1.1 , heartShape: "classic" , heartShape: "puffy" })),
    "puffy-obsidian": D_("galaxy", "#1c0e54", "#5c28c4", "#b05cff", "#05030c", Object.assign({}, PUFFY_SHAPE, { outline: 0.2, outlineStyle: "ink", frame: 0.95, frameMat: "obsidian", border: "obsidianFrame", shine: 0.6, shineSize: 0.55, shineX: -1.35, shineY: -1.45, glow: 0 , heartShape: "puffy" })),
    classic: D_("galaxy", "#1c0e54", "#5c28c4", "#b05cff", "#05030c", Object.assign({}, CLASSIC_SHAPE, { outline: 0.55, shine: 0.6, shineSize: 0.55, shineX: -1.8, shineY: -1.9, glow: 0.08, shade: 0.35, falloff: 1.1 })),
    "classic-obsidian": D_("galaxy", "#1c0e54", "#5c28c4", "#b05cff", "#05030c", Object.assign({}, CLASSIC_SHAPE, { outline: 0.2, outlineStyle: "ink", frame: 0.95, frameMat: "obsidian", border: "obsidianFrame", shine: 0.5, shineSize: 0.5, shineX: -1.6, shineY: -1.7, glow: 0 , heartShape: "classic" })),
    "galaxy-stone": D_("galaxy", "#1c0e54", "#5c28c4", "#b05cff", "#0a0606", { outline: 0.16, outlineStyle: "ink", frame: 1.05, frameMat: "stone", glow: 0, shine: 0, border: "stoneFrame", illus: "gemheart", gemFill: "texture", facetStr: 0.55 }),
    "galaxy-silver": D_("galaxy", "#1c0e54", "#5c28c4", "#b05cff", "#0a0a0e", { outline: 0.14, outlineStyle: "ink", frame: 0.75, frameMat: "silver", glow: 0, shine: 0, border: "silverFrame", illus: "gemheart", gemFill: "texture", facetStr: 0.55 }),
    "ruby-stone": D_("heartcut", "#4b0816", "#b9283e", "#fad2cd", "#0a0606", { outline: 0.16, outlineStyle: "ink", frame: 1.05, frameMat: "stone", rough: [0.03, 6], glow: 0, shine: 0, border: "stoneFrame" , ...GEM_SHAPE , illus: "gemheart" }),
    "emerald-iron": D_("heartcut", "#032a14", "#14a050", "#9cffc4", "#0a0a0a", { outline: 0.14, outlineStyle: "ink", frame: 0.8, frameMat: "iron", glow: 0, shine: 0, border: "ironFrame" , ...GEM_SHAPE , illus: "gemheart" }),
    "sapphire-gold": D_("heartcut", "#06123e", "#2050d8", "#9cc0ff", "#0a0804", { outline: 0.14, outlineStyle: "ink", frame: 0.8, frameMat: "gold", glow: 0, shine: 0, border: "goldFrame" , ...GEM_SHAPE , illus: "gemheart" }),
    "amethyst-silver": D_("heartcut", "#1e0838", "#8a3ad0", "#e0b4ff", "#0a0a0e", { outline: 0.14, outlineStyle: "ink", frame: 0.75, frameMat: "silver", glow: 0, shine: 0, border: "silverFrame" , ...GEM_SHAPE , illus: "gemheart" }),
  },
  armor: {
    galaxy: D_("galaxy", "#18225a", "#5060be", "#bec8ff", "#0a081e"),
    diamond: D_("crystal", "#0b4a5a", "#36d6e7", "#d8fbff", "#04232b", { rimLight: 0.8, glow: 0.2 }),
    iron: D_("metal", "#4a4f57", "#b9c0c8", "#f2f5f8", "#1c1f24", { glow: 0, rimLight: 0.6, round: 0.15 }),
    gold: D_("metal", "#7a4d06", "#e0a92a", "#fff0a0", "#3a2402", { glow: 0, rimLight: 0.6, round: 0.15 }),
    netherite: D_("metal", "#1d1a1f", "#4a4450", "#8d8597", "#09080a", { glow: 0, rimLight: 0.5 }),
    emerald: D_("crystal", "#064a22", "#2fd36e", "#c8ffd9", "#02200e", { rimLight: 0.8, glow: 0.2 }),
    ice: D_("ice", "#1b3a6a", "#8fd0ff", "#e6f7ff", "#0d2240", { rimLight: 0.6 }),
    nebula: D_("nebula", "#2a0b45", "#9a3fd0", "#ffb0f0", "#12041e"),
    hologram: D_("hologram", "#2a1a7a", "#30d5ff", "#ff5cf0", "#0a0628"),
    lava: D_("lava", "#2a0a04", "#ff5a10", "#ffd060", "#120402"),
  },
  bar: {
    galaxy: D_("galaxy", "#0a1e58", "#246ed6", "#6ee8ff", "#060c22"),
    aurora: D_("aurora", "#04122a", "#22e0a0", "#a070ff", "#020a18"),
    classic: D_("glossy", "#1f5a0a", "#6fd12a", "#d2ff8a", "#0c2404", { glow: 0, shine: 0.2, radius: 0.6 }),
    plasma: D_("plasma", "#1a0040", "#ff2fa0", "#ffe14d", "#0a0018"),
    lava: D_("lava", "#2a0a04", "#ff5a10", "#ffd060", "#120402"),
    hologram: D_("hologram", "#2a1a7a", "#30d5ff", "#ff5cf0", "#0a0628"),
    segmented: D_("gradient", "#0a3a6a", "#2aa8ff", "#a8e6ff", "#04182c", { segments: 12, segGap: 0.9, glow: 0.1, radius: 1 }),
    metal: D_("metal", "#3a3f47", "#a9b0b8", "#f2f5f8", "#14161a", { glow: 0, rimLight: 0.5 }),
    nebula: D_("nebula", "#2a0b45", "#9a3fd0", "#ffb0f0", "#12041e"),
    ice: D_("ice", "#1b3a6a", "#8fd0ff", "#e6f7ff", "#0d2240"),
  },
};
function applyElDesign(kind, el, name) {
  for (const k of Object.keys(el)) delete el[k];
  Object.assign(el, clone(EL_DEFAULTS[kind]), clone(EL_DESIGNS[kind][name]), { design: name });
  return el;
}
function elBorderPreset(name) {
  const o = {}; for (const k of EL_BORDER_KEYS) o[k] = clone(EL_COMMON[k]);
  const b = clone(EL_BORDERS[name] || {}); delete b.label;
  return Object.assign(o, b, { border: name });
}

function elPal(el, cols, kind) {
  const deep = unhex(cols.c1), cloud = unhex(cols.c2), bright = unhex(cols.c3);
  return {
    dark: scale3(deep, 0.23), deep, cloud, bright,
    cloud2: [cloud[0] * 0.63, Math.min(1, cloud[1] * 1.15), Math.min(1, cloud[2] * 1.02)],
    tint: [Math.min(1, cloud[0] * 1.5), cloud[1] * 0.5, cloud[2] * 0.6],
    star: kind === "bar" ? rgb(230, 250, 255) : WHITE, starMul: el.stars,
  };
}
const elWorld = (kind, el, x, y) => { const [cx, cy] = ELEM[kind].c; return [cx + (x - cx) * el.size + el.posX, cy + (y - cy) * el.size + el.posY]; };
const elDesign = (kind, el, x, y) => { const [cx, cy] = ELEM[kind].c; return [cx + (x - cx - el.posX) / el.size, cy + (y - cy - el.posY) / el.size]; };

function sdHeartU(px, py) {
  if (py + px > 1) return Math.hypot(px - 0.25, py - 0.75) - Math.SQRT2 / 4;
  const t = 0.5 * Math.max(px + py, 0);
  return Math.sqrt(Math.min(px * px + (py - 1) ** 2, (px - t) ** 2 + (py - t) ** 2)) * Math.sign(px - py);
}
function armorPts(el) {
  return [[-el.shoulder, el.top + 0.5], [-el.neckW, el.top], [0, el.top + el.neckD], [el.neckW, el.top], [el.shoulder, el.top + 0.5],
    [el.sleeve, el.sleeveY], [el.armpit, el.sleeveY + 0.3], [el.waist, el.bottom], [-el.waist, el.bottom], [-el.armpit, el.sleeveY + 0.3], [-el.sleeve, el.sleeveY]];
}
/* the element's slider shape in centred, untransformed coordinates (negative = inside) */
function baseShape(kind, el) {
  if (kind === "heart") {
    const K = 7 * (1 - el.round * 0.1);
    return (lx, ly) => {
      const px = Math.abs(lx / el.w) / K; let py = (3.86 - ly / el.h) / K;
      if (py < 0.55) py = 0.55 + (py - 0.55) / el.tip;
      const d = sdHeartU(px, py) + el.cleft * 0.12 * Math.exp(-((px / 0.16) ** 2)) * sstep(0.55, 0.95, py);
      return d * K - el.round * 0.45;
    };
  }
  if (kind === "armor") { const pts = armorPts(el); return (lx, ly) => sdPolygon(lx, ly, pts) - 0.15 - el.round; }
  return (lx, ly) => {
    const hh = Math.max(0.3, el.barH / 2 * (1 + el.taper * lx / 91)), x = lx + el.slant * ly;
    let d = sdBox(x, ly, 0, 0, 91, hh, Math.min(el.radius, hh));
    if (el.segments > 1) { const sw = 182 / el.segments, m = ((x + 91) % sw + sw) % sw - sw / 2; d = Math.max(d, Math.abs(m) - (sw / 2 - el.segGap / 2)); }
    return d;
  };
}
function radialPoly(f, ox, oy, n, R) {
  const pts = [];
  for (let k = 0; k < n; k++) {
    const th = TAU * k / n - Math.PI / 2, c = Math.cos(th), s = Math.sin(th);
    let lo = 0, hi = R;
    for (let it = 0; it < 28; it++) { const m = (lo + hi) / 2; if (f(ox + m * c, oy + m * s) < 0) lo = m; else hi = m; }
    pts.push([ox + lo * c, oy + lo * s]);
  }
  return pts;
}
function catmull(P, s) {
  const n = P.length, out = [];
  for (let i = 0; i < n; i++) {
    const p0 = P[(i - 1 + n) % n], p1 = P[i], p2 = P[(i + 1) % n], p3 = P[(i + 2) % n];
    for (let k = 0; k < 12; k++) {
      const t = k / 12, t2 = t * t, t3 = t2 * t, pt = [0, 0];
      for (let c = 0; c < 2; c++) {
        const cat = 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3);
        pt[c] = lerp(p1[c] + (p2[c] - p1[c]) * t, cat, s);
      }
      out.push(pt);
    }
  }
  return out;
}
function polyFn(poly) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of poly) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return (X, Y) => (X < x0 - 1.5 || X > x1 + 1.5 || Y < y0 - 1.5 || Y > y1 + 1.5)
    ? Math.hypot(Math.max(x0 - X, 0, X - x1), Math.max(y0 - Y, 0, Y - y1)) : sdPolygon(X, Y, poly);
}
function makeShape(kind, el, drop = 0) {
  const [cx, cy] = ELEM[kind].c, ca = Math.cos(el.tilt), sa = Math.sin(el.tilt);
  if (kind !== "bar" && el.custom && el.points && el.points.length >= 3)
    return polyFn(catmull(el.points, el.smooth).map(([x, y]) => { const w = elWorld(kind, el, x, y); return [w[0], w[1] + drop * el.size]; }));
  const base = baseShape(kind, el);
  const f = (X, Y) => { const x = (X - cx - el.posX) / el.size, y = (Y - cy - el.posY - drop) / el.size; return base(x * ca + y * sa, -x * sa + y * ca) * el.size; };
  if (kind !== "bar" && el.facets >= 3) return polyFn(radialPoly(f, cx + el.posX, cy + el.posY + drop, el.facets, ELEM[kind].R * el.size));
  return f;
}
function elSamplePoints(kind, el, n) {
  const plain = Object.assign(clone(el), { custom: false, facets: 0, posX: 0, posY: 0, size: 1 });
  const [cx, cy] = ELEM[kind].c;
  return radialPoly(makeShape(kind, plain), cx, cy, n, ELEM[kind].R).map(([x, y]) => [+x.toFixed(3), +y.toFixed(3)]);
}

const GALAXY_TEX = { galaxy: 1, nebula: 1, starfield: 1 };
function galaxyOpts(kind, el, tex, seed) {
  const k = 1 / el.texScale;
  const o = kind === "bar" ? { scale: [2.8125 * k, 12 * k], drift: [el.flow === false ? 0 : 1, 0], dens: 0.05, big: 0.004 } : { scale: [12 * k, 12 * k], drift: [1, 1], dens: 0.09, big: 0.012 };
  if (tex === "nebula") o.starMul = 0;
  if (tex === "starfield") { o.neb = 0.25; o.dens *= 3; o.big *= 2; }
  o.wander = el.motion === "random"; o.shoot = o.wander ? (el.shoot ?? 2) : 0;
  o.seed = seed; return o;
}
const gemCache = new WeakMap();
function texColor(tex, q) {
  const { X, Y, t, P, el } = q, k = 1 / el.texScale, u = q.ex * k, v = q.ey * k, ph = TAU * t;
  switch (tex) {
    case "galaxy": case "nebula": case "starfield": return q.fv;
    case "aurora": {
      const w = Math.sin(v * 1.6 + 1.4 * fbm(q.seed, u * 0.6 + 7, v * 0.6) + ph), w2 = Math.sin(v * 2.3 - u * 0.25 + ph * 2 + 1.3);
      let c = mixc(P.dark, P.deep, sat(0.5 + v / 6));
      c = mixc(c, P.cloud, sstep(0.2, 0.95, w) * 0.85); return mixc(c, P.bright, sstep(0.55, 1, w2) * 0.65);
    }
    case "crystal": {
      const [f1, f2, hid] = voronoi(u / 1.1, v / 1.1, q.seed + 3), sh = 0.5 + 0.5 * Math.sin(TAU * (hid + t));
      let c = mixc(P.deep, P.cloud, hid * 0.8 + 0.1); c = mixc(c, P.bright, sh * 0.45);
      return mixc(c, mixc(P.bright, WHITE, 0.5), sstep(0.12, 0.02, (f2 - f1) * 1.1) * 0.8);
    }
    case "glossy": { const c = mixc(P.bright, P.deep, sat(0.5 + v / 4.5)); return mixc(c, mixc(P.bright, WHITE, 0.3), sat(1 - Math.abs(v + 1.4) / 0.9) * 0.4); }
    case "solid": return P.cloud;
    case "gradient": return mixc(mixc(P.bright, P.cloud, 0.3), P.deep, sat(0.5 + ((q.kind === "bar" ? 0 : u * 0.25) + v) / (q.kind === "bar" ? 3 : 5)));
    case "metal": {
      const br = samp(T[2], X * 1.5, Y * 40) * 0.08, span = q.kind === "bar" ? 220 : 16;
      let c = mixc(P.deep, P.bright, sat(0.55 - v / 5 + br));
      const sw = ((q.kind === "bar" ? u : u + v * 0.6) - (t * span - span / 2)) / (q.kind === "bar" ? 6 : 0.8), sweep = Math.exp(-(sw * sw));
      return mixc(c, WHITE, sweep * 0.55);
    }
    case "lava": {
      const e = Math.cos(ph) * fbm(q.seed + 4, u * 4.5, v * 4.5) + Math.sin(ph) * fbm(q.seed + 5, u * 4.5 + 40, v * 4.5 + 9), lv = Math.abs(e);
      let c = mixc(P.dark, P.deep, 0.6); c = mixc(c, P.cloud, sstep(0.6, 0.1, lv) * 0.8); return mixc(c, P.bright, sstep(0.16, 0.04, lv));
    }
    case "ice": {
      const [f1, f2, hid] = voronoi(u / 1.3 + 3, v / 1.3, q.seed + 8);
      let c = mixc(P.cloud, P.bright, 0.4 + 0.4 * hid); c = mixc(c, WHITE, sstep(0.08, 0.01, (f2 - f1) * 1.3) * 0.7);
      c = mixc(c, WHITE, Math.max(0, Math.sin(TAU * (t * 2 + hid * 3))) ** 12 * 0.5 * sstep(0.3, 0.1, f1));
      return mixc(c, P.deep, sat(v / 6 + 0.2) * 0.4);
    }
    case "marble": {
      const e = Math.cos(ph) * fbm(q.seed + 1, u * 1.5, v * 1.5) + Math.sin(ph) * fbm(q.seed + 2, u * 1.5 + 30, v * 1.5 + 8);
      const m = Math.abs(Math.sin((u + v * 0.7) * 1.2 + e * 3));
      return mixc(mixc(P.bright, P.cloud, 0.25), P.deep, sstep(0.18, 0.02, m) * 0.85);
    }
    case "hologram": {
      const hp = (u * 0.25 + v * 0.35 + t) * TAU, r = 0.5 + 0.5 * Math.sin(hp), g = 0.5 + 0.5 * Math.sin(hp + 2.1);
      return scale3(mixc(mixc(P.deep, P.cloud, r), P.bright, g * 0.6), 0.86 + 0.14 * Math.sin(Y * TAU * 2));
    }
    case "heartcut": {                                     // big triangular facets fanning to the outline's corners
      const pts = el.custom && el.points && el.points.length >= 3 ? el.points : GEM_HEART;
      let cache = gemCache.get(pts);
      if (!cache) {
        const [ccx, ccy] = ELEM[q.kind].c, fc = [0, 0.45];
        const vs = pts.filter((_, m) => pts.length < 12 || m % 2 === 0).map(([x, y]) => { const vx = x - ccx - fc[0], vy = y - ccy - fc[1]; return { a: Math.atan2(vy, vx), r: Math.hypot(vx, vy) }; }).sort((m, n) => m.a - n.a);
        cache = { fc, vs }; gemCache.set(pts, cache);
      }
      const { fc, vs } = cache, px = q.ex - fc[0], py = q.ey - fc[1], ang = Math.atan2(py, px), r = Math.hypot(px, py);
      let i0 = vs.length - 1; for (let m = 0; m < vs.length; m++) if (vs[m].a <= ang) i0 = m;
      const A = vs[i0], B = vs[(i0 + 1) % vs.length];
      let span = B.a - A.a; if (span <= 0) span += TAU; let w = ang - A.a; if (w < 0) w += TAU; w = sat(w / span);
      const rEdge = lerp(A.r, B.r, w) * 0.97, rp = r / Math.max(rEdge, 0.1), inner = rp < 0.5;
      const mid = A.a + span / 2, la = el.light * Math.PI / 180, h = fract(Math.sin((i0 + (inner ? 31 : 0)) * 78.233) * 43758.5);
      // inner facets are split along the spoke to the middle of the edge, outer facets tilt outward
      const sideW = w < 0.5 ? -0.35 : 0.35;
      const shade = sat(0.44 + (inner ? 0.38 : 0.58) * Math.cos(mid + (inner ? sideW : 0) - la) + 0.2 * (h - 0.5) + (rp - 0.5) * 0.18);
      let c = shade < 0.5 ? mixc(P.deep, P.cloud, shade * 2) : mixc(P.cloud, P.bright, (shade - 0.5) * 2);
      const spoke = Math.min(w, 1 - w) * span * r, seam = Math.abs(w - 0.5) * span * r;
      const lines = Math.max(sstep(0.04, 0, spoke), sstep(0.04, 0, Math.abs(rp - 0.5) * rEdge));
      c = mixc(c, mixc(P.bright, WHITE, 0.2), lines * 0.18);
      c = mixc(c, WHITE, sat(shade - 0.86) * 2.2);                                        // glint on the brightest facets
      return mixc(c, WHITE, Math.max(0, Math.sin(TAU * (t + h))) ** 20 * 0.4);
    }
    case "gem": {                                          // brilliant cut: 10-sided table, then two rings of offset facets
      const r = Math.hypot(u, v), ang = Math.atan2(v, u), n = 10, step = TAU / n, la = el.light * Math.PI / 180;
      const R0 = q.kind === "bar" ? 2.2 : 3.6;
      const sidA = Math.floor((ang + Math.PI) / step), acA = (sidA + 0.5) * step - Math.PI;
      const rp = r * Math.cos(ang - acA) / R0;                           // distance to the table's flat sides
      const ring = rp < 0.26 ? 0 : rp < 0.58 ? 1 : 2;
      const off = ring === 1 ? 0.5 : 0, sid = Math.floor((ang + Math.PI) / step + off), ac = (sid + 0.5 - off) * step - Math.PI;
      const h = fract(Math.sin(sid * 91.7 + ring * 13.3) * 4375.85);
      const tilt = ring === 0 ? 0 : ring === 1 ? 0.5 : 0.85;
      const shade = sat(0.5 + tilt * 0.5 * Math.cos(ac - la) + 0.22 * (h - 0.5) + (ring === 0 ? 0.12 : 0));
      let c = shade < 0.5 ? mixc(P.deep, P.cloud, shade * 2) : mixc(P.cloud, P.bright, (shade - 0.5) * 2);
      const e1 = Math.abs(fract((ang + Math.PI) / step + off) - 0.5) * 2;
      const line = Math.max(ring ? sstep(0.92, 0.99, e1) : 0, sstep(0.025, 0, Math.min(Math.abs(rp - 0.26), Math.abs(rp - 0.58))));
      c = mixc(c, mixc(P.bright, WHITE, 0.45), line * 0.55);
      c = mixc(c, WHITE, Math.max(0, Math.sin(TAU * (t + h))) ** 18 * 0.55);
      return c;
    }
    case "plasma": {
      const a = Math.sin(u * 1.3 + ph) + Math.sin(v * 1.7 - ph) + Math.sin((u + v) * 0.9 + ph * 2) + Math.sin(Math.hypot(u, v) * 1.5 - ph);
      const w = 0.5 + 0.5 * Math.sin(a * 1.4); return mixc(mixc(P.deep, P.cloud, sat(w * 2)), P.bright, sat(w * 2 - 1));
    }
  }
  return P.cloud;
}

/* mode: full | half | container | empty | fill | bg */
function elementIcon(kind, S, el, cols, t = 0, mode = "full", flash = false, seed = 0) {
  if (el.uiStyle && typeof UI_STYLES !== "undefined" && UI_STYLES[el.uiStyle]) return UI_STYLES[el.uiStyle](kind, S, el, cols, t, mode, flash, seed);
  if (kind === "heart" && el.illus === "gemheart") return gemHeartIcon(S, el, cols, t, mode, flash, seed);
  const E = ELEM[kind], W = Math.round(E.w * S), H = Math.round(E.h * S), n = W * H, cov = covf(S);
  const P = elPal(el, cols, kind), [cx, cy] = E.c, ox = cx + el.posX, oy = cy + el.posY;
  const thick = kind === "bar" ? 0 : el.thick;
  const fTop = makeShape(kind, el, 0), fSide = thick > 0 ? makeShape(kind, el, thick) : null;
  const D = new Float32Array(n), DS = fSide ? new Float32Array(n) : null;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const X = (i + 0.5) / S, Y = (j + 0.5) / S, k = j * W + i;
    D[k] = fTop(X, Y); if (DS) DS[k] = fSide(X, Y);
  }
  const finish = (G, drop) => {                       // normalise to a distance, then roughen the edge
    const F = Float32Array.from(G);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const k = j * W + i;
      const gx = (F[j * W + Math.min(i + 1, W - 1)] - F[j * W + Math.max(i - 1, 0)]) * S / ((i > 0 && i < W - 1) ? 2 : 1);
      const gy = (F[Math.min(j + 1, H - 1) * W + i] - F[Math.max(j - 1, 0) * W + i]) * S / ((j > 0 && j < H - 1) ? 2 : 1);
      let d = F[k] / Math.max(Math.hypot(gx, gy), 0.2);
      const X = (i + 0.5) / S, Yr = (j + 0.5) / S - drop, [ra, rf] = el.rough;
      if (ra) { d += ra * samp(T[4], X * rf + 3, Yr * rf); if (rf <= 5) d += ra * 0.35 * samp(T[2], X * rf * 3, Yr * rf * 3); }
      if (el.wave[0]) {
        const ph = kind === "bar" ? X * el.wave[1] * 0.25 : Math.atan2(Yr - oy, X - ox) * el.wave[1], sn = Math.sin(ph);
        d += el.waveType === "scallop" ? -el.wave[0] * (Math.abs(Math.sin(ph / 2)) * 2 - 1)
          : el.waveType === "spike" ? -el.wave[0] * (2.4 * (1 - Math.abs(Math.sin(ph / 2))) ** 3 - 0.6) : el.wave[0] * sn;
      }
      G[k] = d;
    }
  };
  finish(D, 0); if (DS) finish(DS, thick * el.size);
  let hcFrame = null;
  if (kind === "heart" && el.hcMark) {
    let x0 = 99, x1 = -99, y0 = 99, y1 = -99;
    for (let j = 0; j < H; j += 2) for (let i = 0; i < W; i += 2) if (D[j * W + i] < 0) {
      const lx = ((i + 0.5) / S - ox) / el.size, ly = ((j + 0.5) / S - oy) / el.size;
      if (lx < x0) x0 = lx; if (lx > x1) x1 = lx; if (ly < y0) y0 = ly; if (ly > y1) y1 = ly;
    }
    hcFrame = { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 };
  }

  const live = mode === "full" || mode === "half" || mode === "fill";
  const tt = live ? t : 0, tex = el.texture;
  const field = GALAXY_TEX[tex] && mode !== "bg" && mode !== "empty" ? starfield(S, E.w, E.h, tt, P, galaxyOpts(kind, el, tex, seed)) : null;
  const bgField = mode === "bg" ? starfield(S, E.w, E.h, 0, P, { seed: seed + 3, scale: [4, 12] }) : null;
  const ca = Math.cos(el.tilt), sa = Math.sin(el.tilt), lc = Math.cos(el.light * Math.PI / 180), ls = Math.sin(el.light * Math.PI / 180);
  const ow = el.outline, outCol = unhex(el.outlineCol), R = kind === "bar" ? 2.5 : 4, img = newImg(S, E.w, E.h);
  const emptyC = el.emptyCol ? unhex(el.emptyCol) : [0, 0, 0], bgC = el.bgCol ? unhex(el.bgCol) : [0, 0, 0];
  const q = { kind, el, P, t: el.motion === "random" ? randWarp(tt, seed + 17) : tt, seed, fv: null, X: 0, Y: 0, ex: 0, ey: 0 };
  const deco = mode !== "bg" && mode !== "empty";
  const glowC = el.glowCol === "white" ? WHITE : el.glowCol === "outline" ? outCol : P.bright;
  const stickerC = mixc(WHITE, P.bright, 0.1), dsx = Math.round(0.45 * S), dsy = Math.round(0.55 * S);
  const softA = d => el.feather > 0 ? sat(0.5 - d / el.feather) : cov(d);
  const outStyle = (X, Y, facing, base) => {                      // outline colour for each outline style
    switch (el.outlineStyle) {
      case "light": return mixc(P.bright, WHITE, 0.25);
      case "ink": return rgb(8, 6, 10);
      case "frost": return mixc(rgb(225, 245, 255), WHITE, sat(facing));
      case "gradient": return mixc(scale3(base, 0.5), mixc(base, P.bright, 0.6), sat(0.5 + facing * 0.7));
      case "gold": { const b = sat(0.5 + facing * 0.6 + 0.25 * Math.sin((X + Y) * 3)); return mixc(rgb(120, 70, 12), rgb(255, 226, 130), b); }
      case "silver": { const b = sat(0.5 + facing * 0.6 + 0.25 * Math.sin((X + Y) * 3)); return mixc(rgb(90, 92, 110), rgb(245, 247, 255), b); }
      case "rainbow": { const hh = (Math.atan2(Y - oy, X - ox) / TAU + 1) % 1;
        return [0.5 + 0.5 * Math.cos(TAU * hh), 0.5 + 0.5 * Math.cos(TAU * (hh - 1 / 3)), 0.5 + 0.5 * Math.cos(TAU * (hh - 2 / 3))]; }
    }
    return base;
  };
  /* thick framed bezel cut into the edge (stone, iron, gold...), lit like a raised ridge */
  const FRAME = { stone: [rgb(66, 63, 62), rgb(156, 150, 144)], iron: [rgb(52, 56, 64), rgb(168, 174, 186)], gold: [rgb(128, 82, 16), rgb(255, 222, 120)],
    bronze: [rgb(92, 50, 22), rgb(214, 148, 86)], silver: [rgb(112, 114, 128), rgb(240, 243, 250)], obsidian: [rgb(14, 10, 22), rgb(84, 66, 112)] };
  const applyFrame = (g, u, X, Y, i, j, dim) => {
    const fw = el.frame, fl = el.frameLight ?? 0;
    if (u > fw) return scale3(g, 1 - 0.45 * fl * Math.exp(-(u - fw) / 0.28));         // the frame's shadow on the inside
    const gx = (D[j * W + Math.min(i + 1, W - 1)] - D[j * W + Math.max(i - 1, 0)]) * S / 2;
    const gy = (D[Math.min(j + 1, H - 1) * W + i] - D[Math.max(j - 1, 0) * W + i]) * S / 2;
    const nf = gx * lc + gy * ls, tq = sat(u / fw), ridge = Math.cos(Math.PI * tq);
    const [lo, hi] = FRAME[el.frameMat] || FRAME.stone;
    let tone = 0.5;
    if (el.frameMat === "stone") tone = 0.45 + 0.45 * fbm(seed + 9, X * 7, Y * 7) + 0.2 * samp(T[1], X * 40, Y * 40) - 0.45 * sstep(1.2, 1.7, samp(T[3], X * 26, Y * 26));
    else if (el.frameMat === "iron" || el.frameMat === "silver") tone = 0.5 + 0.12 * samp(T[2], X * 25, Y * 3) + 0.08 * samp(T[4], X * 12, Y * 12);
    else if (el.frameMat === "obsidian") tone = 0.35 + 0.15 * fbm(seed + 3, X * 5, Y * 5);
    else tone = 0.55 + 0.1 * samp(T[1], X * 6, Y * 6);
    let m = mixc(lo, hi, sat(tone));
    const flat = el.frameMat === "stone";
    // stone: a flat, evenly lit face with lit/shaded chamfers only near its two edges; metals: a rounded, shiny ridge
    const chamfer = flat ? Math.max(sstep(0.3, 0, tq), sstep(0.7, 1, tq)) : 1;
    m = scale3(m, Math.max(0.3, Math.min(1.9, 1 + fl * ((flat ? 0.65 : 0.8) * nf * ridge * chamfer + (flat ? 0.08 : 0)))));
    m = mixc(m, WHITE, sat(nf * ridge * chamfer - 0.5) * (flat ? 0.3 : 0.7) * fl);                  // glint on the lit bevel
    if (el.frameMat === "stone") m = mixc(m, scale3(lo, 0.35), sstep(0.07, 0.0, Math.abs(fbm(seed + 21, X * 5, Y * 5))) * 0.85); // cracks
    m = mixc(m, scale3(lo, 0.3), cov(Math.abs(u - fw) - 0.08));                          // dark lip around the inside
    if (dim) m = scale3(m, 0.65);
    return mixc(g, m, cov(u - fw));
  };
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const k = j * W + i, d = D[k], ds = DS ? DS[k] : Infinity, body = Math.min(d, ds);
    const X = (i + 0.5) / S, Y = (j + 0.5) / S;
    let a = softA(body);
    // decorations outside the shape: sticker edge, outer ring, glow, drop shadow
    let oa = 0, oc = [0, 0, 0];
    if (deco && a < 1) {
      const add = (col, al) => { if (al <= 0) return; const na = oa + al * (1 - oa); oc = mixc(col, oc, oa * (1 - al) / Math.max(na, 1e-6) ); oa = na; };
      if (el.sticker > 0) add(stickerC, cov(body - el.sticker));
      if (el.ring > 0) add(outStyle(X, Y, 0, outCol), cov(Math.abs(body - el.ring - 0.12) - 0.12));
      if (el.glowOut > 0 && body > 0) add(glowC, el.glowOut * 0.75 * Math.exp(-body / 0.5));
      if (el.drop > 0 && i >= dsx && j >= dsy) {
        const kb = (j - dsy) * W + (i - dsx); add(rgb(8, 4, 12), el.drop * 0.6 * sat(0.5 - Math.min(D[kb], DS ? DS[kb] : Infinity) / 0.45));
      }
      if (mode === "half") oa *= cov(X - ox);
      oa *= sstep(0, 0.9, Math.min(X, Y, E.w - X, E.h - Y));     // fade out before the edge of the icon slot
    }
    if (a <= 0 && oa <= 0) continue;
    if (a <= 0) { setPx(img, k, oa, oc); continue; }
    const inner = el.feather > 0 && ow === 0 ? 1 : cov(body + ow);
    let c;
    if (mode === "bg") {
      const f = 1 - 0.35 * sat((2.6 - Y) / 2);
      c = mixc(scale3(bgC, 0.25), [(bgField[k * 3] * 0.2 + bgC[0]) * f, (bgField[k * 3 + 1] * 0.2 + bgC[1]) * f, (bgField[k * 3 + 2] * 0.2 + bgC[2]) * f], inner);
    } else if (mode === "empty") {
      c = mixc(scale3(emptyC, 0.25), emptyC, inner);
    } else {
      const x = (X - ox) / el.size, y = (Y - oy) / el.size;
      q.X = X; q.Y = Y; q.ex = x * ca + y * sa; q.ey = -x * sa + y * ca;
      if (field) q.fv = [field[k * 3], field[k * 3 + 1], field[k * 3 + 2]];
      let g = mixc(P.cloud, texColor(tex, q), el.texStrength);
      if (mode === "container") {
        g = [g[0] * 0.22 + emptyC[0], g[1] * 0.22 + emptyC[1], g[2] * 0.22 + emptyC[2]];
      } else {
        const inr = Math.max(-d - ow, 0);
        g = scale3(g, 1 - el.shade * 0.3 * (1 - sstep(0, 1.5, inr)));
        const gl = Math.exp(-inr / 0.3) * el.glow; g = [g[0] + P.cloud[0] * gl, g[1] + P.cloud[1] * gl, g[2] + P.cloud[2] * gl];
        if (el.falloff) g = scale3(g, 1 + el.falloff * 0.3 * (0.5 - sat((-((X - ox) * lc + (Y - oy) * ls) + R) / (2 * R))) * 2);
        if (el.rimLight || el.rimShadow) {
          const gx = (D[j * W + Math.min(i + 1, W - 1)] - D[j * W + Math.max(i - 1, 0)]) * S / 2;
          const gy = (D[Math.min(j + 1, H - 1) * W + i] - D[Math.max(j - 1, 0) * W + i]) * S / 2;
          const facing = gx * lc + gy * ls, edge = sstep(-1.0, -0.3, d);
          g = mixc(g, mixc(P.bright, WHITE, 0.3), sat(edge * sstep(0.2, 0.7, facing) * 0.6 * el.rimLight));
          g = mixc(g, P.dark, sat(edge * sstep(0.2, 0.7, -facing) * 0.5 * el.rimShadow));
        }
        if (el.shine > 0) {
          if (kind === "bar") g = mixc(g, WHITE, el.shine * Math.exp(-(((Y - oy - el.shineY) / (0.4 * el.shineSize)) ** 2)));
          else {
            const s = el.size * el.shineSize, sh = sdEllipse(X, Y, ox + el.shineX * el.size, oy + el.shineY * el.size, 0.9 * s, 0.42 * s, -0.7);
            g = mixc(g, WHITE, sat(-sh / 0.5) * el.shine);
          }
        }
        if (el.bevel) {                                       // raised (+) or inset (-) bevel band inside the edge
          const gx = (D[j * W + Math.min(i + 1, W - 1)] - D[j * W + Math.max(i - 1, 0)]) * S / 2;
          const gy = (D[Math.min(j + 1, H - 1) * W + i] - D[Math.max(j - 1, 0) * W + i]) * S / 2;
          const band = 1 - sstep(0, 0.55, -d - ow), f = (gx * lc + gy * ls) * Math.sign(el.bevel);
          g = mixc(g, mixc(P.bright, WHITE, 0.4), sat(band * sstep(0, 0.6, f) * Math.abs(el.bevel) * 0.7));
          g = mixc(g, scale3(P.dark, 0.6), sat(band * sstep(0, 0.6, -f) * Math.abs(el.bevel) * 0.6));
        }
        if (el.stitch > 0) {                                   // dashed stitching just inside the edge
          const ang = kind === "bar" ? X * 0.5 : Math.atan2(Y - oy, X - ox) * el.stitch;
          g = mixc(g, mixc(P.bright, WHITE, 0.5), cov(Math.abs(d + ow + 0.32) - 0.06) * sstep(0.1, 0.4, Math.sin(ang)) * 0.9);
        }
        if (el.frame > 0) g = applyFrame(g, -body, X, Y, i, j, false);
        if (DS && d >= 0) g = mixc(scale3(P.deep, 0.75), scale3(P.dark, 0.9), sat((X - ox + 4) / 8));
        if (DS) g = mixc(g, scale3(P.dark, 0.6), cov(Math.abs(d) - 0.07) * (ds < 0 ? 1 : 0));
        if (kind === "heart" && el.hcMark) g = hardcoreMark(g, q.ex, q.ey, P, S * el.size, GALAXY_TEX[tex] || tex === "aurora" || tex === "plasma", hcFrame);
        if (flash) g = mixc(g, WHITE, 0.4);
      }
      if (mode === "container" && el.frame > 0) g = applyFrame(g, -body, X, Y, i, j, true);
      if (el.double && mode !== "container") g = mixc(g, mixc(P.bright, WHITE, 0.2), cov(Math.abs(body + ow + 0.12) - 0.05) * 0.85);
      let out = flash ? rgb(250, 244, 255) : mode === "container" ? unhex(el.emptyOutline || "#040208") : outCol;
      if (!flash && mode !== "container" && el.outlineStyle !== "solid") {
        const gx = (D[j * W + Math.min(i + 1, W - 1)] - D[j * W + Math.max(i - 1, 0)]) * S / 2;
        const gy = (D[Math.min(j + 1, H - 1) * W + i] - D[Math.max(j - 1, 0) * W + i]) * S / 2;
        out = outStyle(X, Y, gx * lc + gy * ls, outCol);
      }
      if (el.dash > 0 && mode !== "container") {             // two-tone dashed rim
        const ang = kind === "bar" ? X * 0.6 : Math.atan2(Y - oy, X - ox) * el.dash;
        out = mixc(out, mixc(P.bright, WHITE, 0.35), sstep(-0.12, 0.12, Math.sin(ang)));
      }
      c = mixc(out, g, inner);
    }
    if (mode === "half") a *= cov(X - ox);
    if (oa > 0) { const A = a + oa * (1 - a), w = oa * (1 - a); c = [(c[0] * a + oc[0] * w) / A, (c[1] * a + oc[1] * w) / A, (c[2] * a + oc[2] * w) / A]; a = A; }
    setPx(img, k, a, c);
  }
  return toRGBA(img);
}
