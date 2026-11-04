/* =====================================================================
   Steak
   ===================================================================== */
const DESIGNS = {
  "grill": { b: "rough", lump: [0, 1.6], arch: 0.25, lift: 0.75, dip: 0.5 },
  "crosshatch": { b: "thick" }, "wide-grill": { b: "lumpy" }, "thin-grill": { b: "thin" },
  "speckle": { b: "soft" }, "chunky": { b: "faceted" }, "grain": { b: "jagged" },
  "charred": { b: "double" }, "char-edges": { b: "wavy" }, "seared": { b: "slab" },
  "bubbly": { b: "thin", lump: [0.3, 2.2] }, "crust": { b: "jagged", outline: 0.55 },
  "caramelized": { b: "soft", lump: [0.32, 2.4] }, "juicy": { b: "double", outline: 0.5, rough: [0.03, 3] },
  "blotchy": { b: "faceted", facets: 9, outline: 0.55 }, "well-done": { b: "slab", outline: 0.55, lump: [0.3, 2.4] },
  "plain": { b: "wavy", wave: [0.18, 8] }, "pan-lines": { b: "thin", facets: 18, rough: [0, 0] },
  "grill-char": { b: "jagged", rough: [0.16, 6], thick: 0.9 }, "cel-shaded": { b: "thick", double: true, rough: [0.03, 3] },
};
const BORDERS = {
  rough: {}, thick: { outline: 0.6, rough: [0.08, 4] }, thin: { outline: 0.22, rough: [0.08, 4] },
  lumpy: { lump: [0.38, 2.6], rough: [0.06, 4] }, jagged: { rough: [0.11, 8] }, faceted: { facets: 13, rough: [0, 0] },
  wavy: { wave: [0.12, 14], rough: [0.04, 4] }, double: { double: true, rough: [0.08, 4] },
  soft: { outline: 0.3, outlineCol: "#3c1a0e", rough: [0.05, 3] }, slab: { thick: 1.15, rough: [0.1, 4] },
};
const clone = o => JSON.parse(JSON.stringify(o));
/* Realistic textures: bump-lit seared crust, browning, cooked fat marbling, scorched grill marks, juice. */
const REAL = {
  "real-seared":     { label: "Pan-seared", pebble: 1.0, golden: 0.7, marble: 0.35, char: 0.1, wet: 0.6 },
  "real-grilled":    { label: "Grilled", pebble: 0.9, golden: 0.55, marble: 0.25, char: 0.15, wet: 0.5, grill: [-2.4, -0.8, 0.8, 2.4] },
  "real-crosshatch": { label: "Grill crosshatch", pebble: 0.9, golden: 0.5, marble: 0.25, wet: 0.5, grill: [-2.4, -0.8, 0.8, 2.4], cross: true },
  "real-ribeye":     { label: "Ribeye", pebble: 0.9, golden: 0.6, marble: 1.0, char: 0.1, wet: 0.7 },
  "real-charcoal":   { label: "Charcoal", pebble: 1.2, golden: 0.3, marble: 0.2, char: 0.85, darker: 0.15, wet: 0.35, grill: [-1.6, 0, 1.6] },
  "real-cast-iron":  { label: "Cast-iron", pebble: 1.3, golden: 0.2, darker: 0.3, marble: 0.15, wet: 1.0 },
  "real-flank":      { label: "Flank", pebble: 0.6, grain: 1.0, golden: 0.5, marble: 0.05, wet: 0.4, grill: [-2, 0, 2], slant: -0.9 },
  "real-wagyu":      { label: "Wagyu", pebble: 0.8, golden: 0.75, marble: 1.4, fine: true, wet: 0.7 },
};
{
  const realBorder = { b: "thin", outline: 0.3, outlineCol: "#1a0a04", rough: [0.06, 4] };
  const extra = { "real-ribeye": { p: 2.0, lump: [0.25, 2.2] }, "real-flank": { rx: 4.2, ry: 1.7, angle: -0.55 }, "real-wagyu": { p: 2.2 }, "real-cast-iron": { thick: 0.85 } };
  const realDesigns = {};
  for (const n of Object.keys(REAL)) realDesigns[n] = Object.assign({}, realBorder, extra[n] || {});
  const cartoon = Object.assign({}, DESIGNS);
  for (const k of Object.keys(DESIGNS)) delete DESIGNS[k];
  Object.assign(DESIGNS, realDesigns, cartoon);
}
const REAL_TEXTURES = Object.keys(REAL);
const TEXTURES = Object.keys(DESIGNS).filter(n => !REAL[n]);
const texLabel = n => n === "smooth-grilled" ? "Smooth grilled" : n === "smooth-bean" ? "Smooth" : n === "photo-real" ? "Photo-real ribeye" : n === "photo-grilled" ? "Photo-real grilled" : REAL[n] ? REAL[n].label : n;
const BORDER_NAMES = { rough: "Rough", thick: "Thick line", thin: "Thin line", lumpy: "Lumpy", jagged: "Jagged", faceted: "Faceted",
  wavy: "Wavy", double: "Double line", soft: "Soft brown", slab: "Thick slab" };
