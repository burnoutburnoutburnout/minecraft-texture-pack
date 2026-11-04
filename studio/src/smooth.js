/* =====================================================================
   Smooth steak: a clean bean with a thick dark outline and a soft, lit reddish-brown fill
   (no texture, grill marks or fat). Colours measured from the reference hunger bar.
   ===================================================================== */
/* chunky bean outline traced from the reference hunger bar (average of its ten steaks) */
const SMOOTH_BEAN = [[0.84, 4.45], [1.23, 3.8], [1.72, 3.3], [2.22, 2.93], [2.65, 2.6], [3.02, 2.23], [3.39, 1.77], [3.86, 1.25], [4.5, 0.79], [5.28, 0.54], [6.1, 0.58], [6.86, 0.92], [7.46, 1.49], [7.85, 2.21], [8.06, 2.97], [8.1, 3.73], [7.98, 4.45], [7.73, 5.09], [7.38, 5.64], [6.98, 6.1], [6.55, 6.5], [6.12, 6.87], [5.66, 7.25], [5.13, 7.63], [4.5, 7.95], [3.77, 8.13], [2.98, 8.12], [2.21, 7.88], [1.53, 7.42], [1.02, 6.78], [0.71, 6.02], [0.65, 5.21]];
{
  const smooth = { b: "thick", outline: 0.85, outlineCol: "#0d0806", rough: [0, 4], thick: 0, custom: true,
    points: clone(SMOOTH_BEAN), smooth: 1, rotate: 0, shadow: 0, light: 300, smoothGrill: true };
  const rest = Object.assign({}, DESIGNS);
  for (const k of Object.keys(DESIGNS)) delete DESIGNS[k];
  Object.assign(DESIGNS, { "smooth-bean": smooth }, rest);
  REAL_TEXTURES.unshift("smooth-bean");
}
function smoothSteakIcon(S, st, kind, flash, hunger, sh) {
  const cov = covf(S), W = 9 * S, img = newImg(S, 9, 9);
  const top = steakGrids(S, sh, 0, 2), D = top.D, ow = sh.outline ?? 0.85;
  const la = (sh.light ?? 300) * Math.PI / 180, lc = Math.cos(la), ls = Math.sin(la);
  const mc = unhex(st.steakCol.meat), tint = [mc[0] / (112 / 255), mc[1] / (54 / 255), mc[2] / (36 / 255)];
  const tc = c => [Math.min(1, c[0] * tint[0]), Math.min(1, c[1] * tint[1]), Math.min(1, c[2] * tint[2])];
  const dark = tc(rgb(54, 31, 24)), base = tc(rgb(90, 51, 39)), light = tc(rgb(114, 68, 53)), glow = tc(rgb(128, 82, 66));
  const outC = unhex(sh.outlineCol || "#0d0806");
  // centre of the shape, for the light gradient and the soft highlight
  let cx = 0, cy = 0, cn = 0;
  for (let j = 0; j < W; j += 2) for (let i = 0; i < W; i += 2) if (D[j * W + i] < 0) { cx += (i + 0.5) / S; cy += (j + 0.5) / S; cn++; }
  cx = cn ? cx / cn : 4.5; cy = cn ? cy / cn : 4.5;
  const hx = cx + lc * 1.25, hy = cy + ls * 1.25, sdx = Math.round(0.35 * S), sdy = Math.round(0.45 * S), shA = sh.shadow ?? 0;
  for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) {
    const k = j * W + i, X = (i + 0.5) / S, Y = (j + 0.5) / S;
    let d = D[k]; if (kind === "half") d = Math.max(d, 4.5 - X);
    let a = cov(d), sA = 0;
    if (shA > 0 && a < 1 && i >= sdx && j >= sdy) sA = shA * 0.55 * sat(0.5 - D[(j - sdy) * W + (i - sdx)] / 0.45);
    if (a <= 0 && sA <= 0) continue;
    let c;
    if (kind === "container") {
      const f = hunger ? rgb(30, 40, 16) : rgb(40, 24, 18);
      c = mixc(flash ? rgb(250, 240, 232) : outC, scale3(f, 1.1 - 0.3 * sat(0.5 - ((X - cx) * lc + (Y - cy) * ls) / 5)), cov(d + ow));
    } else {
      const t = sat(0.5 + ((X - cx) * lc + (Y - cy) * ls) / 4.2);                       // lit side to shadow side
      let f = t < 0.5 ? mixc(dark, base, t * 2) : mixc(base, light, (t - 0.5) * 2);
      f = mixc(f, glow, sat(1 - Math.hypot(X - hx, Y - hy) / 1.9) ** 2 * 0.55);           // soft highlight on the lit lobe
      if (sh.smoothGrill) {                                                               // curved grill grooves, like ribs
        const nL = sh.burnCount > 0 ? sh.burnCount : 4, sp = 1.25 * (sh.burnSpacing ?? 1), w = 0.2 * (sh.burnW ?? 1);
        const th = (sh.burnAng || 0) + 0.12, ex = top.EX[k], ey = top.EY[k];
        const u = ex * Math.cos(th) + ey * Math.sin(th) - 0.13 * ey * ey;
        let best = 9;
        for (let q = 0; q < nL; q++) { const dd = u - ((q - (nL - 1) / 2) * sp + 0.35 + (sh.burnOffset || 0)); if (Math.abs(dd) < Math.abs(best)) best = dd; }
        const inside = sstep(0.05, 0.5, -(d + ow));
        const line = sstep(w + 0.05, w - 0.06, Math.abs(best)) * inside;
        const ridge = sstep(w * 2.4, w * 1.1, Math.abs(best + w * 1.8)) * (1 - line) * inside;   // lit edge of each groove
        f = mixc(f, mixc(scale3(base, 0.45), tc(rgb(96, 24, 14)), 0.5), line * 0.95);
        f = mixc(f, mixc(light, glow, 0.7), ridge * 0.55);
      }
      f = scale3(f, 1 - 0.32 * sstep(-1.0, -0.05, d + ow));                               // shading toward the outline
      f = scale3(f, 1 + 0.035 * vfbm(X * 6 + 3, Y * 6 + 1, 2));                           // faint natural grain
      if (hunger) f = mixc(f, unhex(st.hungerTint), 0.45);
      if (flash) f = mixc(f, WHITE, 0.4);
      c = mixc(flash ? rgb(250, 240, 232) : outC, f, cov(d + ow));
    }
    if (sA > 0) { const A = a + sA * (1 - a), w = sA * (1 - a); c = [(c[0] * a + 0.04 * w) / A, (c[1] * a + 0.02 * w) / A, (c[2] * a + 0.015 * w) / A]; a = A; }
    setPx(img, k, a, c);
  }
  return toRGBA(img);
}
