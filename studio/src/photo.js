/* =====================================================================
   Photo-real steak: a lit height field (rounded edges, seared crust, grill grooves),
   Maillard browning, cooked fat cap and marbling, wet specular highlights,
   a browned side with meat fibres and a soft contact shadow. No cartoon outline.
   ===================================================================== */
{
  DESIGNS_PHOTO: {
    const photo = { b: "rough", outline: 0, rough: [0.04, 7], thick: 0.55, custom: true, points: clone(BEAN_POINTS), smooth: 1, rotate: 0.12, shadow: 0.55 };
    const rest = Object.assign({}, DESIGNS);
    for (const k of Object.keys(DESIGNS)) delete DESIGNS[k];
    Object.assign(DESIGNS, { "photo-real": Object.assign({}, photo, { rough: [0.07, 5], thick: 0.6 }), "photo-grilled": photo }, rest);
    REAL_TEXTURES.unshift("photo-real", "photo-grilled");
  }
}

/* fine-grained value noise (no tiling) for crust detail */
const hash2 = (x, y) => fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453);
function vnoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy), b = hash2(ix + 1, iy), c = hash2(ix, iy + 1), d = hash2(ix + 1, iy + 1);
  return (a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy) * 2 - 1;
}
function vfbm(x, y, oct) {
  let s = 0, a = 0.5, f = 1, n = 0;
  for (let o = 0; o < oct; o++) { s += a * vnoise(x * f + o * 17.3, y * f + o * 9.1); n += a; a *= 0.5; f *= 2.03; }
  return s / n;
}
function photoSteakIcon(S, st, kind, flash, hunger, sh) {
  const seed = 2, cov = covf(S), W = 9 * S, n = W * W, img = newImg(S, 9, 9);
  const top = steakGrids(S, sh, 0, seed), side = steakGrids(S, sh, sh.thick, seed), D = top.D, DS = side.D;
  const B = new Float32Array(n);
  for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) {
    const k = j * W + i; B[k] = Math.min(D[k], DS[k]);
    if (kind === "half") B[k] = Math.max(B[k], 4.5 - (i + 0.5) / S);
  }
  const la = sh.light * Math.PI / 180, lc = Math.cos(la), ls = Math.sin(la);
  const nrm = v => { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; };
  const L = nrm([lc * 0.62, ls * 0.62, 0.78]), Hv = nrm([L[0], L[1], L[2] + 1]);
  // tint follows the meat colour (default meat colour = no tint)
  const mc = unhex(st.steakCol.meat), tint = [mc[0] / (112 / 255), mc[1] / (54 / 255), mc[2] / (36 / 255)];
  const tc = c => [Math.min(1, c[0] * tint[0]), Math.min(1, c[1] * tint[1]), Math.min(1, c[2] * tint[2])];
  const golden = tc(rgb(176, 104, 50)), mid = tc(rgb(124, 64, 30)), dark = tc(rgb(68, 33, 15)), char = rgb(30, 17, 11);
  // grill line geometry (shares the burn line controls)
  const spacing = sh.burnSpacing ?? 1, offset = sh.burnOffset ?? 0;
  let centres = [-2.4, -0.8, 0.8, 2.4].map(c => c * spacing + offset);
  if (sh.burnCount > 0) { centres = []; for (let q = 0; q < sh.burnCount; q++) centres.push((q - (sh.burnCount - 1) / 2) * 1.6 * spacing + offset); }
  const th = Math.atan(0.55) + 0.75 + (sh.burnAng || 0), gw = 0.13 * (sh.burnW ?? 1), cth = Math.cos(th), sth = Math.sin(th);

  // pass 1: height of the top face, plus fat cap and grill amounts
  const Hh = new Float32Array(n), CAP = new Float32Array(n), GR = new Float32Array(n), GD = new Float32Array(n);
  for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) {
    const k = j * W + i, d = D[k]; if (d > 0.3) continue;
    const X = (i + 0.5) / S, Y = (j + 0.5) / S, ex = top.EX[k], ey = top.EY[k];
    const gx = (D[j * W + Math.min(i + 1, W - 1)] - D[j * W + Math.max(i - 1, 0)]);
    const gy = (D[Math.min(j + 1, W - 1) * W + i] - D[Math.max(j - 1, 0) * W + i]);
    const gl = Math.hypot(gx, gy) || 1, up = (gx * 0.35 - gy * 0.94) / gl;              // outward normal pointing up
    const capW = 0.5 + 0.2 * samp(T[5], X * 2.2, Y * 2.2);
    const cap = sstep(0.2, 0.55, up) * sstep(-1.6, -0.4, ex) * sstep(capW + 0.08, capW - 0.08, -d) * (sh.fatCap ?? 1);
    let gdist = 9; const u = ex * cth + ey * sth + 0.05 * samp(T[2], X * 12, Y * 12);
    for (const c of centres) gdist = Math.min(gdist, Math.abs(u - c));
    const gap = sstep(-1.25, -0.85, samp(T[4], X * 2.2 + 5, Y * 2.2));
    const gwv = gw * (0.75 + 0.45 * sat(0.5 + 0.5 * samp(T[1], X * 3 + 7, Y * 3)));          // marks vary in width
    const groove = sstep(gwv + 0.035, gwv - 0.04, gdist + 0.03 * vnoise(X * 40, Y * 40)) * gap * (1 - cap * 0.7);
    const dome = Math.sqrt(sat(-d / 0.55)) * 0.2;
    const crust = 0.06 * (1 - Math.abs(vfbm(X * 6, Y * 6, 4))) + 0.022 * vfbm(X * 24 + 5, Y * 24 + 3, 2)
      + 0.03 * samp(T[5], X * 5, Y * 5);
    Hh[k] = dome + crust * (1 - cap * 0.75) - groove * 0.07 + cap * 0.04 + 0.012 * samp(T[2], X * 9, Y * 9) * cap;
    CAP[k] = cap; GR[k] = groove; GD[k] = gdist;
  }
  // pass 2: shade
  const sdx = Math.round(0.35 * S), sdy = Math.round(0.45 * S), shA = sh.shadow ?? 0.55, shadowC = rgb(10, 6, 4);
  const tintH = unhex(st.hungerTint);
  for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) {
    const k = j * W + i, X = (i + 0.5) / S, Y = (j + 0.5) / S, d = D[k], ds = DS[k], body = B[k];
    const a = cov(body);
    let sA = 0;
    if (shA > 0 && a < 1 && i >= sdx && j >= sdy) sA = shA * 0.6 * sat(0.5 - B[(j - sdy) * W + (i - sdx)] / 0.5) * (kind === "container" ? 0.5 : 1);
    if (a <= 0 && sA <= 0) continue;
    if (a <= 0) { setPx(img, k, sA, shadowC); continue; }
    let c;
    if (kind === "container") {
      let fill = hunger ? rgb(30, 40, 16) : rgb(46, 28, 20);
      fill = scale3(fill, 1.2 - 0.4 * sat((-((X - 4.5) * lc + (Y - 4.2) * ls) + 3) / 6));
      c = d < 0 ? fill : scale3(fill, 0.7);
      c = scale3(c, 1 - 0.5 * sstep(-0.18, 0, body));
      if (flash) c = mixc(c, WHITE, 0.5);
    } else if (d < 0) {
      const ex = top.EX[k], ey = top.EY[k], cap = CAP[k], groove = GR[k];
      // albedo: Maillard crust
      const n1 = fbm(seed + 5, X * 1.8, Y * 1.8), n3 = vfbm(X * 4 + 2, Y * 4 + 7, 4), n4 = vfbm(X * 14 + 9, Y * 14, 3);
      const grit = vnoise(X * 30 + 3, Y * 30 + 1), grit2 = vnoise(X * 55 + 8, Y * 55 + 2);
      let alb = mixc(dark, mid, sstep(-1.0, 0.6, n1) * 0.7 + 0.3);                           // broad deep / medium sear
      alb = mixc(alb, golden, sstep(-0.05, 0.55, n3 + 0.25 * n1) * 0.7);                     // caramelised golden areas
      alb = mixc(alb, dark, sstep(-0.1, -0.6, n3) * 0.55);                                  // darker mottling
      alb = scale3(alb, 0.9 + 0.2 * n4);                                                    // grainy variation
      alb = mixc(alb, mixc(golden, rgb(196, 128, 66), 0.3), sstep(0.72, 0.9, grit) * 0.5);   // bright caramelised specks
      alb = mixc(alb, char, sstep(-0.6, -0.85, grit2) * 0.8);                               // dark burnt specks
      alb = mixc(alb, dark, sstep(-0.9, -0.05, d) * 0.4);                                   // deeper sear at the edges
      // cooked marbling
      const m = Math.abs(fbm(seed + 7, ex * 3.0 + 11, ey * 4.6 + 5));
      const vein = sstep(0.07, 0.015, m) * (0.5 + 0.5 * sstep(-0.6, 0.6, samp(T[1], X * 2.5, Y * 2.5))) * (sh.marbling ?? 1);
      alb = mixc(alb, mixc(tc(rgb(196, 150, 100)), golden, 0.45), sat(vein) * 0.35);
      // fat cap: creamy inside, rendered golden-brown at the edge, thin seam where it meets the meat
      if (cap > 0) {
        const capW = 0.5 + 0.2 * samp(T[5], X * 2.2, Y * 2.2);
        let fat = mixc(rgb(230, 196, 146), rgb(158, 92, 40), sstep(capW * 0.7, 0.0, -d));    // rendered golden at the outside
        fat = scale3(fat, 0.9 + 0.15 * vfbm(X * 12, Y * 12, 3));
        fat = mixc(fat, rgb(132, 72, 30), sstep(0.15, 0.6, vfbm(X * 9 + 4, Y * 9, 3)) * 0.65); // crisped bits
        alb = mixc(alb, fat, cap);
        alb = mixc(alb, dark, sstep(0.07, 0, Math.abs(-d - capW)) * sstep(0.15, 0.5, cap + 0.3) * 0.7);
      }
      // grill marks: charred grooves with a dark scorched halo
      alb = mixc(alb, dark, sstep(gw + 0.24, gw, GD[k]) * 0.6 * sstep(-1.25, -0.85, samp(T[4], X * 2.2 + 5, Y * 2.2)) * (1 - cap * 0.5));
      const charTex = mixc(rgb(20, 12, 8), rgb(52, 28, 15), sat(0.4 + 0.7 * vfbm(X * 18 + 1, Y * 18 + 6, 3)));   // charred, not flat black
      alb = mixc(alb, charTex, groove * 0.95);
      alb = mixc(alb, golden, sstep(gw + 0.5, gw + 0.9, GD[k]) * 0.18);                     // lighter sear between the marks
      // lighting from the height field
      const hx = (Hh[j * W + Math.min(i + 1, W - 1)] - Hh[j * W + Math.max(i - 1, 0)]) * S / 2;
      const hy = (Hh[Math.min(j + 1, W - 1) * W + i] - Hh[Math.max(j - 1, 0) * W + i]) * S / 2;
      const N = nrm([-hx, -hy, 1]);
      const diff = Math.max(0, N[0] * L[0] + N[1] * L[1] + N[2] * L[2]), shade = (0.36 + 0.82 * diff) / (0.36 + 0.82 * L[2]);
      const nh = Math.max(0, N[0] * Hv[0] + N[1] * Hv[1] + N[2] * Hv[2]);
      const ao = (0.8 + 0.2 * sstep(0, 0.7, -d)) * (1 - groove * 0.25);
      c = scale3(alb, shade * ao);
      const wet = (0.35 + 0.65 * sstep(-0.3, 0.9, samp(T[0], X * 4 + 13, Y * 4 + 2))) * (sh.juice ?? 1);
      const rim = 1 - 0.75 * sstep(-0.45, -0.05, d);                                       // keep the edge from looking like plastic
      const spec = (wet * (0.08 * nh ** 24 + 0.9 * nh ** 110) * rim + cap * 0.1 * nh ** 30) * (1 - groove * 0.85);
      c = [c[0] + spec, c[1] + spec * 0.94, c[2] + spec * 0.86];
    } else {
      // browned side of the steak with vertical meat fibres, darker toward the bottom
      const tq = sat(d / Math.max(0.15, sh.thick * (sh.size || 1)));
      const fib = vfbm(X * 3, Y * 34, 3) * 0.12 + vfbm(X * 20, Y * 20, 2) * 0.08;
      c = scale3(mixc(tc(rgb(120, 62, 30)), tc(rgb(66, 32, 15)), tq), 0.72 + fib);
      c = mixc(c, mixc(golden, WHITE, 0.15), sstep(0.06, 0, d) * 0.35);                     // lit lip where top meets side
      c = scale3(c, 1 - 0.45 * sstep(-0.14, 0, ds));
    }
    if (kind !== "container") {
      c = scale3(c, 1 - 0.3 * sstep(-0.12, 0, body));                                      // soft silhouette edge
      if (hunger) c = mixc(c, tintH, 0.45);
      if (flash) c = mixc(c, WHITE, 0.4);
    }
    const A = a + sA * (1 - a), w = sA * (1 - a);
    setPx(img, k, A, [(c[0] * a + shadowC[0] * w) / A, (c[1] * a + shadowC[1] * w) / A, (c[2] * a + shadowC[2] * w) / A]);
  }
  return toRGBA(img);
}