const SHAPE_BASE = { texture: "grill", border: "rough", rough: [0.13, 4], lump: [0.16, 1.6], wave: [0, 0], facets: 0, outline: 0.42,
  outlineCol: "#120703", double: false, thick: 0.65, lift: 0, arch: 0, dip: 0, dipX: 0.15, dipW: 0.55,
  rx: 3.95, ry: 2.2, p: 2.4, angle: -0.5, texStrength: 1, texScale: 1, burnW: 1, burnAng: 0,
  posX: 0, posY: 0, size: 1, bend: 0, taper: 0, liftL: 0, bulge: 0, dipB: 0, dipBX: 0, dipBW: 0.6,
  custom: false, points: [], smooth: 0.85, rotate: 0, shadow: 0.5, edgeHi: 0.6, smoothGrill: false,
  burnCount: 0, burnSpacing: 1, burnOffset: 0, burnHalo: 1, cross: false,
  light: 225, shade: 1, rimLight: 1, rimShadow: 1, shine: 0, shineSize: 1, shineX: -1.8 };
const BORDER_KEYS = ["rough", "lump", "wave", "facets", "outline", "outlineCol", "double", "thick"];
function borderPreset(b) {
  const o = {}; for (const k of BORDER_KEYS) o[k] = clone(SHAPE_BASE[k]);
  return Object.assign(o, clone(BORDERS[b] || {}), { border: b });
}
function designShape(name) {
  const d = clone(DESIGNS[name]), sh = Object.assign(clone(SHAPE_BASE), borderPreset(d.b));
  delete d.b; return Object.assign(sh, d, { texture: name });
}

/* Slider shape: a superellipse slab, bent, tapered, lifted and dented by the sliders.
   Works in "design space"; position and size are applied around it. */
function shapeLocal(sh, Xd, Yd, drop) {
  const ca = Math.cos(sh.angle), sa = Math.sin(sh.angle), rx = sh.rx, ry = sh.ry, p = sh.p;
  const dx = Xd - 4.5, dy = Yd - (4.2 + drop);
  const ex = dx * ca + dy * sa, u = ex / rx;
  let ey = -dx * sa + dy * ca;
  ey += sh.lift * Math.max(u, 0) ** 2 + sh.liftL * Math.max(-u, 0) ** 2 + sh.bend * (u * u - 0.35);
  const lump = sh.lump[0] * Math.sin(ex * sh.lump[1] + 0.4);
  let ry_ = ey < 0 ? ry + sh.arch + lump : ry + sh.bulge + lump * 0.5;
  ry_ *= 1 + sh.taper * Math.max(-1, Math.min(1, u));
  if (ey < 0 && sh.dip) ry_ -= sh.dip * Math.exp(-(((ex - sh.dipX) / sh.dipW) ** 2));
  if (ey >= 0 && sh.dipB) ry_ -= sh.dipB * Math.exp(-(((ex - sh.dipBX) / sh.dipBW) ** 2));
  ry_ = Math.max(ry_, 0.15);
  return [Math.pow(Math.abs(u) ** p + Math.abs(ey / ry_) ** p, 1 / p) - 1, ex, ey];
}
const toWorld = (sh, x, y) => [4.5 + (x - 4.5) * sh.size + sh.posX, 4.2 + (y - 4.2) * sh.size + sh.posY];
const toDesign = (sh, x, y) => [4.5 + (x - 4.5 - sh.posX) / sh.size, 4.2 + (y - 4.2 - sh.posY) / sh.size];
/* Custom outline: a closed curve through the user's points (smooth = Catmull-Rom, 0 = straight sides). */
function customPoly(sh, drop) {
  const P = sh.points, n = P.length, s = sh.smooth, out = [];
  for (let i = 0; i < n; i++) {
    const p0 = P[(i - 1 + n) % n], p1 = P[i], p2 = P[(i + 1) % n], p3 = P[(i + 2) % n];
    for (let k = 0; k < 12; k++) {
      const t = k / 12, t2 = t * t, t3 = t2 * t, pt = [0, 0];
      for (let c = 0; c < 2; c++) {
        const cat = 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3);
        pt[c] = lerp(p1[c] + (p2[c] - p1[c]) * t, cat, s);
      }
      const r = rotPt(sh, pt[0], pt[1]), w = toWorld(sh, r[0], r[1]); out.push([w[0], w[1] + drop * sh.size]);
    }
  }
  return out;
}
/* "Rotate outline" turns a drawn outline around the icon centre. */
function rotPt(sh, x, y, inv = false) {
  const a = (sh.rotate || 0) * (inv ? -1 : 1), c = Math.cos(a), s = Math.sin(a), dx = x - 4.5, dy = y - 4.2;
  return [4.5 + dx * c - dy * s, 4.2 + dx * s + dy * c];
}
/* The bean steak: big rounded lobe top right, smaller lobe bottom left, a soft dip on the
   top-left edge, wide enough to overlap its neighbours in the bar. */
