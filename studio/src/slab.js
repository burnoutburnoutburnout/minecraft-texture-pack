/* =====================================================================
   Smooth grilled steak, matched to a reference hunger bar: a thick black silhouette with an
   orange face set into its upper part (a deep black-brown band below it), soft grill stripes
   at the measured angle and spacing, and a pale rim on the face's top edge.
   Silhouette traced from the reference; colours measured from it.
   ===================================================================== */
const SLAB_BODY = [[8.455, 4.25], [8.296, 5.003], [7.968, 5.683], [7.491, 6.241], [6.959, 6.703], [6.439, 7.176], [5.88, 7.729], [5.173, 8.273], [4.29, 8.623], [3.316, 8.664], [2.351, 8.404], [1.484, 7.877], [0.834, 7.094], [0.53, 6.128], [0.593, 5.133], [0.918, 4.25], [1.397, 3.537], [1.964, 3.009], [2.531, 2.638], [2.991, 2.296], [3.349, 1.823], [3.762, 1.21], [4.371, 0.648], [5.16, 0.344], [6.015, 0.357], [6.836, 0.636], [7.55, 1.14], [8.077, 1.832], [8.376, 2.635], [8.482, 3.456]];
const SLAB_FACE = [[7.348, 4.25], [6.894, 4.705], [6.554, 5.053], [6.361, 5.42], [6.14, 5.794], [5.8, 6.069], [5.399, 6.247], [4.98, 6.443], [4.492, 6.697], [3.899, 6.866], [3.281, 6.793], [2.705, 6.521], [2.138, 6.147], [1.683, 5.615], [1.643, 4.91], [2.068, 4.25], [2.6, 3.793], [3.009, 3.474], [3.399, 3.268], [3.782, 3.174], [4.008, 2.965], [4.165, 2.45], [4.498, 1.852], [5.038, 1.506], [5.659, 1.452], [6.284, 1.592], [6.856, 1.91], [7.309, 2.39], [7.603, 2.979], [7.641, 3.635]];
{
  const slab = { b: "thin", outline: 0.95, outlineCol: "#030304", rough: [0, 4], thick: 0, custom: true,
    points: clone(SLAB_BODY), smooth: 1, rotate: 0, shadow: 0, light: 300, meatCol: "#864532",
    faceUp: 0.86, faceShift: 0.15 };
  const rest = Object.assign({}, DESIGNS);
  for (const k of Object.keys(DESIGNS)) delete DESIGNS[k];
  Object.assign(DESIGNS, { "smooth-grilled": slab }, rest);
  REAL_TEXTURES.unshift("smooth-grilled");
}
function slabSteakIcon(S, st, kind, flash, hunger, sh) {
  const cov = covf(S), W = 9 * S, img = newImg(S, 9, 9);
  const ow = sh.outline ?? 0.95, up = sh.faceUp ?? 0.86, shift = sh.faceShift ?? 0.15;
  const B = steakGrids(S, sh, 0, 2).D;
  // the face is the silhouette inset by the outline, with its bottom raised (leaving the black band below)
  const traced = JSON.stringify(sh.points) === JSON.stringify(SLAB_BODY);
  const B2 = traced ? steakGrids(S, Object.assign({}, sh, { points: SLAB_FACE }), 0, 2).D
    : steakGrids(S, Object.assign({}, sh, { posX: (sh.posX || 0) + shift, posY: (sh.posY || 0) - up }), 0, 2).D;
  const outC = unhex(sh.outlineCol || "#030304");
  const m = unhex(st.steakCol.meat), mul = (c, f) => [Math.min(1, c[0] * f[0]), Math.min(1, c[1] * f[1]), Math.min(1, c[2] * f[2])];
  const lightC = mul(m, [1.18, 1.22, 1.22]), darkC = mul(m, [0.7, 0.42, 0.24]), rimC = mixc(mul(m, [0.93, 1.3, 1.6]), rgb(124, 90, 80), 0.5);
  const under = mul(m, [0.25, 0.07, 0.04]);
  const a0 = (144 * Math.PI / 180) + (sh.burnAng || 0), ca = Math.cos(a0), sa = Math.sin(a0);
  const per = 1.08 * (sh.burnSpacing ?? 1), str = Math.min(1.6, sh.burnW ?? 1), off = sh.burnOffset || 0;
  for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) {
    const k = j * W + i, X = (i + 0.5) / S, Y = (j + 0.5) / S;
    let b = B[k]; if (kind === "half") b = Math.max(b, 4.5 - X);
    const a = cov(b); if (a <= 0) continue;
    let f = traced ? Math.max(B2[k], B[k] + ow) : Math.max(B[k], B2[k]) + ow; if (kind === "half") f = Math.max(f, 4.5 - X);
    let c;
    if (kind === "container") {
      const g = hunger ? rgb(28, 38, 18) : rgb(31, 33, 32);
      c = mixc(flash ? rgb(250, 240, 232) : outC, g, cov(b + 0.45));
    } else {
      // black silhouette, with a dark red-brown glow just below the face
      c = mixc(outC, under, sat(1 - f / 0.9) * sstep(3.2, 4.4, Y));
      if (f < 0.5) {
        const u = (X * ca + Y * sa) / per + off + 0.12 * vnoise(X * 3.1, Y * 3.1);
        const v = sstep(-0.75, 0.75, Math.cos(2 * Math.PI * u));                  // light bars and dark red grooves
        let fc = mixc(m, mixc(darkC, lightC, v), sat(str));
        fc = scale3(fc, 1.06 - 0.12 * sat((Y - 2.5) / 4));                          // a touch brighter at the top
        fc = mixc(fc, mixc(lightC, rgb(196, 112, 80), 0.4), sat(vnoise(X * 6.5 + 2, Y * 6.5 + 7) - 0.6) * 0.8 * sat(str)); // light flecks
        const topEdge = sstep(0.0, -0.35, f) * (1 - sstep(-0.6, -0.15, f));         // pale rim along the face edge,
        fc = mixc(fc, rimC, topEdge * sstep(4.6, 3.0, Y) * 0.35);                    // only on the upper part
        fc = scale3(fc, 1 - 0.22 * sstep(-0.45, 0, f));                              // face darkens into the outline
        if (hunger) fc = mixc(fc, unhex(st.hungerTint), 0.45);
        if (flash) fc = mixc(fc, WHITE, 0.4);
        c = mixc(c, fc, cov(f));
      }
      if (flash) c = mixc(c, rgb(250, 240, 232), sstep(-0.35, 0, b));
    }
    setPx(img, k, a, c);
  }
  return toRGBA(img);
}
