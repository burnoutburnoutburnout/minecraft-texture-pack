/* =====================================================================
   New HUD styles for hearts, armor and the XP bar. Each is its own drawing, filled with the
   animated galaxy. Hearts: full / half / container; armor: full / empty (half is assembled from
   both); bars: fill / bg. The steak is never touched by these.
   ===================================================================== */
const UI_STYLES = {};
const UI_LABELS = { vial: "Galaxy vials", constellation: "Constellations", mosaic: "Low-poly mosaic", rift: "Cosmic rift", celestial: "Celestial gold" };
const hsd = (X, Y, k = 1, dy = 0) => sdHeart(4.5 + (X - 4.5) / k, 4.49 + (Y - dy - 4.49) / k) * k;
const asd = (X, Y, k = 1) => (sdPolygon(4.5 + (X - 4.5) / k, 4.55 + (Y - 4.55) / k, ARMOR_PTS) - 0.15) * k;
const uhash = (a, b, c) => fract(Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453);
function uiBase(kind, S, el, cols, t, seed, live) {
  const E = ELEM[kind], W = Math.round(E.w * S), H = Math.round(E.h * S), P = elPal(el, cols, kind);
  const buf = live ? starfield(S, E.w, E.h, t, P, galaxyOpts(kind, el, "galaxy", seed)) : null;
  return { E, W, H, P, buf, cov: covf(S), img: newImg(S, E.w, E.h) };
}
const gal = (buf, k) => [buf[k * 3], buf[k * 3 + 1], buf[k * 3 + 2]];
const isLive = mode => mode === "full" || mode === "half" || mode === "fill";
const halfMask = (kind, mode, X, cov) => (kind === "heart" && mode === "half") ? cov(X - 4.5) : 1;
const segD = (X, Y, a, b) => { const ex = b[0] - a[0], ey = b[1] - a[1], q = sat(((X - a[0]) * ex + (Y - a[1]) * ey) / (ex * ex + ey * ey)); return Math.hypot(X - a[0] - ex * q, Y - a[1] - ey * q); };
function star4(X, Y, cx, cy, r, w) {                                      // four-point star, approx. distance
  const dx = Math.abs(X - cx), dy = Math.abs(Y - cy);
  return Math.min(dx / r + dy / w - 1, dx / w + dy / r - 1) * w;
}

/* 1. Galaxy vials: glass containers holding sloshing galaxy liquid */
UI_STYLES.vial = (kind, S, el, cols, t, mode, flash, seed) => {
  const live = isLive(mode), { W, H, P, buf, cov, img } = uiBase(kind, S, el, cols, t, seed, live);
  const bar = kind === "bar", wall = bar ? 0.42 : 0.5;
  const glassC = mixc(rgb(205, 196, 240), P.bright, 0.3), lineC = rgb(22, 14, 42);
  const shape = (X, Y) => kind === "heart" ? hsd(X, Y, 0.9, 0.42) : kind === "armor" ? asd(X, Y, 0.94) : sdBox(X, Y, 91, 2.5, 90.6, 2.3, 2.3);
  const cx = 4.5, cy = kind === "heart" ? 4.9 : 4.6;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const k = j * W + i, X = (i + 0.5) / S, Y = (j + 0.5) / S;
    const d = shape(X, Y), cork = kind === "heart" ? sdBox(X, Y, 4.5, 1.45, 0.62, 0.62, 0.22) : 9;
    if (d > 0.05 && cork > 0.05) continue;
    let c, a;
    if (d < -wall) {
      const lvl = !live ? (bar ? 9 : 7.7) : bar ? 1.15 + 0.12 * Math.sin(TAU * 3 * t + X * 0.22) : (kind === "heart" ? 3.0 : 2.7) + 0.15 * Math.sin(TAU * 2 * t + X * 1.2);
      if (Y > lvl) {
        c = live ? gal(buf, k) : scale3(P.deep, 0.55);
        c = mixc(c, mixc(P.bright, WHITE, 0.3), sstep(0.16, 0.0, Y - lvl) * 0.7);           // bright liquid surface
        if (live) for (let b = 0; b < (bar ? 9 : 4); b++) {                                  // rising bubbles
          const h = uhash(b, seed, 3), bx = bar ? 4 + b * 20 + h * 8 : 2.6 + h * 3.8, kk = 1 + (b % 2);
          const by = 8.2 - (((t * kk + h) % 1)) * (8.2 - lvl) * (bar ? 0.5 : 1) + (bar ? -3.9 : 0);
          const rr = Math.hypot(X - bx, Y - by);
          c = mixc(c, mixc(P.bright, WHITE, 0.6), sstep(0.2, 0.12, Math.abs(rr - 0.14)) * 0.8);
        }
        a = 1;
      } else { c = mixc(glassC, P.deep, 0.55); a = 0.2; }
    } else { c = glassC; a = 0.5; }
    c = mixc(c, scale3(glassC, 0.55), sstep(0.08, 0, Math.abs(d + wall)) * 0.6);              // inner edge of the glass
    const hl = bar ? sstep(0.2, 0.05, Math.abs(Y - 1.05)) * sstep(2.5, 4, X) * sstep(180, 178.5, X)
      : sat(-sdEllipse(X, Y, cx - 2.1, cy - 0.7, 0.24, 1.5, 0.35) / 0.12);
    c = mixc(c, WHITE, hl * 0.75); a = Math.max(a, hl * 0.75);
    if (d > -0.14) { c = lineC; a = 1; }                                                   // outline
    a *= cov(d);
    if (cork < 0.05) {                                                                     // cork in the heart's notch
      const cc = mixc(rgb(126, 82, 46), rgb(184, 132, 86), sat((1.45 - Y) / 0.9 + 0.3));
      const ca = cov(cork); c = mixc(c, cork > -0.12 ? lineC : cc, ca); a = Math.max(a, ca);
    }
    if (flash) c = mixc(c, WHITE, 0.4);
    a *= halfMask(kind, mode, X, cov);
    if (a > 0) setPx(img, k, a, c);
  }
  return toRGBA(img);
};