const BEAN_POINTS = [[0.75, 4.7], [1.85, 3.8], [3.0, 3.3], [3.95, 2.5], [5.0, 1.35], [6.45, 0.65], [7.95, 0.9],
  [8.8, 2.25], [8.75, 4.05], [7.8, 5.7], [6.15, 7.0], [4.3, 7.85], [2.45, 8.1], [0.95, 7.45], [0.25, 6.15]];
/* Sample the slider shape's outline into editable points. */
function shapeToPoints(sh, n = 12) {
  const pts = [];
  for (let k = 0; k < n; k++) {
    const th = sh.angle + Math.PI + TAU * k / n, c = Math.cos(th), s2 = Math.sin(th);
    let lo = 0, hi = 6;
    for (let it = 0; it < 30; it++) { const m = (lo + hi) / 2; if (shapeLocal(sh, 4.5 + m * c, 4.2 + m * s2, 0)[0] < 0) lo = m; else hi = m; }
    pts.push([+(4.5 + lo * c).toFixed(3), +(4.2 + lo * s2).toFixed(3)]);
  }
  return pts;
}

function steakGrids(S, sh, drop, seed) {
  const W = 9 * S, H = 9 * S, n = W * H, f = new Float32Array(n), EX = new Float32Array(n), EY = new Float32Array(n), D = new Float32Array(n);
  const custom = sh.custom && sh.points && sh.points.length >= 3;
  let poly = null, bb = null, cen = null;
  if (custom) {
    poly = customPoly(sh, drop);
    bb = [Infinity, Infinity, -Infinity, -Infinity]; cen = [0, 0];
    for (const [x, y] of poly) { bb[0] = Math.min(bb[0], x); bb[1] = Math.min(bb[1], y); bb[2] = Math.max(bb[2], x); bb[3] = Math.max(bb[3], y); cen[0] += x; cen[1] += y; }
    cen[0] /= poly.length; cen[1] /= poly.length;
  } else if (sh.facets) {
    const r = mulberry32(seed * 31 + 13), p = sh.p, ca = Math.cos(sh.angle), sa = Math.sin(sh.angle); poly = [];
    for (let k = 0; k < sh.facets; k++) {
      const tt = TAU * (k + 0.5 * r()) / sh.facets, c = Math.cos(tt), s = Math.sin(tt);
      const rr = 1 / Math.pow(Math.abs(c) ** p + Math.abs(s) ** p, 1 / p);
      const lx = sh.rx * rr * c * (0.94 + 0.1 * r()), ly = sh.ry * rr * s * (0.94 + 0.1 * r());
      poly.push(toWorld(sh, 4.5 + lx * ca - ly * sa, 4.2 + drop + lx * sa + ly * ca));
    }
  }
  const ca = Math.cos(sh.angle), sa = Math.sin(sh.angle);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const X = (i + 0.5) / S, Y = (j + 0.5) / S, k = j * W + i;
    if (poly) {
      const ox = custom ? cen[0] : 4.5 + sh.posX, oy = custom ? cen[1] : 4.2 + sh.posY + drop * sh.size;
      const dx = (X - ox) / sh.size, dy = (Y - oy) / sh.size;
      EX[k] = dx * ca + dy * sa; EY[k] = -dx * sa + dy * ca;
      if (custom && (X < bb[0] - 1.5 || X > bb[2] + 1.5 || Y < bb[1] - 1.5 || Y > bb[3] + 1.5))
        D[k] = Math.hypot(Math.max(bb[0] - X, 0, X - bb[2]), Math.max(bb[1] - Y, 0, Y - bb[3]));
      else D[k] = sdPolygon(X, Y, poly);
      continue;
    }
    const [Xd, Yd] = toDesign(sh, X, Y);
    const r = shapeLocal(sh, Xd, Yd, drop);
    f[k] = r[0]; EX[k] = r[1]; EY[k] = r[2];
  }
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const k = j * W + i;
    let d = D[k];
    if (!poly) {
      const gx = (f[j * W + Math.min(i + 1, W - 1)] - f[j * W + Math.max(i - 1, 0)]) * S / ((i > 0 && i < W - 1) ? 2 : 1);
      const gy = (f[Math.min(j + 1, H - 1) * W + i] - f[Math.max(j - 1, 0) * W + i]) * S / ((j > 0 && j < H - 1) ? 2 : 1);
      d = f[k] / Math.max(Math.hypot(gx, gy), 1e-4);
    }
    if (!poly || custom) {
      const X = (i + 0.5) / S, Yr = (j + 0.5) / S - drop * sh.size, [ra, rf] = sh.rough;
      if (ra) { d += ra * samp(T[4], X * rf + 3, Yr * rf); if (rf <= 5) d += ra * 0.35 * samp(T[2], X * rf * 3, Yr * rf * 3); }
      if (sh.wave[0]) d += sh.wave[0] * Math.sin(Math.atan2(EY[k] / sh.ry, EX[k] / sh.rx) * sh.wave[1]);
    }
    D[k] = d;
  }
  return { D, EX, EY };
}

