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
/* Air bubbles. The style and its settings come from st.bubble (when the settings exist). */
const BUBBLE_STYLES = { classic: "Classic", glass: "Glass orb", galaxy: "Galaxy orb", ring: "Ring", soap: "Soap bubble", planet: "Planet",
  droplet: "Droplet", star: "Star", crystal: "Crystal", hexagon: "Hexagon", moon: "Moon", cluster: "Cluster", sparkle: "Sparkle", cube: "Cube", comet: "Comet",
  pearl: "Pearl", neon: "Neon ring", pixel: "Pixel", marble: "Marble", atom: "Atom", lifebuoy: "Life ring", rainbow: "Rainbow", dotted: "Dotted",
  heart: "Heart", fish: "Fish", shell: "Seashell", jelly: "Jellyfish", flower: "Flower", bolt: "Lightning" };
/* Shaped bubbles: each has its own outline (signed distance in base px around the slot centre). */
const bsmin = (a, b, k) => { const h = sat(0.5 + 0.5 * (b - a) / k); return b * (1 - h) + a * h - k * h * (1 - h); };
const starPts = (n, ro, ri, rot, cx = 4.5, cy = 4.6) => { const p = []; for (let i = 0; i < 2 * n; i++) { const r = i % 2 ? ri : ro, t = rot + Math.PI * i / n; p.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]); } return p; };
const SHELL_PTS = [[4.5, 7.6], ...Array.from({ length: 15 }, (_, k) => { const a = (-162 + k * 144 / 14) * Math.PI / 180; return [4.5 + 4.4 * Math.cos(a), 7.5 + 4.6 * Math.sin(a)]; })];
const BUBBLE_SHAPES = {
  droplet: { sd: (X, Y) => bsmin(Math.hypot(X - 4.5, Y - 5.5) - 2.55, sdPolygon(X, Y, [[4.5, 0.7], [6.25, 4.6], [2.75, 4.6]]), 0.9), hl: [3.4, 4.6] },
  star: { pts: starPts(5, 4.0, 1.95, -Math.PI / 2), round: 0.35, hl: [3.7, 3.6] },
  crystal: { pts: [[2.7, 1.3], [6.3, 1.3], [8.1, 3.5], [4.5, 8.3], [0.9, 3.5]], round: 0.12, hl: [3.3, 2.7], facets: true },
  hexagon: { pts: starPts(6, 3.8, 3.8, -Math.PI / 2, 4.5, 4.5).filter((_, i) => i % 2 === 0), round: 0.3, hl: [3.2, 3.2] },
  moon: { sd: (X, Y) => Math.max(Math.hypot(X - 4.4, Y - 4.6) - 3.5, -(Math.hypot(X - 6.2, Y - 3.3) - 2.85)), hl: [2.4, 4.3] },
  cluster: { circles: [[3.35, 5.45, 2.35], [6.4, 5.3, 1.65], [5.25, 2.45, 1.3]] },
  sparkle: { pts: starPts(4, 4.2, 1.15, -Math.PI / 2, 4.5, 4.5), round: 0.25, hl: [3.9, 3.7] },
  cube: { sd: (X, Y) => sdBox(X, Y, 4.5, 4.5, 3.2, 3.2, 1.0), hl: [3.0, 2.9] },
  comet: { sd: (X, Y) => {
      const head = Math.hypot(X - 5.7, Y - 3.4) - 2.3, ax = 5.7, ay = 3.4, bx = 1.0, by = 8.1;
      const ex = bx - ax, ey = by - ay, t = sat(((X - ax) * ex + (Y - ay) * ey) / (ex * ex + ey * ey));
      const tail = Math.hypot(X - ax - ex * t, Y - ay - ey * t) - lerp(1.9, 0.15, t);
      return bsmin(head, tail, 0.5); }, hl: [4.9, 2.5] },
  heart: { sd: (X, Y) => bsmin(Math.min(Math.hypot(X - 3.05, Y - 3.55) - 1.85, Math.hypot(X - 5.95, Y - 3.55) - 1.85), sdPolygon(X, Y, [[1.35, 4.2], [7.65, 4.2], [4.5, 8.1]]), 0.6), hl: [2.6, 2.9] },
  fish: { sd: (X, Y) => bsmin(sdEllipse(X, Y, 5.2, 4.6, 2.75, 1.85, 0), sdPolygon(X, Y, [[2.9, 4.6], [0.6, 2.4], [0.6, 6.8]]), 0.45), hl: [5.0, 3.6],
    deco: (X, Y, c, base, acc) => { const eye = Math.hypot(X - 6.75, Y - 4.0); c = mixc(c, rgb(15, 15, 30), sat((0.42 - eye) * 6));
      const gill = Math.abs(Math.hypot(X - 3.9, Y - 4.6) - 1.5); return mixc(c, mixc(base, WHITE, 0.55), sat((0.12 - gill) * 6) * (X > 4.2 ? 0.8 : 0)); } },
  shell: { sd: (X, Y) => { const a = Math.atan2(Y - 7.5, X - 4.5), r = Math.hypot(X - 4.5, Y - 7.5);
      const fan = sdPolygon(X, Y, SHELL_PTS) - 0.15, scal = 0.3 * Math.abs(Math.sin((a + Math.PI / 2) * 9)) * sat((r - 3.2) / 1.2);
      return Math.min(fan + scal, sdBox(X, Y, 4.5, 8.0, 1.1, 0.55, 0.2)); }, hl: [3.3, 3.6],
    deco: (X, Y, c) => { const a = Math.atan2(Y - 7.5, X - 4.5), rib = Math.abs(Math.sin((a + Math.PI / 2) * 9)), r = Math.hypot(X - 4.5, Y - 7.5);
      return mixc(c, scale3(c, 0.62), sstep(0.25, 0.05, rib) * 0.8 * sat((r - 0.8) / 1.5) * (Y < 7.6 ? 1 : 0)); } },
  jelly: { sd: (X, Y) => { const dome = Math.max(Math.hypot(X - 4.5, Y - 4.6) - 3.6, Y - 4.9);
      let ten = 9; for (const tx of [2.3, 3.8, 5.3, 6.7]) ten = Math.min(ten, Math.max(Math.abs(X - tx - 0.35 * Math.sin(Y * 2.3 + tx)) - 0.32, Math.abs(Y - 6.6) - 1.9));
      return Math.min(dome, ten); }, hl: [3.3, 2.4],
    deco: (X, Y, c, base, acc) => { let spot = 9; for (const [sx, sy] of [[3.2, 3.4], [5.4, 2.6], [5.8, 4.0]]) spot = Math.min(spot, Math.hypot(X - sx, Y - sy) - 0.4); return mixc(c, mixc(acc, WHITE, 0.3), sat(-spot * 5) * 0.7); } },
  flower: { circles: [...[0, 1, 2, 3, 4].map(k => [4.5 + 2.45 * Math.cos(-Math.PI / 2 + k * TAU / 5), 4.6 + 2.45 * Math.sin(-Math.PI / 2 + k * TAU / 5), 1.6]), [4.5, 4.6, 1.4]],
    deco: (X, Y, c, base, acc) => mixc(c, mixc(acc, WHITE, 0.15), sat((1.15 - Math.hypot(X - 4.5, Y - 4.6)) * 4)) },
  bolt: { pts: [[5.6, 0.5], [2.0, 5.0], [4.3, 5.0], [3.2, 8.5], [7.2, 3.7], [4.9, 3.7], [6.2, 0.5]], round: 0.18, hl: [4.6, 2.2] },
};
function shapedBubble(S, popping, col, cfg) {
  const B = BUBBLE_SHAPES[cfg.style], img = newImg(S, 9, 9), cov = covf(S), sz = cfg.size, base = unhex(col), acc = unhex(cfg.accent);
  const rimC = mixc(base, WHITE, 0.6), rimW = 0.36 * cfg.rim, popK = popping ? 1.1 : 1;
  const sdRaw = (X, Y) => {
    if (B.circles) return Math.min(...B.circles.map(([cx, cy, r]) => Math.hypot(X - cx, Y - cy) - r));
    if (B.sd) return B.sd(X, Y);
    return sdPolygon(X, Y, B.pts) - B.round;
  };
  const sd = (X, Y) => sdRaw(4.5 + (X - 4.5) / (sz * popK), 4.5 + (Y - 4.5) / (sz * popK)) * sz * popK;
  const hls = B.circles ? B.circles.map(([cx, cy, r]) => [cx - r * 0.38, cy - r * 0.42, r * 0.36]) : [[B.hl[0], B.hl[1], 0.75]];
  for (let j = 0; j < img.H; j++) for (let i = 0; i < img.W; i++) {
    const X = (i + 0.5) / S, Y = (j + 0.5) / S, p = j * img.W + i, d = sd(X, Y);
    let c, a;
    if (popping) {
      const ang = Math.atan2(Y - 4.5, X - 4.5);
      a = cov(Math.abs(d) - rimW * 0.8) * sstep(-0.2, 0.25, Math.cos(ang * 5 + 0.7)); c = rimC;
      for (let k = 0; k < 5; k++) { const t = k * TAU / 5 + 0.3, dd = Math.hypot(X - 4.5 - Math.cos(t) * 4.0 * sz, Y - 4.5 - Math.sin(t) * 4.0 * sz) - 0.3 * sz; const da = cov(dd); if (da > a) { a = da; c = rimC; } }
    } else {
      if (d > 0.05) continue;
      const L = sat(0.55 - ((X - 4.5) + (Y - 4.5)) / (6.5 * sz));
      c = mixc(scale3(base, 0.45), mixc(base, WHITE, 0.2), L);
      c = mixc(c, mixc(base, acc, 0.5), sstep(-1.6 * sz, 0, d) * 0.25);              // tinted toward the edge
      if (B.facets) {                                                                 // crystal: facet lines from the table
        const fd = Math.min(Math.abs(Y - 3.5 * 1) , ...[[2.7, 1.3], [6.3, 1.3]].map(([x0, y0]) => Math.abs((X - x0) * (8.3 - y0) - (Y - y0) * (4.5 - x0)) / Math.hypot(8.3 - y0, 4.5 - x0)));
        c = mixc(c, mixc(base, WHITE, 0.55), cov(fd - 0.07) * 0.6);
        c = mixc(c, mixc(base, WHITE, 0.35), (Y < 3.5 ? 0.25 : 0) * (X > 4.5 ? 0.4 : 1));
      }
      if (B.deco) c = B.deco(4.5 + (X - 4.5) / sz, 4.5 + (Y - 4.5) / sz, c, base, acc);
      const rim = cov(Math.abs(d + rimW * 0.55) - rimW * 0.55);
      a = Math.max(cov(d) * 0.55, rim);
      c = mixc(c, rimC, rim);
      let h = 0;
      for (const [hx, hy, hr] of hls) h = Math.max(h, sat(-sdEllipse(X, Y, 4.5 + (hx - 4.5) * sz, 4.5 + (hy - 4.5) * sz, hr * sz, hr * 0.5 * sz, -0.7) / 0.22));
      h *= cfg.shine * cov(d + 0.25); c = mixc(c, WHITE, h); a = Math.max(a, h * 0.95);
    }
    a *= cfg.alpha; if (a <= 0.003) continue;
    setPx(img, p, a, c);
  }
  return toRGBA(img);
}
function bubbleIcon(S, popping, col, cfg) {
  cfg = Object.assign({ style: "classic", accent: "#ffffff", size: 1, rim: 1, shine: 1, alpha: 1 }, cfg || (typeof st !== "undefined" ? st.bubble : {}));
  if (BUBBLE_SHAPES[cfg.style]) return shapedBubble(S, popping, col, cfg);
  const img = newImg(S, 9, 9), cov = covf(S), sz = cfg.size, R = 3.3 * sz, base = unhex(col), acc = unhex(cfg.accent), rimW = 0.4 * cfg.rim;
  const style = cfg.style, rimC = mixc(base, WHITE, 0.6);
  const pal = { dark: scale3(base, 0.12), deep: scale3(base, 0.35), cloud: base, cloud2: mixc(base, acc, 0.4), bright: mixc(base, WHITE, 0.5),
    tint: acc, star: WHITE, starMul: 1 };
  const field = style === "galaxy" && !popping ? starfield(S, 9, 9, 0.2, pal, { seed: 11, scale: [16, 16], dens: 0.12, big: 0.02 }) : null;
  for (let j = 0; j < img.H; j++) for (let i = 0; i < img.W; i++) {
    const X = (i + 0.5) / S, Y = (j + 0.5) / S, dx = X - 4.5, dy = Y - 4.5, r = Math.hypot(dx, dy), ang = Math.atan2(dy, dx), p = j * img.W + i;
    let c = [0, 0, 0], a = 0;
    const put = (col2, al) => { if (al <= 0) return; c = a > 0 ? mixc(c, col2, al / Math.min(1, a + al)) : col2; a = Math.min(1, a + al * (1 - a)); };
    if (popping) {                                            // every style pops into broken arcs and a few droplets
      const rr = R * 1.12, ring = cov(Math.abs(r - rr) - rimW) * sstep(-0.2, 0.25, Math.cos(ang * 4 + 0.5));
      const pc = style === "soap" ? [0.5 + 0.5 * Math.cos(ang * 2), 0.5 + 0.5 * Math.cos(ang * 2 - 2.1), 0.5 + 0.5 * Math.cos(ang * 2 + 2.1)] : style === "planet" ? acc : rimC;
      put(pc, ring);
      for (let k = 0; k < 4; k++) { const t = k * TAU / 4 + 0.95, d = Math.hypot(X - 4.5 - Math.cos(t) * (rr + 0.9), Y - 4.5 - Math.sin(t) * (rr + 0.9)) - 0.32 * sz; put(pc, cov(d)); }
    } else if (style === "classic") {
      const d = r - R, ring = cov(Math.abs(d) - rimW), h = sat(-sdEllipse(X, Y, 4.5 - 1.3 * sz, 4.5 - 1.4 * sz, 0.8 * sz, 0.45 * sz, -0.7) / 0.3) * cfg.shine;
      c = mixc(base, rimC, ring); c = mixc(c, WHITE, h); a = Math.max(ring, cov(d) * 0.35, h * 0.9);
    } else if (style === "glass") {
      const d = r - R, inside = cov(d), ring = cov(Math.abs(d + rimW * 0.5) - rimW * 0.7);
      const L = sat(0.5 - (dx + dy) / (2.6 * R));
      let g = mixc(scale3(base, 0.35), mixc(base, WHITE, 0.25), L);
      g = mixc(g, mixc(base, WHITE, 0.7), sstep(R * 0.55, R, r) * sstep(0, 1, (dx + dy) / R) * 0.6);       // light through the far side
      put(g, inside * 0.78); put(mixc(base, WHITE, 0.55), ring * 0.9);
      put(WHITE, sat(-sdEllipse(X, Y, 4.5 - 1.15 * sz, 4.5 - 1.3 * sz, 1.0 * sz, 0.5 * sz, -0.7) / 0.25) * 0.95 * cfg.shine);
      put(WHITE, cov(Math.hypot(X - 4.5 - 1.45 * sz, Y - 4.5 + 0.2 * sz) - 0.22 * sz) * 0.8 * cfg.shine);
    } else if (style === "galaxy") {
      const d = r - R, inside = cov(d);
      put([field[p * 3], field[p * 3 + 1], field[p * 3 + 2]], inside);
      put(mixc(base, WHITE, 0.5), cov(Math.abs(d + rimW * 0.5) - rimW * 0.6) * 0.95);
      put(WHITE, sat(-sdEllipse(X, Y, 4.5 - 1.3 * sz, 4.5 - 1.4 * sz, 0.75 * sz, 0.36 * sz, -0.7) / 0.25) * 0.75 * cfg.shine);
    } else if (style === "ring") {
      const d = r - R;
      put(mixc(base, WHITE, 0.3), cov(Math.abs(d) - rimW * 0.55));
      put(base, Math.exp(-((d / (0.6 + rimW)) ** 2)) * 0.35);                                              // soft glow
      const sx = X - 4.5 - R * 0.62, sy = Y - 4.5 + R * 0.62, st4 = Math.min(Math.abs(sx) / 0.55 + Math.abs(sy) / 0.09, Math.abs(sx) / 0.09 + Math.abs(sy) / 0.55) - 1;
      put(WHITE, sat(-st4 * 2.5) * cfg.shine);                                                            // sparkle on the rim
    } else if (style === "soap") {
      const d = r - R, hue = ang * 1.0 + 0.6 * Math.sin(r * 2.2);
      const irid = [0.55 + 0.45 * Math.cos(hue), 0.55 + 0.45 * Math.cos(hue - 2.1), 0.55 + 0.45 * Math.cos(hue + 2.1)];
      put(mixc(base, irid, 0.35), cov(d) * 0.18);
      put(mixc(irid, WHITE, 0.25), cov(Math.abs(d + rimW * 0.4) - rimW * 0.5) * 0.9 * sstep(-R * 0.2, R, r));
      put(WHITE, sat(-sdEllipse(X, Y, 4.5 - 1.25 * sz, 4.5 - 1.35 * sz, 0.85 * sz, 0.38 * sz, -0.7) / 0.25) * 0.9 * cfg.shine);
      put(WHITE, cov(Math.hypot(X - 4.5 + 0.35 * sz, Y - 4.5 + 2.0 * sz) - 0.17 * sz) * 0.8 * cfg.shine);
    } else if (style === "planet") {
      const pr = R * 0.72, d = r - pr, tilt = -0.42, ca = Math.cos(tilt), sa = Math.sin(tilt), ux = dx * ca + dy * sa, uy = -dx * sa + dy * ca;
      const ringD = Math.abs(Math.hypot(ux / (R * 1.28), uy / (R * 0.38)) - 1) * R * 0.38, ringA = cov(ringD - 0.13 * cfg.rim * 2), front = uy > 0;
      if (!front) put(mixc(acc, base, 0.3), ringA * 0.9);                                                 // back half of the ring
      const L = sat(0.5 - (dx + dy) / (2.4 * pr)), band = 0.5 + 0.5 * Math.sin(uy * 3.2 + 0.4 * Math.sin(ux * 2));
      let g = mixc(scale3(base, 0.3), mixc(base, WHITE, 0.2), L); g = mixc(g, scale3(g, 0.72), band * 0.6);
      put(g, cov(d)); put(scale3(base, 0.2), cov(Math.abs(d + 0.06) - 0.12) * 0.6);
      put(WHITE, sat(-sdEllipse(X, Y, 4.5 - 0.95 * sz, 4.5 - 1.05 * sz, 0.6 * sz, 0.28 * sz, -0.7) / 0.2) * 0.6 * cfg.shine);
      if (front) put(mixc(acc, WHITE, 0.15), ringA);                                                        // front half of the ring
    } else if (style === "pearl") {
      const d = r - R, L = sat(0.55 - (dx + dy) / (2.4 * R)), pc = mixc(WHITE, base, 0.3), hue = ang + r * 0.9;
      let g = mixc(scale3(pc, 0.62), mixc(pc, WHITE, 0.6), L);
      g = mixc(g, [0.6 + 0.4 * Math.cos(hue), 0.6 + 0.4 * Math.cos(hue - 2.1), 0.6 + 0.4 * Math.cos(hue + 2.1)], 0.14);
      put(g, cov(d)); put(scale3(pc, 0.45), cov(Math.abs(d + 0.08) - 0.1 * cfg.rim) * 0.55);
      put(WHITE, sat(-sdEllipse(X, Y, 4.5 - 1.1 * sz, 4.5 - 1.2 * sz, 0.9 * sz, 0.5 * sz, -0.7) / 0.35) * cfg.shine);
    } else if (style === "neon") {
      const d = r - R;
      put(base, Math.exp(-Math.abs(d) / 0.75) * 0.55); put(base, cov(d) * 0.08);
      put(mixc(base, WHITE, 0.65), cov(Math.abs(d) - rimW * 0.45));
      put(WHITE, cov(Math.hypot(X - 4.5 + R * 0.6, Y - 4.5 + R * 0.6) - 0.3 * sz) * cfg.shine);
    } else if (style === "pixel") {
      const q = Math.max(0.5, sz), PX = (Math.floor(dx / q) + 0.5) * q, PY = (Math.floor(dy / q) + 0.5) * q, pr = Math.hypot(PX, PY);
      if (pr < R + 0.25) {
        const edge = pr > R - q * 0.95, hl = (PX < -R * 0.2 && PX > -R * 0.75 && PY < -R * 0.2 && PY > -R * 0.75 && Math.hypot(PX, PY) < R * 0.75);
        put(edge ? mixc(base, WHITE, 0.55) : base, edge ? 1 : 0.4); if (hl) put(WHITE, cfg.shine);
      }
    } else if (style === "marble") {
      const d = r - R, L = sat(0.5 - (dx + dy) / (2.6 * R)), sw = Math.abs(Math.sin(ang * 2 + r * 1.4 - 0.6));
      put(mixc(scale3(base, 0.3), mixc(base, WHITE, 0.3), L), cov(d) * 0.75);
      put(mixc(acc, WHITE, 0.15), cov(d + 0.5) * sstep(0.32, 0.12, sw) * 0.95);
      put(mixc(base, WHITE, 0.5), cov(Math.abs(d + rimW * 0.4) - rimW * 0.45) * 0.8);
      put(WHITE, sat(-sdEllipse(X, Y, 4.5 - 1.2 * sz, 4.5 - 1.3 * sz, 0.9 * sz, 0.42 * sz, -0.7) / 0.25) * 0.95 * cfg.shine);
    } else if (style === "atom") {
      put(mixc(base, WHITE, 0.25), cov(r - 1.05 * sz));
      for (const t2 of [0.8, -0.8, Math.PI / 2]) { const ca = Math.cos(t2), sa = Math.sin(t2), ux = dx * ca + dy * sa, uy = -dx * sa + dy * ca;
        put(mixc(base, WHITE, 0.45), cov(Math.abs(Math.hypot(ux / R, uy / (R * 0.36)) - 1) * R * 0.36 - 0.11 * cfg.rim) * 0.9);
        const ex = Math.cos(t2 * 3 + 1) * R, ey = Math.sin(t2 * 3 + 1) * R * 0.36;
        put(mixc(acc, WHITE, 0.2), cov(Math.hypot(ux - ex, uy - ey) - 0.38 * sz)); }
      put(WHITE, cov(Math.hypot(X - 4.5 + 0.35 * sz, Y - 4.5 + 0.35 * sz) - 0.3 * sz) * cfg.shine);
    } else if (style === "lifebuoy") {
      const ri = R * 0.5, mid = (R + ri) / 2, d = Math.abs(r - mid) - (R - ri) / 2, seg = Math.floor((ang + Math.PI / 4 + TAU) / (Math.PI / 2)) % 2;
      const L = sat(0.5 - ((dx + dy) / (2.4 * R)) - (r - mid) * 0.25);
      put(scale3(seg ? WHITE : base, 0.6 + 0.5 * L), cov(d));
      put(scale3(base, 0.3), cov(Math.abs(d + 0.06) - 0.08) * 0.7);
      put(WHITE, sat(-sdEllipse(X, Y, 4.5 - 1.5 * sz, 4.5 - 1.6 * sz, 0.7 * sz, 0.3 * sz, -0.7) / 0.2) * 0.85 * cfg.shine);
    } else if (style === "rainbow") {
      const d = r - R, hue = ang / TAU;
      const rc = [0.5 + 0.5 * Math.cos(TAU * hue), 0.5 + 0.5 * Math.cos(TAU * hue - 2.1), 0.5 + 0.5 * Math.cos(TAU * hue + 2.1)];
      put(mixc(base, rc, 0.4), cov(d) * 0.2);
      put(mixc(rc, WHITE, 0.15), cov(Math.abs(d + rimW * 0.5) - rimW * 0.7));
      put(WHITE, sat(-sdEllipse(X, Y, 4.5 - 1.25 * sz, 4.5 - 1.35 * sz, 0.85 * sz, 0.38 * sz, -0.7) / 0.25) * 0.9 * cfg.shine);
    } else if (style === "dotted") {
      for (let k = 0; k < 10; k++) { const t2 = k * TAU / 10 - Math.PI / 2; put(mixc(base, WHITE, 0.35), cov(Math.hypot(dx - Math.cos(t2) * R, dy - Math.sin(t2) * R) - 0.45 * sz * cfg.rim)); }
      put(base, cov(r - R + 0.6) * 0.15);
      put(WHITE, cov(Math.hypot(X - 4.5 + R * 0.4, Y - 4.5 + R * 0.4) - 0.45 * sz) * cfg.shine);
    }
    a *= cfg.alpha; if (a <= 0.003) continue;
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