/* 2. Constellations: shapes traced by twinkling stars joined with glowing lines */
UI_STYLES.constellation = (kind, S, el, cols, t, mode, flash, seed) => {
  const live = isLive(mode), { W, H, P, buf, cov, img } = uiBase(kind, S, el, cols, t, seed, live);
  const lineC = mixc(P.bright, WHITE, 0.55);
  if (kind === "bar") {
    const nodes = []; for (let n = 0; n < 12; n++) nodes.push(3 + n * 16);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const k = j * W + i, X = (i + 0.5) / S, Y = (j + 0.5) / S, dy = Math.abs(Y - 2.5);
      let c, a;
      if (live) { c = gal(buf, k); a = sat((1.35 - dy) / 0.6); c = mixc(c, lineC, Math.exp(-((dy / 0.16) ** 2)) * 0.85); }
      else { c = rgb(10, 8, 24); a = sat((1.45 - dy) / 0.6) * 0.6; c = mixc(c, scale3(lineC, 0.6), sstep(0.12, 0.05, dy) * (Math.sin(X * 2.4) > 0 ? 0.6 : 0)); a = Math.max(a, sstep(0.12, 0.05, dy) * 0.5); }
      for (let n = 0; n < nodes.length; n++) {
        const ds = Math.hypot(X - nodes[n], Y - 2.5); if (ds > 1.6) continue;
        const tw = live ? 0.75 + 0.25 * Math.sin(TAU * (t * (1 + n % 3) + n * 0.37)) : 0.35;
        const sv = (Math.exp(-((ds / 0.3) ** 2)) * 1.3 + Math.exp(-Math.abs(Y - 2.5) / 0.06) * Math.exp(-(((X - nodes[n]) / 1.2) ** 2)) * 0.6) * tw;
        c = mixc(c, WHITE, sat(sv)); a = Math.max(a, sat(sv));
      }
      if (flash) c = mixc(c, WHITE, 0.4);
      if (a > 0) setPx(img, k, sat(a), c);
    }
    return toRGBA(img);
  }
  const sd = (X, Y) => kind === "heart" ? hsd(X, Y, 0.9) : asd(X, Y, 0.9);
  const pts = kind === "heart" ? radialPoly((x, y) => sd(x, y) + 0.15, 4.5, 4.4, 10, 6) : ARMOR_PTS.map(([x, y]) => [4.5 + (x - 4.5) * 0.88, 4.55 + (y - 4.55) * 0.88]);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const k = j * W + i, X = (i + 0.5) / S, Y = (j + 0.5) / S, d = sd(X, Y);
    let c = [0, 0, 0], a = 0;
    if (d < 0.1) {
      const soft = sat(-d / 0.35 + 0.3);
      if (live) { c = scale3(gal(buf, k), 0.9); a = soft * 0.95; } else { c = rgb(10, 8, 22); a = soft * 0.78; }
    }
    let dl = 9; for (let n = 0; n < pts.length; n++) dl = Math.min(dl, segD(X, Y, pts[n], pts[(n + 1) % pts.length]));
    const la = live ? Math.exp(-((dl / 0.08) ** 2)) * 0.95 + Math.exp(-((dl / 0.3) ** 2)) * 0.35 : Math.exp(-((dl / 0.07) ** 2)) * 0.45;
    c = mixc(c, lineC, sat(la)); a = Math.max(a, sat(la));
    for (let n = 0; n < pts.length; n++) {
      const dx = X - pts[n][0], dy = Y - pts[n][1], ds = Math.hypot(dx, dy); if (ds > 1.2) continue;
      const tw = live ? 0.7 + 0.3 * Math.sin(TAU * (t * (1 + n % 3) + n * 0.31)) : 0.35;
      const sv = (Math.exp(-((ds / 0.2) ** 2)) * 1.4 + 0.5 * (Math.exp(-Math.abs(dx) / 0.05) * Math.exp(-((dy / 0.6) ** 2)) + Math.exp(-Math.abs(dy) / 0.05) * Math.exp(-((dx / 0.6) ** 2)))) * tw;
      c = mixc(c, WHITE, sat(sv)); a = Math.max(a, sat(sv));
    }
    if (flash) c = mixc(c, WHITE, 0.4);
    a *= halfMask(kind, mode, X, cov);
    if (a > 0.003) setPx(img, k, a, c);
  }
  return toRGBA(img);
};

