/* Illustrated gem heart: geometry traced from the reference, tones sampled from it (base-px coordinates). */
const GH = {"outer": [[0.2, 2.017], [1.781, 0.16], [3.697, 0.412], [4.512, 1.418], [5.326, 0.412], [7.243, 0.16], [8.8, 2.017], [8.441, 5.466], [4.512, 8.844], [0.583, 5.466]], "gem": [[0.979, 2.232], [2.116, 0.974], [3.674, 1.19], [4.512, 2.232], [5.35, 1.19], [6.908, 0.974], [8.045, 2.232], [7.806, 5.346], [4.512, 8.221], [1.218, 5.346]], "facets": [{"p": [[2.116, 0.974], [2.859, 2.112], [2.092, 2.927]], "t": 0.978, "table": false}, {"p": [[0.979, 2.232], [2.116, 0.974], [2.092, 2.927]], "t": 0.686, "table": false}, {"p": [[2.116, 0.974], [3.674, 1.19], [2.859, 2.112]], "t": 0.247, "table": false}, {"p": [[3.674, 1.19], [4.512, 2.232], [4.512, 3.011], [2.859, 2.112]], "t": 0.097, "table": false}, {"p": [[4.512, 2.232], [5.35, 1.19], [4.512, 3.011]], "t": 0.534, "table": false}, {"p": [[5.35, 1.19], [6.093, 2.112], [4.512, 3.011]], "t": 0.877, "table": false}, {"p": [[5.35, 1.19], [6.908, 0.974], [6.093, 2.112]], "t": 0.549, "table": false}, {"p": [[6.908, 0.974], [8.045, 2.232], [6.908, 2.927], [6.093, 2.112]], "t": 0.058, "table": false}, {"p": [[0.979, 2.232], [2.092, 2.927], [1.218, 5.346]], "t": 0.104, "table": false}, {"p": [[1.218, 5.346], [2.092, 2.927], [4.512, 6.484]], "t": 0.241, "table": false}, {"p": [[1.218, 5.346], [4.512, 6.484], [4.512, 8.221]], "t": 0.04, "table": false}, {"p": [[8.045, 2.232], [7.806, 5.346], [6.908, 2.927]], "t": 0.08, "table": false}, {"p": [[7.806, 5.346], [4.512, 6.484], [6.908, 2.927]], "t": 0.219, "table": false}, {"p": [[7.806, 5.346], [4.512, 8.221], [4.512, 6.484]], "t": 0.15, "table": false}, {"p": [[2.092, 2.927], [2.859, 2.112], [4.512, 3.011], [4.512, 6.484]], "t": 0.574, "table": true}, {"p": [[4.512, 3.011], [6.093, 2.112], [6.908, 2.927], [4.512, 6.484]], "t": 0.448, "table": true}], "face": [[0.639, 0.592, 0.561], [0.412, 0.333, 0.31], [0.231, 0.176, 0.173], [0.604, 0.569, 0.549], [0.471, 0.412, 0.4], [0.239, 0.184, 0.18], [0.169, 0.137, 0.129], [0.2, 0.149, 0.149], [0.176, 0.129, 0.125], [0.286, 0.22, 0.216]], "bevel": [[0.537, 0.463, 0.439], [0.439, 0.376, 0.357], [0.239, 0.2, 0.188], [0.616, 0.569, 0.557], [0.475, 0.4, 0.384], [0.298, 0.235, 0.227], [0.133, 0.106, 0.09], [0.157, 0.129, 0.125], [0.192, 0.149, 0.149], [0.196, 0.161, 0.149]]};
const GH_MATS = { stone: null, iron: [rgb(40, 44, 52), rgb(196, 202, 214)], gold: [rgb(110, 68, 10), rgb(255, 230, 140)],
  bronze: [rgb(80, 42, 18), rgb(226, 160, 96)], silver: [rgb(96, 98, 112), rgb(250, 252, 255)], obsidian: [rgb(10, 8, 16), rgb(96, 78, 128)] };
