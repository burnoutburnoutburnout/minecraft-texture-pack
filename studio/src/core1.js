/* =====================================================================
   Math + noise
   ===================================================================== */
const TAU = Math.PI * 2;
const sat = x => x < 0 ? 0 : x > 1 ? 1 : x;
const sstep = (a, b, x) => { const t = sat((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const rgb = (r, g, b) => [r / 255, g / 255, b / 255];
const scale3 = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
const WHITE = [1, 1, 1];
const fract = x => x - Math.floor(x);

function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

const NN = 256;
function makeNoise(seed) {
  // periodic gradient-noise octaves with a 1/f^1.3 amplitude falloff (tiles every 256 texels)
  const out = new Float32Array(NN * NN);
  const rnd = mulberry32(seed * 7919 + 13);
  for (const cells of [2, 4, 8, 16, 32, 64]) {
    const gx = new Float32Array(cells * cells), gy = new Float32Array(cells * cells);
    for (let i = 0; i < cells * cells; i++) { const a = rnd() * TAU; gx[i] = Math.cos(a); gy[i] = Math.sin(a); }
    const amp = Math.pow(cells, -1.3), cs = NN / cells;
    for (let y = 0; y < NN; y++) {
      const fy = y / cs, y0 = Math.floor(fy), ty = fy - y0, y1 = (y0 + 1) % cells;
      const sy = ty * ty * ty * (ty * (ty * 6 - 15) + 10);
      for (let x = 0; x < NN; x++) {
        const fx = x / cs, x0 = Math.floor(fx), tx = fx - x0, x1 = (x0 + 1) % cells;
        const sx = tx * tx * tx * (tx * (tx * 6 - 15) + 10);
        const i00 = y0 * cells + x0, i10 = y0 * cells + x1, i01 = y1 * cells + x0, i11 = y1 * cells + x1;
        const n00 = gx[i00] * tx + gy[i00] * ty, n10 = gx[i10] * (tx - 1) + gy[i10] * ty;
        const n01 = gx[i01] * tx + gy[i01] * (ty - 1), n11 = gx[i11] * (tx - 1) + gy[i11] * (ty - 1);
        out[y * NN + x] += amp * lerp(lerp(n00, n10, sx), lerp(n01, n11, sx), sy);
      }
    }
  }
  let m = 0; for (let i = 0; i < out.length; i++) m += out[i]; m /= out.length;
  let v = 0; for (let i = 0; i < out.length; i++) { out[i] -= m; v += out[i] * out[i]; }
  const sd = Math.sqrt(v / out.length); for (let i = 0; i < out.length; i++) out[i] /= sd;
  return out;
}
const T = [0, 1, 2, 3, 4, 5].map(makeNoise);

function samp(t, u, v) {
  u = u % NN; if (u < 0) u += NN; v = v % NN; if (v < 0) v += NN;
  let x0 = Math.floor(u), y0 = Math.floor(v); const fx = u - x0, fy = v - y0;
  x0 &= 255; y0 &= 255; const x1 = (x0 + 1) & 255, y1 = (y0 + 1) & 255;
  const a = t[y0 * NN + x0], b = t[y0 * NN + x1], c = t[y1 * NN + x0], d = t[y1 * NN + x1];
  return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
}
function fbm(k, u, v) {
  return (samp(T[k % 6], u, v) + 0.5 * samp(T[(k + 3) % 6], u * 2 + 17, v * 2 + 31)
    + 0.25 * samp(T[(k + 1) % 6], u * 4 + 5, v * 4 + 77)) / 1.146;
}

/* =====================================================================
   Signed distance functions (units: vanilla 16x pixels)
   ===================================================================== */
function sdHeart(X, Y) {
  const K = 7.0; let px = Math.abs((X - 4.5) / K); const py = (8.35 - Y) / K;
  let d;
  if (py + px > 1) d = Math.hypot(px - 0.25, py - 0.75) - Math.SQRT2 / 4;
  else { const t = 0.5 * Math.max(px + py, 0); d = Math.sqrt(Math.min(px * px + (py - 1) ** 2, (px - t) ** 2 + (py - t) ** 2)) * Math.sign(px - py); }
  return d * K;
}
function sdEllipse(X, Y, cx, cy, rx, ry, ang) {
  const dx = X - cx, dy = Y - cy, c = Math.cos(ang), s = Math.sin(ang);
  const ex = dx * c + dy * s, ey = -dx * s + dy * c;
  const k = Math.hypot(ex / rx, ey / ry), g = Math.hypot(ex / (rx * rx), ey / (ry * ry));
  return (k - 1) * k / Math.max(g, 1e-6);
}
function sdBox(X, Y, cx, cy, hx, hy, r = 0) {
  const qx = Math.abs(X - cx) - hx + r, qy = Math.abs(Y - cy) - hy + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}
function sdPolygon(X, Y, pts) {
  let d = (X - pts[0][0]) ** 2 + (Y - pts[0][1]) ** 2, s = 1;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i, i++) {
    const ex = pts[j][0] - pts[i][0], ey = pts[j][1] - pts[i][1], wx = X - pts[i][0], wy = Y - pts[i][1];
    const t = sat((wx * ex + wy * ey) / (ex * ex + ey * ey)), bx = wx - ex * t, by = wy - ey * t;
    d = Math.min(d, bx * bx + by * by);
    const c1 = Y >= pts[i][1], c2 = Y < pts[j][1], c3 = ex * wy > ey * wx;
    if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) s = -s;
  }
  return s * Math.sqrt(d);
}
const ARMOR_PTS = [[1.1, 1.3], [3.2, 0.8], [4.5, 2.1], [5.8, 0.8], [7.9, 1.3], [8.5, 4.1], [6.9, 4.4], [6.9, 8.3], [2.1, 8.3], [2.1, 4.4], [0.5, 4.1]];

/* =====================================================================
   Image buffers
   ===================================================================== */
function newImg(S, w, h) { const W = Math.round(w * S), H = Math.round(h * S); return { S, W, H, col: new Float32Array(W * H * 3), a: new Float32Array(W * H) }; }
function toRGBA(img) {
  const out = new Uint8ClampedArray(img.W * img.H * 4);
  for (let i = 0, n = img.W * img.H; i < n; i++) {
    const a = img.a[i]; if (a <= 0) continue;
    out[i * 4] = img.col[i * 3] * 255 + 0.5; out[i * 4 + 1] = img.col[i * 3 + 1] * 255 + 0.5;
    out[i * 4 + 2] = img.col[i * 3 + 2] * 255 + 0.5; out[i * 4 + 3] = sat(a) * 255 + 0.5;
  }
  return { w: img.W, h: img.H, data: out };
}

/* =====================================================================
   Stars + starfield (loops seamlessly: drifts whole periods per cycle)
   ===================================================================== */
function makeStars(seed, n, w, h, nBig, twinkle = true) {
  const r = mulberry32(seed * 104729 + 7), out = [];
  for (let i = 0; i < n + nBig; i++) {
    const big = i >= n;
    out.push({ x: r() * w, y: r() * h, b: big ? 0.75 + r() * 0.25 : 0.3 + r() * 0.65,
      size: big ? 0.13 + r() * 0.04 : 0.07 + r() * 0.04, k: twinkle ? 1 + Math.floor(r() * 3) : 0, ph: r(), glint: big });
  }
  return out;
}
function addStars(buf, S, W, H, stars, t, tint, period, shift) {
  const wB = W / S, hB = H / S;
  for (const st of stars) {
    const tw = st.k ? 0.5 + 0.5 * Math.sin(TAU * (st.k * t + st.ph)) : 1;
    const amp = st.b * (0.35 + 0.65 * tw), reach = st.glint ? 1.1 : st.size * 4;
    let xs = [st.x], ys = [st.y];
    if (period) {
      const bx = ((st.x + shift[0]) % period[0] + period[0]) % period[0], by = ((st.y + shift[1]) % period[1] + period[1]) % period[1];
      xs = []; ys = [];
      for (let i = -1; i <= Math.floor(wB / period[0]) + 1; i++) xs.push(bx + i * period[0]);
      for (let j = -1; j <= Math.floor(hB / period[1]) + 1; j++) ys.push(by + j * period[1]);
    }
    const s2 = 2 * st.size * st.size;
    for (const cy of ys) {
      if (cy + reach < 0 || cy - reach > hB) continue;
      for (const cx of xs) {
        if (cx + reach < 0 || cx - reach > wB) continue;
        const i0 = Math.max(0, Math.floor((cx - reach) * S)), i1 = Math.min(W, Math.ceil((cx + reach) * S));
        const j0 = Math.max(0, Math.floor((cy - reach) * S)), j1 = Math.min(H, Math.ceil((cy + reach) * S));
        for (let j = j0; j < j1; j++) {
          const dy = (j + 0.5) / S - cy;
          for (let i = i0; i < i1; i++) {
            const dx = (i + 0.5) / S - cx;
            let g = Math.exp(-(dx * dx + dy * dy) / s2) * 1.6;
            if (st.glint) g += 0.8 * tw * (Math.exp(-Math.abs(dx) / 0.05) * Math.exp(-((dy / 0.75) ** 2)) + Math.exp(-Math.abs(dy) / 0.05) * Math.exp(-((dx / 0.75) ** 2)));
            const p = (j * W + i) * 3, v = amp * g;
            buf[p] += v * tint[0]; buf[p + 1] += v * tint[1]; buf[p + 2] += v * tint[2];
          }
        }
      }
    }
  }
}
/* Random-looking but seamless motion. Only whole-number frequencies are used, so the motion at the
   end of the loop meets the start exactly. randWarp varies the speed (between about 0.35x and 1.65x)
   while still advancing one full step per loop; wander is a back-and-forth drift. */
function randWarp(t, seed) {
  const r = mulberry32(seed * 977 + 5); let w = t;
  [0.34, 0.2, 0.1].forEach((a, i) => { const k = i + 1; w += a * Math.sin(TAU * k * t + r() * TAU) / (TAU * k); });
  return w;
}
function wander(t, seed, amp) {
  const r = mulberry32(seed * 613 + 9); let x = 0;
  [1, 0.5, 0.28].forEach((a, i) => { x += a * Math.sin(TAU * (i + 1) * t + r() * TAU); });
  return x * amp / 1.4;
}
function shootingStars(buf, S, W, H, t, n, seed, bar) {
  const wB = W / S, hB = H / S;
  for (let s = 0; s < n; s++) {
    const r = mulberry32(seed * 31 + s * 7 + 3);
    const ts = (s + r() * 0.8) / n, dur = 0.07 + 0.05 * r(), ph = ((t - ts) % 1 + 1) % 1;
    // icons: start in the upper part and fly toward the middle, so the streak crosses the heart; bars: anywhere along the bar
    const x0 = bar ? r() * wB : 1.6 + r() * (wB - 3.2), y0 = bar ? 0.8 + r() * (hB - 1.6) : 1.6 + r() * 1.8;
    const side = bar ? (r() < 0.5 ? -1 : 1) : (x0 < wB / 2 ? 1 : -1), ang = bar ? 0.05 + r() * 0.08 : 0.5 + r() * 0.45;
    if (ph >= dur) continue;
    const q = ph / dur, fade = Math.sin(Math.PI * q), L = bar ? 40 : 4.6, tail = bar ? 9 : 2.2;
    const dx = Math.cos(ang) * side, dy = Math.sin(ang);
    const hx = x0 + dx * L * q, hy = y0 + dy * L * q, tx = hx - dx * tail, ty = hy - dy * tail;
    const i0 = Math.max(0, Math.floor((Math.min(hx, tx) - 0.9) * S)), i1 = Math.min(W, Math.ceil((Math.max(hx, tx) + 0.9) * S));
    const j0 = Math.max(0, Math.floor((Math.min(hy, ty) - 0.9) * S)), j1 = Math.min(H, Math.ceil((Math.max(hy, ty) + 0.9) * S));
    for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) {
      const X = (i + 0.5) / S, Y = (j + 0.5) / S;
      const along = sat(((X - tx) * dx + (Y - ty) * dy) / tail), px = tx + dx * tail * along, py = ty + dy * tail * along;
      const d = Math.hypot(X - px, Y - py), dh = Math.hypot(X - hx, Y - hy);
      const v = fade * (Math.exp(-((d / (bar ? 0.12 : 0.17)) ** 2)) * along ** 1.4 * 1.1 + Math.exp(-((dh / (bar ? 0.2 : 0.3)) ** 2)) * 1.6);
      if (v <= 0.002) continue;
      const p = (j * W + i) * 3; buf[p] += v; buf[p + 1] += v * 0.97; buf[p + 2] += v * 0.92;
    }
  }
}
function starfield(S, w, h, t, P, o = {}) {
  const seed = o.seed || 0, sx = (o.scale || [12, 12])[0], sy = (o.scale || [12, 12])[1];
  const drift = o.drift || [1, 1], dens = o.dens ?? 0.09, bigD = o.big ?? 0.012, starMul = o.starMul ?? P.starMul ?? 1, neb = o.neb ?? 1;
  const W = Math.round(w * S), H = Math.round(h * S), buf = new Float32Array(W * H * 3);
  const perx = NN / sx, pery = NN / sy, rnd = !!o.wander, tw = rnd ? randWarp(t, seed) : t, bar = w > 40;
  const ox = perx * drift[0] * tw + (rnd ? wander(t, seed, bar ? 6 : 1.5) : 0), oy = pery * drift[1] * tw + (rnd ? wander(t, seed + 3, bar ? 0.6 : 1.5) : 0);
  const mc = Math.cos(TAU * t), ms = Math.sin(TAU * t);                     // nebula slowly changes shape (random mode)
  const t2 = T[(seed + 2) % 6], t4 = T[(seed + 4) % 6];
  for (let j = 0; j < H; j++) {
    const v = ((j + 0.5) / S - oy) * sy;
    for (let i = 0; i < W; i++) {
      const u = ((i + 0.5) / S - ox) * sx;
      const n1 = rnd ? fbm(seed, u, v) * mc + fbm(seed + 3, u + 50, v + 20) * ms : fbm(seed, u, v), n2 = samp(t2, u + 90, v + 40), n3 = samp(t4, u + 30, v + 150);
      const d = sstep(-1.5, 1.6, n1);
      let c = mixc(P.dark, P.deep, sstep(0.2, 0.6, d));
      c = mixc(c, mixc(P.cloud, P.cloud2, sat(0.5 + 0.5 * n2)), sstep(0.55, 0.9, d) * 0.9 * neb);
      c = mixc(c, P.bright, sstep(0.86, 1.05, d) * 0.6 * neb);
      c = mixc(c, P.tint, sat(n3 - 0.4) * 0.45 * sstep(0.35, 0.7, d));
      const p = (j * W + i) * 3; buf[p] = c[0]; buf[p + 1] = c[1]; buf[p + 2] = c[2];
    }
  }
  const nS = Math.floor(perx * pery * dens * starMul), nB = starMul > 0 ? Math.max(1, Math.floor(perx * pery * bigD * starMul)) : 0;
  addStars(buf, S, W, H, makeStars(seed + 101, nS, perx, pery, nB), t, P.star, [perx, pery], [ox, oy]);
  if (o.shoot > 0) shootingStars(buf, S, W, H, t, o.shoot, seed + 41, bar);
  return buf;
}