/* 3. Low-poly mosaic: shapes built from small shimmering galaxy triangles */
UI_STYLES.mosaic = (kind, S, el, cols, t, mode, flash, seed) => {
  const live = isLive(mode), { W, H, P, buf, cov, img } = uiBase(kind, S, el, cols, t, seed, live);
  const sd = (X, Y) => kind === "heart" ? hsd(X, Y, 0.98) : kind === "armor" ? asd(X, Y, 0.98) : sdBox(X, Y, 91, 2.5, 90.7, 2.35, 1.4);
  const s = kind === "bar" ? 2.4 : 1.75, outC = rgb(14, 8, 30), edgeC = mixc(P.bright, WHITE, 0.45);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const k = j * W + i, X = (i + 0.5) / S, Y = (j + 0.5) / S, d = sd(X, Y);
    if (d > 0.05) continue;
    const v = Y / (s * 0.866), u = X / s - v * 0.5, iu = Math.floor(u), iv = Math.floor(v), fu = u - iu, fv = v - iv, tri = fu + fv < 1 ? 0 : 1;
    const e = (tri ? Math.min(1 - fu, 1 - fv, fu + fv - 1) : Math.min(fu, fv, 1 - fu - fv)) * s * 0.866;
    const h = uhash(iu, iv, tri + seed * 3), cu = iu + (tri ? 2 / 3 : 1 / 3), cv = iv + (tri ? 2 / 3 : 1 / 3);
    const CX = (cu + cv * 0.5) * s, CY = cv * s * 0.866;
    let c;
    if (live) {
      const ci = Math.min(W - 1, Math.max(0, Math.floor(CX * S))), cj = Math.min(H - 1, Math.max(0, Math.floor(CY * S)));
      const b = 0.62 + 0.8 * h + 0.22 * Math.sin(TAU * (t * (1 + Math.floor(h * 3)) + h * 5));
      c = mixc(scale3(gal(buf, cj * W + ci), b), scale3(P.cloud, b), 0.25);            // one flat colour per facet
      c = mixc(c, edgeC, sstep(0.06, 0.015, e) * 0.14);                                 // faint seams
    } else {
      c = mixc(rgb(26, 20, 46), rgb(46, 38, 74), h);
      c = mixc(c, rgb(70, 60, 104), sstep(0.06, 0.015, e) * 0.2);
    }
    if (d > -0.3) c = outC;
    if (flash) c = mixc(c, WHITE, 0.4);
    const a = cov(d) * halfMask(kind, mode, X, cov);
    if (a > 0) setPx(img, k, a, c);
  }
  return toRGBA(img);
};

