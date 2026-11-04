/* =====================================================================
   Palettes (every galaxy surface is built from three picked colours)
   ===================================================================== */
const hex = c => "#" + c.map(v => Math.round(sat(v) * 255).toString(16).padStart(2, "0")).join("");
const unhex = h => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
/* =====================================================================
   Icons
   ===================================================================== */
const covf = S => d => sat(0.5 - d * S);
const setPx = (img, p, a, c) => { img.a[p] = a; img.col[p * 3] = sat(c[0]); img.col[p * 3 + 1] = sat(c[1]); img.col[p * 3 + 2] = sat(c[2]); };
function bubbleIcon(S, popping, col) {
  const img = newImg(S, 9, 9), cov = covf(S), r = popping ? 3.6 : 3.3, base = unhex(col), ringC = mixc(base, WHITE, 0.6);
  for (let j = 0; j < img.H; j++) for (let i = 0; i < img.W; i++) {
    const X = (i + 0.5) / S, Y = (j + 0.5) / S, d = Math.hypot(X - 4.5, Y - 4.5) - r, p = j * img.W + i;
    let ring = cov(Math.abs(d) - 0.4), inside = cov(d);
    if (popping) { ring *= sstep(-0.2, 0.25, Math.cos(Math.atan2(Y - 4.5, X - 4.5) * 4 + 0.5)); inside = 0; }
    const h = popping ? 0 : sat(-sdEllipse(X, Y, 3.2, 3.1, 0.8, 0.45, -0.7) / 0.3);
    let c = mixc(base, ringC, ring); c = mixc(c, WHITE, h);
    const a = Math.max(ring, inside * 0.35, h * 0.9); if (a <= 0) continue;
    setPx(img, p, a, c);
  }
  return toRGBA(img);
}

function crosshairIcon(S, cfg) {
  const img = newImg(S, 16, 16), cov = covf(S), col = unhex(cfg.col), h = cfg.thick / 2, L = cfg.len;
  for (let j = 0; j < img.H; j++) for (let i = 0; i < img.W; i++) {
    const X = (i + 0.5) / S, Y = (j + 0.5) / S, p = j * img.W + i;
    const a = cov(Math.min(sdBox(X, Y, 7.5, 7.5, h, L), sdBox(X, Y, 7.5, 7.5, L, h)));
    if (a > 0) setPx(img, p, a, col);
  }
  return toRGBA(img);
}

function pingIcon(S, level) {
  const img = newImg(S, 10, 8), cov = covf(S), active = level < 5 ? 5 - level : 0;
  for (let j = 0; j < img.H; j++) for (let i = 0; i < img.W; i++) {
    const X = (i + 0.5) / S, Y = (j + 0.5) / S, p = j * img.W + i;
    let c = [0, 0, 0], a = 0;
    for (let b = 0; b < 5; b++) {
      const h = 2 + b * 1.5, m = cov(sdBox(X, Y, 0.9 + b * 2, 8 - h / 2, 0.75, h / 2, 0.25));
      const cc = level === 5 ? rgb(150, 30, 50) : b < active ? mixc(rgb(70, 230, 220), rgb(170, 120, 255), b / 4) : rgb(46, 40, 66);
      c = mixc(c, cc, m); a = Math.max(a, m);
    }
    if (level === 5) {
      let d = Math.min(Math.abs((X - 5) - (Y - 4)), Math.abs((X - 5) + (Y - 4))) - 0.5;
      d = Math.max(d, Math.max(Math.abs(X - 5), Math.abs(Y - 4)) - 2.6);
      const m = cov(d); c = mixc(c, rgb(255, 80, 100), m); a = Math.max(a, m);
    }
    if (a > 0) setPx(img, p, a, c);
  }
  return toRGBA(img);
}

