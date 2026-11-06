/* =====================================================================
   Cosmic armor: galaxy and rainbow armor icons in several shapes and finishes.
   Used when st.armor.uiStyle === "cosmic"; settings live in st.armor.cosmic.
   Armor is a still image in game (full / empty; half is put together from both).
   ===================================================================== */
const ARMOR_SHAPES = {
  chest: { label: "Chestplate", sd: (X, Y) => sdPolygon(X, Y, ARMOR_PTS) - 0.15 },
  plate: { label: "Heavy plate", sd: (X, Y) => sdPolygon(X, Y, [[0.5, 1.7], [2.5, 0.9], [3.5, 0.9], [4.5, 2.1], [5.5, 0.9], [6.5, 0.9], [8.5, 1.7], [8.4, 4.1],
    [7.0, 4.2], [6.8, 8.0], [2.2, 8.0], [2.0, 4.2], [0.6, 4.1]]) - 0.2 },
  helmet: { label: "Helmet", sd: (X, Y) => Math.max(Math.min(Math.max(Math.hypot(X - 4.5, Y - 4.9) - 3.85, Y - 5.4), sdBox(X, Y, 4.5, 6.4, 3.75, 1.75, 0.35)),
    -Math.min(sdBox(X, Y, 4.5, 7.5, 1.05, 1.35, 0.4), sdBox(X, Y, 4.5, 5.7, 2.55, 0.32, 0.15))) },
  shield: { label: "Shield", sd: (X, Y) => sdPolygon(X, Y, [[1.0, 0.9], [8.0, 0.9], [8.0, 4.0], [7.4, 5.9], [6.0, 7.4], [4.5, 8.4], [3.0, 7.4], [1.6, 5.9], [1.0, 4.0]]) - 0.2 },
  round: { label: "Round shield", sd: (X, Y) => Math.hypot(X - 4.5, Y - 4.6) - 3.95 },
  gem: { label: "Gem", sd: (X, Y) => sdPolygon(X, Y, [[2.6, 0.9], [6.4, 0.9], [8.4, 3.4], [4.5, 8.4], [0.6, 3.4]]) - 0.12 },
  star: { label: "Star", sd: (X, Y) => sdPolygon(X, Y, starPts(5, 4.4, 2.05, -Math.PI / 2, 4.5, 4.85)) - 0.2 },
};
const ARMOR_FINISHES = { glass: "Glass", metal: "Metal", gem: "Cut gem", neon: "Neon", flat: "Flat" };
const ARMOR_RB_NAMES = Object.keys(HB_RB_VARIANTS).filter(n => n !== "chroma");
const ARMOR_COSMIC_BASE = { family: "galaxy", variant: "deep", shape: "chest", finish: "glass", outline: 0.5, shine: 1, rim: 0.7, size: 1, outlineCol: "#0a0618",
  emptyA: 0.55, rbAngle: 35 };