/* 4. Cosmic rift: a jagged, glowing tear in space with the galaxy behind it */
UI_STYLES.rift = (kind, S, el, cols, t, mode, flash, seed) => {
  const live = isLive(mode), { E, W, H, P, buf, cov, img } = uiBase(kind, S, el, cols, t, seed, live);
  const bar = kind === "bar", hot = mixc(P.bright, WHITE, 0.55), glowC = mixc(P.cloud, P.bright, 0.5);
  const base = (X, Y) => kind === "heart" ? hsd(X, Y, 0.82) : kind === "armor" ? asd(X, Y, 0.84) : Math.abs(Y - 2.5) - (1.05 + 0.5 * vfbm(X * 0.45 + 7, 3.1, 3));
  const sd = (X, Y) => base(X, Y) + (bar ? 0.18 * vfbm(X * 1.4, Y * 2, 2) : 0.3 * vfbm(X * 1.6 + 11, Y * 1.6, 3) + 0.1 * vnoise(X * 6, Y * 6));
  const shards = [];
  if (live && !bar) for (let n = 0; n < 4; n++) { const th = TAU * (t + n / 4) + n; shards.push([4.5 + Math.cos(th) * 3.55, 4.5 + Math.sin(th) * 3.4, th * 1.3]); }
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const k = j * W + i, X = (i + 0.5) / S, Y = (j + 0.5) / S, d = sd(X, Y);
    const edgeFade = sstep(0, 0.8, Math.min(X, Y, E.w - X, E.h - Y));
    let c = glowC, a = 0;
    if (d < 0) {
      if (live) { c = mixc(scale3(gal(buf, k), 1.15), hot, Math.exp(d / 0.13)); a = cov(d); }
      else { c = mixc(rgb(12, 8, 22), scale3(glowC, 0.5), Math.exp(d / 0.12) * 0.6); a = cov(d) * 0.9; }
    }
    if (d > 0) { const ga = (live ? 0.85 : 0.3) * Math.exp(-d / (bar ? 0.25 : 0.32)) * edgeFade; if (ga > a) { c = mixc(glowC, hot, Math.exp(-d / 0.08)); a = Math.max(a, ga); } }
    for (const [sx, sy, r] of shards) {
      const dx = X - sx, dy = Y - sy, rx = dx * Math.cos(r) + dy * Math.sin(r), ry = -dx * Math.sin(r) + dy * Math.cos(r);
      const dd = Math.abs(rx) / 0.42 + Math.abs(ry) / 0.22 - 1;
      if (dd < 0.15) { const sa = sat(-dd / 0.15 + 0.5) * edgeFade; c = mixc(c, mixc(hot, glowC, sat(0.5 + rx)), sa); a = Math.max(a, sa); }
    }
    if (flash) c = mixc(c, WHITE, 0.4);
    a *= halfMask(kind, mode, X, cov);
    if (a > 0.003) setPx(img, k, a, c);
  }
  return toRGBA(img);
};