function voronoi(u, v, seed) {
  const iu = Math.floor(u), iv = Math.floor(v);
  let f1 = 9, f2 = 9, hid = 0, ndx = 0, ndy = 0;
  for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
    const cu = iu + di, cv = iv + dj;
    const h1 = fract(Math.sin(cu * 127.1 + cv * 311.7 + seed * 17) * 43758.5453);
    const h2 = fract(Math.sin(cu * 269.5 + cv * 183.3 + seed * 31) * 24634.6345);
    const h3 = fract(Math.sin(cu * 419.2 + cv * 371.9 + seed * 7) * 13758.937);
    const dx = u - (cu + 0.15 + 0.7 * h1), dy = v - (cv + 0.15 + 0.7 * h2), d = Math.hypot(dx, dy);
    if (d < f1) { f2 = f1; f1 = d; hid = h3; ndx = dx; ndy = dy; } else if (d < f2) f2 = d;
  }
  return [f1, f2, hid, ndx, ndy];
}

function steakColors(st) {
  const sc = st.steakCol, b2 = unhex(sc.meat), rim = unhex(sc.rim), side = unhex(sc.side);
  return { base: b2, mid: scale3(b2, 0.875), dark: unhex(sc.dark), light: mixc(b2, rim, 0.45), rim, side, side2: scale3(side, 0.66) };
}
function steakTexture(tex, X, Y, ex, ey, top, C, seed, ctx, cov) {
  const n = fbm(seed, X * 6 + 20, Y * 6 + 60);
  let face = scale3(mixc(C.base, C.mid, sat(0.5 + 0.4 * n)), 1.08 - 0.25 * ctx.shade * sat((ctx.lp + 1.6) / 3.2));
  const plain = face, BLACK = ctx.burnCol;
  const burns = (cs, k, w, extra = 0) => {
    if (ctx.burnCount > 0) { const sp = 1.6 * ctx.burnSpacing; cs = []; for (let q = 0; q < ctx.burnCount; q++) cs.push((q - (ctx.burnCount - 1) / 2) * sp); }
    else cs = cs.map(c => c * ctx.burnSpacing);
    cs = cs.map(c => c + ctx.burnOffset);
    const th = Math.atan(k) + ctx.burnAng + extra, u = ex * Math.cos(th) + ey * Math.sin(th); let b = 0, h = 0;
    w *= ctx.burnW;
    for (const c of cs) { const ww = w * (1 - 0.45 * sat(Math.abs(ey) / 2)); b = Math.max(b, cov(Math.abs(u - c) - ww)); h = Math.max(h, Math.exp(-(((u - c) / (w * 2.2)) ** 2))); }
    return [b, h];
  };
  const grill = (cs, k, w, halo = 0.55) => {
    let [b, h] = burns(cs, k, w);
    if (ctx.cross) { const [b2, h2] = burns(cs, k, w, 1.25); b = Math.max(b, b2); h = Math.max(h, h2); }
    face = mixc(face, C.dark, h * halo * ctx.burnHalo); face = mixc(face, BLACK, b);
  };
  const RT = REAL[tex];
  if (RT) {
    // real seared-beef browns, tinted by the chosen meat colour (default meat = no tint)
    const tint = [C.base[0] / (112 / 255), C.base[1] / (54 / 255), C.base[2] / (36 / 255)];
    const tc = c3 => [Math.min(1, c3[0] * tint[0]), Math.min(1, c3[1] * tint[1]), Math.min(1, c3[2] * tint[2])];
    const crustDark = tc(rgb(46, 24, 13)), crust = tc(rgb(104, 58, 32)), golden = tc(rgb(164, 102, 56));
    // surface height: pebbly crust, muscle grain, crackle
    const hAt = (x, y, u, v) => {
      let hh = RT.pebble * (0.6 * samp(T[1], x * 22, y * 22) + 0.4 * samp(T[3], x * 46 + 9, y * 46 + 4)) * 0.5;
      if (RT.crack) { const vr = voronoi(u / 0.75, v / 0.75, seed + 11); hh -= RT.crack * 0.35 * sstep(0.06, 0, (vr[1] - vr[0]) * 0.75); }
      return hh;
    };
    const e = 0.04, h0 = hAt(X, Y, ex, ey);
    const gxh = (hAt(X + e, Y, ex + e * ctx.ca, ey - e * ctx.sa) - h0) / e;
    const gyh = (hAt(X, Y + e, ex + e * ctx.sa, ey + e * ctx.ca) - h0) / e;
    const bump = -(gxh * ctx.lc + gyh * ctx.ls);
    // colour: browning, darker flecks, thicker crust toward the edge
    const n1 = fbm(seed + 5, X * 2.2, Y * 2.2), n2 = samp(T[4], X * 9 + 3, Y * 9 + 7);
    let c = mixc(crust, golden, sstep(-0.3, 0.9, n1) * RT.golden);
    c = mixc(c, crustDark, sstep(0.2, 1.1, n2) * 0.55);
    const grit = samp(T[3], X * 38 + 2, Y * 38 + 8);                    // fine caramelized grit
    c = mixc(c, golden, sstep(0.9, 1.6, grit) * 0.5 * RT.golden);
    c = mixc(c, crustDark, sstep(-0.9, -1.6, grit) * 0.5);
    c = mixc(c, crustDark, sat(sstep(-1.3, -0.15, top) * 0.55 + (RT.darker || 0)));
    if (RT.grain) {                        // long muscle fibres
      const fib = Math.sin((ey + ex * 0.3) * 13 + 3.5 * fbm(seed + 2, X * 2.5, Y * 2.5));
      c = mixc(c, crustDark, sstep(0.45, 0.95, fib) * 0.4 * RT.grain);
      c = mixc(c, golden, sstep(-0.6, -0.95, fib) * 0.2 * RT.grain);
    }
    if (RT.marble) {                       // cooked intramuscular fat
      const fq = RT.fine ? 1.8 : 1, m = Math.abs(fbm(seed + 7, ex * 4.2 * fq + 11, ey * 6.5 * fq + 5));
      const vein = sstep(0.012 + 0.11 * RT.marble, 0.008, m) * (0.6 + 0.4 * sstep(-0.5, 0.5, samp(T[1], X * 3, Y * 3)));
      c = mixc(c, tc(mixc(rgb(196, 140, 92), rgb(232, 196, 148), sat(0.5 + 0.3 * samp(T[0], X * 30, Y * 30)))), vein * 0.75);
    }
    if (RT.char) {
      const cs = samp(T[5], X * 7 + 1, Y * 7 + 2) + 0.4 * samp(T[2], X * 20, Y * 20);
      c = mixc(c, rgb(26, 15, 10), sstep(0.9 - RT.char * 0.6, 1.3 - RT.char * 0.6, cs) * 0.9);
    }
    if (RT.grill) {                        // scorched grill marks with soft brown edges
      const k = RT.slant ?? 0.55;
      let [bb, hh] = burns(RT.grill, k, 0.24);
      if (RT.cross || ctx.cross) { const [b2, h2] = burns(RT.grill, k, 0.24, 1.25); bb = Math.max(bb, b2); hh = Math.max(hh, h2); }
      const ragged = Math.max(0.55, Math.min(1, 0.85 + 0.2 * samp(T[2], X * 14, Y * 14)));               // marks pick up unevenly
      c = mixc(c, scale3(crustDark, 0.9), sat(hh ** 4 * 0.75 * ctx.burnHalo));   // narrow scorch beside each mark
      c = mixc(c, mixc(rgb(18, 10, 6), BLACK, 0.5), sat(bb * ragged));
    }
    // bump lighting + broad light falloff
    c = scale3(c, Math.max(0.5, Math.min(1.6, 1 + bump * 0.75)) * (1.1 - 0.2 * ctx.shade * sat((ctx.lp + 1.6) / 3.2)));
    // glistening juices
    const wet = sstep(0, 0.8, samp(T[0], X * 5 + 13, Y * 5 + 2)) * RT.wet;
    c = mixc(c, rgb(255, 240, 228), sat(Math.pow(sat(bump * 1.2), 3) * wet * 0.9));
    return mixc(plain, c, ctx.strength);
  }
  switch (tex) {
    case "grill": grill([-2.1, 0, 2.1], 0.55, 0.21); break;
    case "crosshatch": { const c4 = [-2.4, -0.8, 0.8, 2.4]; const [b1, h1] = burns(c4, 1.0, 0.13), [b2, h2] = burns(c4, -2.2, 0.13);
      face = mixc(face, C.dark, Math.max(h1, h2) * 0.45 * ctx.burnHalo); face = mixc(face, BLACK, Math.max(b1, b2)); break; }
    case "wide-grill": grill([-1.3, 1.3], 0.4, 0.36, 0.4); break;
    case "thin-grill": grill([-2.8, -1.4, 0, 1.4, 2.8], -0.45, 0.09, 0.35); break;
    case "speckle": for (const s of ctx.specks) face = mixc(face, s.c, cov(Math.hypot(ex - s.x, (ey - s.y) * 1.3) - s.r)); break;
    case "chunky": { const [f1, f2, hid] = voronoi(ex / 0.85, ey / 0.85, seed);
      face = scale3([C.dark, C.mid, C.base, C.light][Math.min(3, Math.floor(hid * 4))], 0.95 + 0.15 * sat(0.55 - ey / 3));
      face = mixc(face, scale3(C.dark, 0.75), sstep(0.12, 0.03, (f2 - f1) * 0.85)); break; }
    case "grain": { const fib = Math.sin((ey + ex * 0.35) * 9 + 2.2 * fbm(seed + 2, X * 3, Y * 3));
      face = mixc(face, C.dark, sstep(0.4, 0.75, fib) * 0.8); face = mixc(face, C.light, sstep(-0.65, -0.95, fib) * 0.6); break; }
    case "charred": { const n2 = samp(T[(seed + 3) % 6], X * 6 + 5, Y * 6 + 9) + 0.25 * samp(T[(seed + 2) % 6], X * 20, Y * 20);
      face = mixc(face, rgb(40, 20, 14), sstep(0.35, 0.55, n2) * 0.85); face = mixc(face, rgb(16, 8, 6), sstep(0.75, 0.9, n2)); break; }
    case "char-edges": face = mixc(face, rgb(18, 9, 6), sstep(-1.5, -0.6, top + 0.15 * samp(T[5], X * 9, Y * 9))); break;
    case "seared": face = scale3(mixc(C.light, scale3(C.dark, 0.8), sstep(-2, -0.4, top)), 1 + 0.08 * n); break;
    case "bubbly": { const [f1, , hid, ddx, ddy] = voronoi(ex / 0.62, ey / 0.62, seed + 9); const rr = 0.22 + 0.16 * hid;
      const inside = cov((f1 - rr) * 0.62); face = mixc(face, C.dark, inside * 0.8);
      face = mixc(face, C.rim, inside * sstep(rr * 0.55, rr, f1) * sat(-(ddx + ddy) / (f1 + 1e-3)) * 0.8); break; }
    case "crust": { const g = samp(T[1], X * 28, Y * 28) + 0.6 * samp(T[3], X * 55, Y * 55);
      face = mixc(face, C.dark, sstep(0.3, 1.1, g) * 0.8); face = mixc(face, C.light, sstep(-0.4, -1.2, g) * 0.6); break; }
    case "caramelized": { const n3 = samp(T[(seed + 1) % 6], X * 5, Y * 5);
      face = mixc(face, rgb(150, 84, 50), sstep(0.2, 0.7, n3) * 0.75); face = mixc(face, C.dark, sstep(-0.5, -1, n3) * 0.6); break; }
    case "juicy": {
      for (const [hx, hy, hrx, hry, a] of [[-2.1, -1, 0.8, 0.17, 0.8], [0.5, -1.3, 1.1, 0.14, 0.6], [2.3, -0.7, 0.45, 0.12, 0.5]])
        face = mixc(face, rgb(255, 226, 210), sat(-sdEllipse(ex, ey, hx, hy, hrx, hry, 0) / 0.12) * a);
      for (const s of ctx.drops) face = mixc(face, rgb(240, 196, 176), sat(-(Math.hypot(ex - s.x, ey - s.y) - 0.07) / 0.05) * 0.7);
      break; }
    case "blotchy": { const n3 = samp(T[(seed + 2) % 6], X * 4 + 7, Y * 4 + 3);
      face = mixc(face, C.light, sstep(0.25, 0.4, n3) * 0.8); face = mixc(face, C.dark, sstep(-0.25, -0.4, n3) * 0.8); break; }
    case "well-done": face = mixc(face, C.dark, 0.5); break;
    case "plain": break;
    case "pan-lines": face = mixc(face, C.dark, sstep(0.5, 0.9, Math.sin(ey * 16 + 1.5 * samp(T[2], X * 4, Y * 4))) * 0.55); break;
    case "grill-char": { const n2 = samp(T[(seed + 4) % 6], X * 7, Y * 7); face = mixc(face, rgb(30, 15, 10), sstep(0.7, 0.9, n2) * 0.9);
      grill([-1.9, 0.2], -0.9, 0.2); break; }
    case "cel-shaded": { const L = sat(0.5 - ey / 2.6); face = L > 0.6 ? C.light : L > 0.38 ? C.base : C.dark; break; }
  }
  return mixc(plain, face, ctx.strength);
}