function cosmicArmorIcon(S, A, mode) {
  const img = newImg(S, 9, 9), W = img.W, H = img.H, cov = covf(S), shp = ARMOR_SHAPES[A.shape] || ARMOR_SHAPES.chest, sz = A.size || 1;
  const sd = (X, Y) => shp.sd(4.5 + (X - 4.5) / sz, 4.6 + (Y - 4.6) / sz) * sz;
  const gv = HB_GAL_VARIANTS[A.variant] || HB_GAL_VARIANTS.deep, galaxy = A.family !== "rainbow";
  const cols = galaxy ? { c1: gv.c[0], c2: gv.c[1], c3: gv.c[2], accent: gv.c[3] } : { c1: "#160c46", c2: "#4a2ab8", c3: "#9c6cff", accent: "#ffffff" };
  const R = galaxy ? null : rbParams(HB_RB_VARIANTS[A.variant] ? A.variant : "flow");
  const pseudo = Object.assign({}, cols, { stars: galaxy ? (gv.o.stars || 1) : 1, texScale: 0.8, motion: "loop", shoot: 0, gal: galaxy ? galParams(A.variant in HB_GAL_VARIANTS ? A.variant : "deep") : {} });
  const P = hbPalette(pseudo), live = mode !== "empty";
  const buf = live && (galaxy || R.mode === "galaxy") ? hbGalaxy(S, 9, 9, 0.2, pseudo, P, 41) : null;
  const outC = unhex(A.outlineCol || "#0a0618"), acc = unhex(cols.accent), ow = A.outline;
  const ang = (A.rbAngle || 35) * Math.PI / 180, cs = Math.cos(ang), sn = Math.sin(ang);
  const colorAt = (X, Y, k) => {
    if (galaxy) return gal(buf, k);
    const u = ((X - 4.5) * cs + (Y - 4.6) * sn) / 9 + 0.5;                          // position across the icon
    return rbColor(R, u * 182, 11 + (-(X - 4.5) * sn + (Y - 4.6) * cs) * 2.4, 0, 0, buf ? gal(buf, k) : null);
  };
  const e = 0.35 / S;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const k = j * W + i, X = (i + 0.5) / S, Y = (j + 0.5) / S, d = sd(X, Y);
    if (d > 1.4) continue;
    const p = px0();
    if (!live) {                                                                    // empty slot: dim silhouette and outline
      over(p, cov(d) * A.emptyA, mixc(rgb(18, 14, 30), P.deep, 0.25));
      over(p, cov(d) * (1 - cov(d + ow)) * 0.9, outC);
      putPx(img, k, p); continue;
    }
    // surface normal from the distance field, for lighting and bevels
    const gx = sd(X + e, Y) - sd(X - e, Y), gy = sd(X, Y + e) - sd(X, Y - e), gl = Math.hypot(gx, gy) || 1, nx = gx / gl, ny = gy / gl;
    const edgeLit = sat(-(nx + ny) * 0.7), edgeDark = sat((nx + ny) * 0.7), inner = sstep(-1.4, -0.1, d + ow);
    const L = sat(0.55 - ((X - 4.5) + (Y - 4.6)) / 9);
    let base = colorAt(X, Y, k), c;
    if (A.finish === "metal") {
      c = mixc(scale3(base, 0.55), mixc(base, WHITE, 0.25), L);
      c = mixc(c, mixc(base, WHITE, 0.65), inner * edgeLit * 0.85);                   // bevel catching the light
      c = mixc(c, scale3(base, 0.25), inner * edgeDark * 0.8);
      over(p, cov(d), c);
    } else if (A.finish === "gem") {
      const fa = Math.atan2(Y - 4.3, X - 4.5), fct = Math.floor((fa + Math.PI) / (TAU / 7)), fv = uhash(fct, 3, 5);
      const table = sd(4.5 + (X - 4.5) * 1.9, 4.3 + (Y - 4.3) * 1.9) < -0.5;           // flat top facet in the middle
      c = scale3(base, table ? 1.15 : 0.6 + 0.6 * fv);
      c = mixc(c, WHITE, (table ? 0.15 : 0) + inner * edgeLit * 0.4);
      over(p, cov(d), c);
      over(p, cov(d) * Math.exp(-Math.abs(Math.sin((fa + Math.PI) * 3.5)) * 9) * 0.35 * (table ? 0 : 1), WHITE);
    } else if (A.finish === "neon") {
      over(p, cov(d) * 0.75, scale3(mixc(outC, base, 0.15), 1));
      const tube = Math.abs(d + ow * 0.9);
      over(p, Math.exp(-tube / 0.5) * 0.6 * A.rim, base);
      over(p, Math.exp(-((tube / 0.2) ** 2)), mixc(base, WHITE, 0.55));
      putPx(img, k, p); continue;
    } else if (A.finish === "flat") {
      over(p, cov(d), base);
    } else {                                                                          // glass
      c = mixc(scale3(base, 0.75), mixc(base, WHITE, 0.15), L);
      over(p, cov(d) * 0.92, c);
      over(p, cov(d) * inner * edgeLit * 0.55 * A.rim, mixc(base, WHITE, 0.7));
    }
    // shine streak on the lit side, then the outline
    const sh = sat(-sdEllipse(X, Y, 3.2 + (sz - 1) * -1.3, 2.9 + (sz - 1) * -1.3, 1.1 * sz, 0.38 * sz, -0.75) / 0.3) * A.shine * cov(d + ow + 0.3);
    if (A.finish !== "flat") over(p, sh * 0.85, WHITE);
    over(p, cov(d) * (1 - cov(d + ow)), outC);
    putPx(img, k, p);
  }
  return toRGBA(img);
}
UI_STYLES.cosmic = (kind, S, el, cols, t, mode, flash, seed) => {
  if (kind !== "armor") return elementIcon(kind, S, Object.assign({}, el, { uiStyle: "" }), cols, t, mode, flash, seed);
  return cosmicArmorIcon(S, Object.assign(clone(ARMOR_COSMIC_BASE), el.cosmic || {}), mode === "empty" ? "empty" : "full");
};
UI_LABELS.cosmic = "Cosmic armor";