/* 5. Celestial gold: gold-rimmed galaxy with a crescent moon, stars and star caps */
UI_STYLES.celestial = (kind, S, el, cols, t, mode, flash, seed) => {
  const live = isLive(mode), { W, H, P, buf, cov, img } = uiBase(kind, S, el, cols, t, seed, live);
  const lc = Math.cos(225 * Math.PI / 180), ls = Math.sin(225 * Math.PI / 180), rim = 0.45, inkC = rgb(30, 16, 4);
  const sd = (X, Y) => kind === "heart" ? hsd(X, Y, 0.84, 0.3) : kind === "armor" ? asd(X, Y, 0.9) : sdBox(X, Y, 91, 2.5, 88.6, 2.05, 1.6);
  const orn = (X, Y) => {
    if (kind === "heart") {
      const moon = Math.max(Math.hypot(X - 1.95, Y - 1.5) - 0.95, -(Math.hypot(X - 2.42, Y - 1.25) - 0.8));
      return Math.min(moon, star4(X, Y, 7.05, 1.5, 1.0, 0.3));
    }
    if (kind === "armor") return star4(X, Y, 4.5, 5.0, 1.15, 0.34);
    let o = Math.min(star4(X, Y, 1.7, 2.5, 1.7, 0.5), star4(X, Y, 180.3, 2.5, 1.7, 0.5));
    for (let n = 1; n < 10; n++) o = Math.min(o, Math.hypot(X - (2 + n * 17.8), Y - 0.62) - 0.26);
    return o;
  };
  const gold = (X, Y, f, dim) => { let g = mixc(rgb(124, 72, 12), rgb(255, 228, 134), sat(0.5 + f * 0.55 + 0.18 * Math.sin((X + Y) * 3))); return dim ? mixc(g, rgb(90, 80, 70), 0.45) : g; };
  const e = 0.03;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const k = j * W + i, X = (i + 0.5) / S, Y = (j + 0.5) / S, d = sd(X, Y), o = orn(X, Y);
    if (d > 0.05 && o > 0.05) continue;
    let c = [0, 0, 0], a = 0;
    if (d < 0.05) {
      if (d < -rim) c = live ? gal(buf, k) : mixc(rgb(14, 12, 32), live ? WHITE : rgb(22, 18, 44), 0.2);
      else {
        const fx = (sd(X + e, Y) - sd(X - e, Y)) / (2 * e), fy = (sd(X, Y + e) - sd(X, Y - e)) / (2 * e);
        c = gold(X, Y, fx * lc + fy * ls, !live);
        c = mixc(c, inkC, sstep(-0.08, -0.02, d) + sstep(-rim + 0.08, -rim + 0.02, -d) * 0);
      }
      if (d > -0.09) c = inkC;
      if (Math.abs(d + rim) < 0.05) c = mixc(c, inkC, 0.8);
      a = cov(d);
    }
    if (o < 0.05) {
      const fx = (orn(X + e, Y) - orn(X - e, Y)) / (2 * e), fy = (orn(X, Y + e) - orn(X, Y - e)) / (2 * e);
      let oc = o > -0.07 ? inkC : gold(X, Y, (fx * lc + fy * ls) * 0.8 + 0.25, !live);
      const oa = cov(o); c = mixc(c, oc, oa); a = Math.max(a, oa);
    }
    if (flash) c = mixc(c, WHITE, 0.4);
    a *= halfMask(kind, mode, X, cov);
    if (a > 0) setPx(img, k, a, c);
  }
  return toRGBA(img);
};

/* Hardcore mark (vanilla's hardcore hearts): a dark chevron across the heart with a lit edge above it.
   lx, ly are heart-local coordinates (base px from the heart's centre, before scaling). */
function hardcoreMark(g, lx, ly, P, S, darkFill, fr) {
  // Exactly two marks, as on vanilla hardcore hearts: a thick diagonal stroke on each side, running from the upper
  // outer part of the heart down toward the middle, with a gap between them. Positions measured from a reference,
  // as fractions of the heart's own extent (fr, heart-local units).
  fr = fr || { cx: 0, cy: -0.2, w: 7.6, h: 7.6 };
  const top = fr.cy - fr.h / 2, hw = 0.056 * fr.w;
  let d = 9;
  for (const s of [-1, 1]) {
    const ax = fr.cx + s * 0.3 * fr.w, ay = top + 0.36 * fr.h, bx = fr.cx + s * 0.125 * fr.w, by = top + 0.54 * fr.h;
    const ex = bx - ax, ey = by - ay, q = sat(((lx - ax) * ex + (ly - ay) * ey) / (ex * ex + ey * ey));
    const w = hw * (1 - 0.25 * q);                                           // a little thinner toward the middle
    d = Math.min(d, Math.hypot(lx - ax - ex * q, ly - ay - ey * q) - w);
  }
  const m = sat(0.5 - d / Math.max(0.1, 1.2 / S));
  const markC = darkFill ? mixc(P.deep, P.cloud, 0.22) : scale3(P.deep, 0.6);
  return mixc(g, markC, m * 0.92);
}