/* Custom empty steak slots, built from the full steak's silhouette so they work with every steak design. */
function emptySteakIcon(S, st, flash, hunger, shOverride) {
  const E = st.empty, W = 9 * S, n = W * W, img = newImg(S, 9, 9);
  if (E.style === "hidden") return toRGBA(img);
  const full = steakIcon(S, st, "full", false, false, shOverride), src = full.data;
  // optional size change: sample the full icon around its centre of mass
  let cx = 0, cy = 0, wsum = 0;
  for (let k = 0; k < n; k++) { const a = src[k * 4 + 3]; if (a) { cx += (k % W) * a; cy += Math.floor(k / W) * a; wsum += a; } }
  cx = wsum ? cx / wsum : W / 2; cy = wsum ? cy / wsum : W / 2;
  const sz = E.size || 1, A = new Float32Array(n), RGB = new Float32Array(n * 3);
  for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) {
    const si = Math.round(cx + (i - cx) / sz), sj = Math.round(cy + (j - cy) / sz), k = j * W + i;
    if (si < 0 || sj < 0 || si >= W || sj >= W) continue;
    const q = (sj * W + si) * 4; A[k] = src[q + 3] / 255; RGB[k * 3] = src[q] / 255; RGB[k * 3 + 1] = src[q + 1] / 255; RGB[k * 3 + 2] = src[q + 2] / 255;
  }
  // distance inside the silhouette (chamfer transform, in output pixels)
  const D = new Float32Array(n), INF = 1e9;
  for (let k = 0; k < n; k++) D[k] = A[k] > 0.5 ? INF : 0;
  const r2 = Math.SQRT2;
  for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) { const k = j * W + i; if (!D[k]) continue;
    let d = D[k]; if (i > 0) d = Math.min(d, D[k - 1] + 1); if (j > 0) { d = Math.min(d, D[k - W] + 1); if (i > 0) d = Math.min(d, D[k - W - 1] + r2); if (i < W - 1) d = Math.min(d, D[k - W + 1] + r2); } D[k] = d; }
  for (let j = W - 1; j >= 0; j--) for (let i = W - 1; i >= 0; i--) { const k = j * W + i; if (!D[k]) continue;
    let d = D[k]; if (i < W - 1) d = Math.min(d, D[k + 1] + 1); if (j < W - 1) { d = Math.min(d, D[k + W] + 1); if (i < W - 1) d = Math.min(d, D[k + W + 1] + r2); if (i > 0) d = Math.min(d, D[k + W - 1] + r2); } D[k] = d; }
  const outC = flash ? rgb(250, 240, 232) : unhex(E.outline), fillC = unhex(hunger ? E.hungerFill : E.fill), ow = E.outlineW * S;
  for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) {
    const k = j * W + i, a = A[k]; if (a <= 0) continue;
    const dpx = D[k], inner = sat((dpx - ow) + 0.5), X = i / W, Y = j / W;
    let c, fa;
    if (E.style === "ghost") {
      let g = [RGB[k * 3], RGB[k * 3 + 1], RGB[k * 3 + 2]];
      const l = 0.3 * g[0] + 0.59 * g[1] + 0.11 * g[2];
      g = mixc([l, l, l], g, E.ghostSat);                                  // how much of the steak's colour remains
      g = scale3(g, E.ghostBright);
      g = mixc(g, fillC, E.ghostTint);
      c = g; fa = 1;                                                       // the steak's own outline is kept
    } else {
      let f = fillC;
      f = scale3(f, 1 + E.shade * (0.35 - 0.7 * sat((X + Y) / 1.4)));        // lighter toward the top-left
      f = scale3(f, 1 - E.shade * 0.35 * (1 - sat((dpx - ow) / (1.2 * S)))); // darker near the outline
      fa = E.style === "outline" ? 0 : E.fillA;
      c = mixc(outC, f, inner);
      fa = lerp(1, fa, inner);
    }
    const alpha = a * fa * E.alpha;
    if (alpha > 0.002) { img.a[k] = alpha; img.col[k * 3] = sat(c[0]); img.col[k * 3 + 1] = sat(c[1]); img.col[k * 3 + 2] = sat(c[2]); }
  }
  return toRGBA(img);
}
function steakIcon(S, st, kind = "full", flash = false, hunger = false, shOverride) {
  if (kind === "container" && st.empty && st.empty.style && st.empty.style !== "default") return emptySteakIcon(S, st, flash, hunger, shOverride);
  { const shp = shOverride || st.shape;
    if (shp.texture === "smooth-grilled") return slabSteakIcon(S, st, kind, flash, hunger, shp);
    if (shp.texture === "smooth-bean") return smoothSteakIcon(S, st, kind, flash, hunger, shp);
    if (shp.texture === "photo-real") return panSteakIcon(S, st, kind, flash, hunger, shp);
    if (shp.texture === "photo-grilled") return photoSteakIcon(S, st, kind, flash, hunger, shp); }
  const sh = shOverride || st.shape, C = steakColors(st), seed = 2, cov = covf(S), tsc = sh.texScale || 1;
  const top = steakGrids(S, sh, 0, seed), side = steakGrids(S, sh, sh.thick, seed);
  const W = 9 * S, H = 9 * S, img = newImg(S, 9, 9), ow = sh.outline;
  const r = mulberry32(seed + 77), ctx = { specks: [], drops: [], burnW: sh.burnW, burnAng: sh.burnAng, burnCol: unhex(st.steakCol.burn), strength: sh.texStrength,
    burnCount: sh.burnCount, burnSpacing: sh.burnSpacing, burnOffset: sh.burnOffset, burnHalo: sh.burnHalo, cross: sh.cross, shade: sh.shade, lp: 0,
    ca: Math.cos(sh.angle), sa: Math.sin(sh.angle), lc: Math.cos(sh.light * Math.PI / 180), ls: Math.sin(sh.light * Math.PI / 180) };
  const lc = ctx.lc, ls = ctx.ls;
  const lcx = 4.5 + sh.posX, lcy = 4.2 + sh.posY;
  for (let i = 0; i < 70; i++) ctx.specks.push({ x: -3.8 + r() * 7.6, y: -2.2 + r() * 4.4, r: 0.09 + r() * 0.19, c: [C.dark, C.light, scale3(C.dark, 0.85)][i % 3] });
  for (let i = 0; i < 14; i++) ctx.drops.push({ x: -3.3 + r() * 6.6, y: -1.6 + r() * 3.2 });
  const outlineCol = unhex(sh.outlineCol), tintC = unhex(st.hungerTint);
  // body distance; a half steak is cut at the middle, and the cut gets its own outline
  const B = new Float32Array(W * H);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const k = j * W + i; B[k] = Math.min(top.D[k], side.D[k]);
    if (kind === "half") B[k] = Math.max(B[k], 4.5 - (i + 0.5) / S);
  }
  const shA = (sh.shadow ?? 0.5) * (kind === "container" ? 0.5 : 1), sdx = Math.round(0.4 * S), sdy = Math.round(0.5 * S);
  const shadowC = rgb(12, 6, 3);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const k = j * W + i, X = (i + 0.5) / S, Y = (j + 0.5) / S;
    const t = top.D[k], sd = side.D[k], body = B[k];
    const a = cov(body);
    // soft drop shadow down-right, so overlapping steaks read as separate pieces
    let sA = 0;
    if (shA > 0 && a < 1 && i >= sdx && j >= sdy) sA = shA * 0.55 * sat(0.5 - B[(j - sdy) * W + (i - sdx)] / 0.45);
    if (a <= 0 && sA <= 0) continue;
    if (a <= 0) { img.a[k] = sA; img.col.set(shadowC, k * 3); continue; }
    const inner = cov(body + ow);
    let c;
    if (kind === "container") {
      // empty slot: dark, softly shaded and with a faint inner rim, instead of a flat blob
      const lp = -((X - lcx) * lc + (Y - lcy) * ls);
      let fill = hunger ? rgb(30, 40, 16) : rgb(44, 27, 19);
      fill = scale3(fill, 1.25 - 0.45 * sat((lp + 3) / 6));
      fill = mixc(fill, scale3(fill, 1.7), cov(Math.abs(body + ow + 0.16) - 0.05) * 0.45);
      c = mixc(flash ? rgb(250, 240, 232) : rgb(10, 5, 2), fill, inner);
      c = mixc(c, rgb(24, 14, 10), cov(Math.abs(t) - 0.1) * (sd < 0 ? 1 : 0) * inner);
    } else {
      ctx.lp = -((X - lcx) * lc + (Y - lcy) * ls);
      let face = steakTexture(sh.texture, X / tsc, Y / tsc, top.EX[k] / tsc, top.EY[k] / tsc, t, C, seed, ctx, d => cov(d * tsc));
      const gx = (top.D[j * W + Math.min(i + 1, W - 1)] - top.D[j * W + Math.max(i - 1, 0)]) * S / 2;
      const gy = (top.D[Math.min(j + 1, H - 1) * W + i] - top.D[Math.max(j - 1, 0) * W + i]) * S / 2;
      const facing = gx * lc + gy * ls, edge = sstep(-0.95, -0.3, t);
      face = mixc(face, C.rim, sat(edge * sstep(0.2, 0.7, facing) * 0.7 * sh.rimLight));
      face = mixc(face, C.side, sat(edge * sstep(0.2, 0.7, -facing) * 0.5 * sh.rimShadow));
      // crisp highlight just inside the outline on the lit side: keeps the shape readable at HUD size
      if (sh.edgeHi > 0 && t < 0) face = mixc(face, mixc(C.rim, WHITE, 0.3), sat(cov(Math.abs(t + ow + 0.16) - 0.07) * sstep(0.05, 0.5, facing) * sh.edgeHi));
      if (sh.shine > 0) {
        const gl = sdEllipse(top.EX[k], top.EY[k], sh.shineX, -sh.ry * 0.5, 0.9 * sh.shineSize, 0.24 * sh.shineSize, 0);
        face = mixc(face, rgb(255, 236, 222), sat(-gl / 0.25) * sh.shine * (t < 0 ? 1 : 0));
      }
      c = t < 0 ? face : mixc(C.side, C.side2, sat((X - 1) / 7));
      c = mixc(c, scale3(C.side2, 0.7), cov(Math.abs(t) - 0.07) * (sd < 0 ? 1 : 0));
      let out = outlineCol;
      if (hunger) { c = mixc(c, tintC, 0.5); out = scale3(tintC, 0.2); }
      if (flash) { c = mixc(c, WHITE, 0.4); out = rgb(250, 240, 232); }
      if (sh.double) c = mixc(c, scale3(C.rim, 1.15), cov(Math.abs(body + ow + 0.12) - 0.05));
      c = mixc(out, c, inner);
    }
    const A = a + sA * (1 - a), w = sA * (1 - a);
    img.a[k] = A;
    img.col.set([sat((c[0] * a + shadowC[0] * w) / A), sat((c[1] * a + shadowC[1] * w) / A), sat((c[2] * a + shadowC[2] * w) / A)], k * 3);
  }
  return toRGBA(img);
}

