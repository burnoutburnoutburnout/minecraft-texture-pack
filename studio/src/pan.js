/* =====================================================================
   Pan-seared ribeye (photo-real): deep mahogany sear with butter-glossy sheen, a raised
   central eye, a golden fat seam curving around it, rendered fat pockets at the edge,
   muscle-fibre wrinkles, a seared side and a soft contact shadow. Colours sampled from a
   photo of pan-seared ribeyes.
   ===================================================================== */
function panSteakIcon(S, st, kind, flash, hunger, sh) {
  const seed = 2, cov = covf(S), W = 9 * S, n = W * W, img = newImg(S, 9, 9);
  const top = steakGrids(S, sh, 0, seed), side = steakGrids(S, sh, sh.thick, seed), D = top.D, DS = side.D;
  const B = new Float32Array(n);
  for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) {
    const k = j * W + i; B[k] = Math.min(D[k], DS[k]);
    if (kind === "half") B[k] = Math.max(B[k], 4.5 - (i + 0.5) / S);
  }
  const la = sh.light * Math.PI / 180, lc = Math.cos(la), ls = Math.sin(la);
  const nrm = v => { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; };
  const L = nrm([lc * 0.6, ls * 0.6, 0.8]), Hv = nrm([L[0], L[1], L[2] + 1]);
  const mc = unhex(st.steakCol.meat), tint = [mc[0] / (112 / 255), mc[1] / (54 / 255), mc[2] / (36 / 255)];
  const tc = c => [Math.min(1, c[0] * tint[0]), Math.min(1, c[1] * tint[1]), Math.min(1, c[2] * tint[2])];
  // sampled from the photo: shadowed sear, mid sear, reddish-brown, light caramel
  const dark = tc(rgb(44, 17, 9)), mid = tc(rgb(80, 36, 20)), red = tc(rgb(116, 50, 30)), light = tc(rgb(148, 84, 56));
  const fatLo = rgb(146, 98, 54), fatHi = rgb(204, 162, 104);
  const ex0 = -0.55, ey0 = 0.4, erx = 2.6, ery = 1.72;            // the ribeye's central eye
  const Hh = new Float32Array(n), SEAM = new Float32Array(n), POCK = new Float32Array(n), EYE = new Float32Array(n), CR = new Float32Array(n), PEB = new Float32Array(n);
  for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) {
    const k = j * W + i, d = D[k]; if (d > 0.3) continue;
    const X = (i + 0.5) / S, Y = (j + 0.5) / S, ex = top.EX[k], ey = top.EY[k];
    const ee = Math.hypot((ex - ex0) / erx, (ey - ey0) / ery) + 0.15 * vfbm(ex * 0.6 + 3, ey * 0.6, 3);
    const capSide = sstep(-0.35, 0.35, -(ey - ey0) / ery * 0.8 + (ex - ex0) / erx * 0.55);
    const seamD = Math.abs(ee - 1) * 1.9;
    const seam = sstep(0.21, 0.06, seamD + 0.06 * vfbm(X * 4, Y * 4, 2)) * capSide * sstep(-0.15, -0.6, d) * (sh.marbling ?? 1);
    // rendered fat pockets along the edge
    const gxd = D[j * W + Math.min(i + 1, W - 1)] - D[j * W + Math.max(i - 1, 0)], gyd = D[Math.min(j + 1, W - 1) * W + i] - D[Math.max(j - 1, 0) * W + i];
    const lower = sstep(-0.2, 0.5, (gxd * 0.45 + gyd * 0.9) / (Math.hypot(gxd, gyd) || 1));        // pockets sit on the lower edge
    const pock = sstep(0.05, 0.4, vfbm(X * 1.3 + 20, Y * 1.3 + 3, 2) + 0.2 * lower) * lower * sstep(-0.5, -0.22, d) * (sh.fatCap ?? 1);   // golden rendered fat along the lower rim
    const dome = Math.sqrt(sat(-d / 0.6)) * 0.2;
    const eye = sstep(1.08, 0.7, ee);
    const peb = 1 - Math.abs(vfbm(X * 11, Y * 11, 3));                                       // pebbly seared crust
    const crust = (0.04 * peb + 0.01 * vfbm(X * 30 + 5, Y * 30 + 3, 2)) * (1 - 0.25 * eye);
    const fibre = 0.009 * vfbm(ex * 1.6 + 7, ey * 5 + 2, 3) * (1 - eye) + 0.004 * vfbm(ee * 7, Math.atan2(ey - ey0, ex - ex0) * 2, 2) * eye;
    const crease = sstep(0.12, 0.02, Math.abs(ee - 1) * 1.9) * sstep(-0.15, -0.6, d) * (1 - capSide * 0.6);
    const undulate = 0.12 * vfbm(X * 1.3 + 31, Y * 1.3 + 17, 3);                          // gentle lumps that catch the sheen
    Hh[k] = dome + crust + fibre + undulate + eye * 0.05 + (1 - eye) * capSide * 0.03 - seam * 0.045 - crease * 0.05 + pock * 0.03 * (0.6 + 0.4 * vfbm(X * 5, Y * 5, 2));
    SEAM[k] = seam; POCK[k] = pock; EYE[k] = eye; CR[k] = crease; PEB[k] = peb;
  }
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
      const seam = SEAM[k], pock = POCK[k], crease = CR[k];
      const hx = (Hh[j * W + Math.min(i + 1, W - 1)] - Hh[j * W + Math.max(i - 1, 0)]) * S / 2;
      const hy = (Hh[Math.min(j + 1, W - 1) * W + i] - Hh[Math.max(j - 1, 0) * W + i]) * S / 2;
      const N = nrm([-hx, -hy, 1]);
      // albedo: mottled mahogany sear, darker on the high spots and toward the edge
      const n1 = fbm(seed + 5, X * 1.6, Y * 1.6), n3 = vfbm(X * 3 + 2, Y * 3 + 7, 4), n4 = vfbm(X * 12 + 9, Y * 12, 3);
      let alb = mixc(mid, red, sstep(-0.35, 0.45, n3 + 0.3 * n1));
      alb = mixc(alb, light, sstep(0.25, 0.75, n3 + 0.2 * n1) * 0.55);
      alb = mixc(alb, dark, sstep(-0.05, -0.6, n3) * 0.6);
      alb = mixc(alb, dark, sstep(0.6, 0.3, PEB[k]) * 0.35);                                // dark in the pits between crust bumps
      alb = mixc(alb, light, sstep(0.78, 0.95, PEB[k]) * 0.15);                               // caramelised tops of the bumps
      alb = scale3(alb, 0.9 + 0.18 * n4);
      alb = mixc(alb, rgb(26, 11, 6), sstep(-0.5, -0.8, vnoise(X * 46 + 3, Y * 46 + 9)) * 0.6);   // fine dark crust specks
      alb = mixc(alb, rgb(26, 11, 6), crease * 0.75);                                        // dark crease around the eye
      alb = mixc(alb, dark, sstep(-0.7, -0.05, d) * 0.5);
      // golden fat seam around the eye, with dark crevices along it
      const fatC = mixc(fatLo, fatHi, sat(0.45 + 0.6 * vfbm(X * 8, Y * 8, 2)));
      alb = mixc(alb, rgb(34, 16, 8), sstep(0, 0.3, seam) * (1 - sstep(0.35, 0.7, seam)) * 0.5);   // crevice either side
      alb = mixc(alb, mixc(fatC, rgb(128, 76, 36), 0.4), sstep(0.35, 0.8, seam));
      // rendered fat pockets
      alb = mixc(alb, mixc(rgb(164, 112, 60), rgb(118, 66, 30), sstep(0.8, 0.2, pock) * 0.5), sstep(0.1, 0.6, pock) * 0.7);
      alb = mixc(alb, red, EYE[k] * 0.22);
      alb = mixc(alb, dark, (1 - EYE[k]) * sstep(-0.3, 0.6, vfbm(X * 1.1 + 5, Y * 1.1 + 9, 2)) * 0.35);   // deeper browning on the cap                                                  // the eye is a touch redder and smoother
      const diff = Math.max(0, N[0] * L[0] + N[1] * L[1] + N[2] * L[2]), shade = (0.38 + 0.8 * diff) / (0.38 + 0.8 * L[2]);
      const nh = Math.max(0, N[0] * Hv[0] + N[1] * Hv[1] + N[2] * Hv[2]);
      const ao = (0.8 + 0.2 * sstep(0, 0.6, -d)) * (1 - 0.2 * sstep(0.1, 0.5, seam) * (1 - sstep(0.5, 0.9, seam)));
      c = scale3(alb, shade * ao);
      const meatW = 1 - Math.max(sstep(0.35, 0.8, seam), sstep(0.1, 0.6, pock) * 0.7);      // calibrated to the photo's measured browns
      c = [c[0] * lerp(1, 1.42, meatW), c[1] * lerp(1, 1.72, meatW), c[2] * lerp(1, 1.62, meatW)];
      // butter-glossy sheen: broad soft shine plus sharp glints; fat is the shiniest
      const wet = sstep(-0.5, 0.9, samp(T[0], X * 2.4 + 13, Y * 2.4 + 2)) * (sh.juice ?? 1);
      const rim = 1 - 0.6 * sstep(-0.4, -0.05, d);
      const glossy = Math.max(sstep(0.5, 0.9, seam), sstep(0.2, 0.6, pock));
      const spec = (0.25 + 0.75 * wet) * rim * (0.38 * nh ** 50 + 0.8 * nh ** 180) + glossy * (0.22 * nh ** 36 + 0.5 * nh ** 110);
      c = [c[0] + spec, c[1] + spec * 0.86, c[2] + spec * 0.7];                              // warm, buttery highlights
    } else {
      const tq = sat(d / Math.max(0.15, sh.thick * (sh.size || 1)));
      const fib = vfbm(X * 3, Y * 34, 3) * 0.12 + vfbm(X * 20, Y * 20, 2) * 0.08;
      c = scale3(mixc(mid, dark, tq), 0.78 + fib);
      c = mixc(c, light, sstep(0.06, 0, d) * 0.3);
      const pk = sstep(0.32, 0.62, vfbm(X * 1.15 + 20, (Y - sh.thick * 0.5) * 1.15 + 3, 2)) * (sh.fatCap ?? 1);
      c = mixc(c, scale3(mixc(fatLo, fatHi, 0.3), 0.85), pk * 0.7);                          // fat showing on the side
      c = scale3(c, 1 - 0.45 * sstep(-0.14, 0, ds));
    }
    if (kind !== "container") {
      c = scale3(c, 1 - 0.3 * sstep(-0.12, 0, body));
      if (hunger) c = mixc(c, tintH, 0.45);
      if (flash) c = mixc(c, WHITE, 0.4);
    }
    const A = a + sA * (1 - a), w = sA * (1 - a);
    setPx(img, k, A, [(c[0] * a + shadowC[0] * w) / A, (c[1] * a + shadowC[1] * w) / A, (c[2] * a + shadowC[2] * w) / A]);
  }
  return toRGBA(img);
}