function pip(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function segDist(x, y, a, b) {
  const ex = b[0] - a[0], ey = b[1] - a[1], t = sat(((x - a[0]) * ex + (y - a[1]) * ey) / (ex * ex + ey * ey));
  return Math.hypot(x - a[0] - ex * t, y - a[1] - ey * t);
}
/* The framed gem heart drawn to match the reference: mitred stone frame lit per segment, a heart-shaped
   table with a centre crease, and triangular facets joining it to the outline. Colours follow the palette. */
const GH_AVG = GH.face.reduce((s, c) => [s[0] + c[0] / GH.face.length, s[1] + c[1] / GH.face.length, s[2] + c[2] / GH.face.length], [0, 0, 0]);
const GH_FRAME = (() => { const xs = GH.gem.map(p => p[0] - 4.5), ys = GH.gem.map(p => p[1] - 4.49);
  return { cx: (Math.min(...xs) + Math.max(...xs)) / 2, cy: (Math.min(...ys) + Math.max(...ys)) / 2, w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }; })();
function gemHeartIcon(S, el, cols, t, mode, flash, seed) {
  const img = newImg(S, 9, 9), cov = covf(S), W = 9 * S, P = elPal(el, cols, "heart"), sz = el.size;
  const ox = 4.5 + el.posX, oy = 4.49 + el.posY;
  const c1 = P.deep, c2 = P.cloud, c3 = P.bright, live = mode === "full" || mode === "half";
  const mats = GH_MATS[el.frameMat] || null, faceMax = 0.64, outC = unhex(el.outlineCol || "#0a0606");
  const pal = tt => tt < 0.5 ? mixc(c1, c2, tt * 2) : mixc(c2, c3, (tt - 0.5) * 2);
  const emptyC = unhex(el.emptyCol || "#0a0612");
  // gem fill: the cut ruby facets, or any texture (galaxy, nebula, lava...) seen through the cut facets
  const texFill = el.gemFill === "texture", tex = el.texture, fs = el.facetStr ?? 0.6, tt0 = live ? t : 0;
  const field = texFill && GALAXY_TEX[tex] ? starfield(S, 9, 9, tt0, P, galaxyOpts("heart", el, tex, seed)) : null;
  const q = { kind: "heart", el, P, t: el.motion === "random" ? randWarp(tt0, seed + 17) : tt0, seed, fv: null, X: 0, Y: 0, ex: 0, ey: 0 };
  for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) {
    const X = (i + 0.5) / S, Y = (j + 0.5) / S, x = 4.5 + (X - ox) / sz, y = 4.49 + (Y - oy) / sz;
    const dO = sdPolygon(x, y, GH.outer) * sz;
    let a = cov(dO); if (a <= 0) continue;
    const dG = sdPolygon(x, y, GH.gem) * sz;
    let frameC = null, gemC = null;
    if (dG > -0.08) {                                          // ---- frame ----
      let best = 9, seg = 0;
      for (let k = 0; k < 10; k++) { const dd = segDist(x, y, GH.outer[k], GH.outer[(k + 1) % 10]); if (dd < best) { best = dd; seg = k; } }
      // frame lighting (0 = flat, evenly coloured frame; 1 = each segment lit by the way it faces)
      const fl = el.frameLight ?? 0, f = mixc(GH_AVG, GH.face[seg], fl);
      const lum = (0.3 * f[0] + 0.59 * f[1] + 0.11 * f[2]) / faceMax;
      let m = mats ? mixc(mats[0], mats[1], sat(lerp(0.45, lum, fl))) : f.slice();
      const fromOut = -dO, toGem = dG;
      if (!mats) {                                             // weathered stone: grain, pits and scratches
        const n = 0.12 * fbm(seed + 9, X * 8, Y * 8) + 0.06 * samp(T[1], X * 40, Y * 40);
        m = scale3(m, 1 + n - 0.35 * sstep(1.25, 1.7, samp(T[3], X * 28, Y * 28)));
        m = mixc(m, scale3(m, 0.55), sstep(0.06, 0, Math.abs(fbm(seed + 21, X * 5, Y * 5))) * 0.7);
      } else m = scale3(m, 1 + 0.08 * samp(T[2], X * 20, Y * 3));
      const lit = lum > 0.55;
      if (fromOut < 0.16 * sz) m = mixc(m, lit ? mixc(m, WHITE, 0.35) : scale3(m, 0.75), fl);  // outer bevel
      m = mixc(m, rgb(196, 188, 182), sstep(0.06, 0.0, Math.abs(fromOut - 0.13 * sz)) * (lit ? 0.6 : 0.4) * fl);  // light edge all round
      if (!mats) m = mixc(m, rgb(170, 162, 156), sstep(1.35, 1.75, samp(T[5], X * 32, Y * 32)) * 0.45);      // pale grit specks
      if (toGem < 0.13 * sz) m = mixc(m, rgb(46, 26, 26), fl > 0 ? sstep(0.13 * sz, 0.05 * sz, toGem) * fl : 0); // dark lip into the gem
      m = mixc(m, outC, cov(Math.abs(toGem) - 0.035 * sz) * (1 - fl));                   // flat frame: a crisp line where it meets the gem
      m = mixc(m, outC, cov(fromOut - 0.08 * sz));                                          // thin dark outline
      frameC = m;
    }
    if (dG < 0.08) {                                           // ---- gem ----
      let fi = -1;
      for (let k = 0; k < GH.facets.length; k++) if (pip(x, y, GH.facets[k].p)) { fi = k; break; }
      if (fi < 0) { let bd = 9; GH.facets.forEach((F, k) => { const c = F.p.reduce((s, p) => [s[0] + p[0] / F.p.length, s[1] + p[1] / F.p.length], [0, 0]); const dd = Math.hypot(x - c[0], y - c[1]); if (dd < bd) { bd = dd; fi = k; } }); }
      const F = GH.facets[fi];
      let tt = F.t + 0.07 * ((x - 4.5) * -0.5 + (y - 4.5) * -0.5) / 4 + 0.025 * samp(T[2], X * 3, Y * 14);
      if (live && !texFill) tt += 0.05 * Math.sin(TAU * (t + fi * 0.37));          // slow shimmer between facets
      let g;
      if (texFill) {
        q.X = X; q.Y = Y; q.ex = (X - ox) / sz; q.ey = (Y - oy) / sz;
        if (field) { const k3 = (j * W + i) * 3; q.fv = [field[k3], field[k3 + 1], field[k3 + 2]]; }
        g = mixc(c2, texColor(tex, q), el.texStrength ?? 1);
        g = mixc(scale3(g, 1.3), c2, 0.16);                                  // lift it so a full heart reads clearly at HUD size
        const lf = 0.72 + 0.65 * sat(tt);                                    // each facet catches the light differently
        g = mixc(g, scale3(g, lf), fs);
        g = mixc(g, mixc(c3, WHITE, 0.5), sat(tt - 0.8) * 2 * fs * 0.6);     // glints on the brightest facets
      } else g = pal(sat(tt));
      let ld = 9; for (let k = 0; k < F.p.length; k++) ld = Math.min(ld, segDist(x, y, F.p[k], F.p[(k + 1) % F.p.length]));
      g = mixc(g, mixc(c3, WHITE, 0.3), sstep(0.045, 0.0, ld * sz) * (F.table ? 0.45 : 0.2) * (texFill ? fs : 1));   // facet edges
      g = scale3(g, 1 - 0.35 * sstep(0.2, 0, -dG) * (el.frameLight ?? 0));                   // shade under the frame lip
      if (el.hcMark && mode !== "container") g = hardcoreMark(g, x - 4.5, y - 4.49, P, S * sz, texFill || true, GH_FRAME);
      if (mode === "container") g = texFill ? mixc(emptyC, scale3(g, 0.18), 0.3) : mixc(emptyC, scale3(g, 0.35), 0.45);
      gemC = g;
    }
    let c = frameC && gemC ? mixc(frameC, gemC, cov(dG)) : (frameC || gemC);
    if (mode === "container") c = frameC && !gemC ? scale3(c, 0.7) : c;
    if (flash) c = mixc(c, WHITE, 0.4);
    if (mode === "half") a *= cov(X - ox);
    setPx(img, j * W + i, a, c);
  }
  return toRGBA(img);
}
