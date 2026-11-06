/* =====================================================================
   Hotbar: animated styles for the hotbar and its selection frame (textures/gui/widgets.png).
   widgets.png also holds the menu buttons, so the pack draws matching buttons too.
   Base px: the hotbar is 182 x 22 with nine 20 px slots (items sit 16 x 16 at x = 3 + 20i, y = 3);
   the selection frame is 24 x 24 and is drawn one pixel up and left of its slot.
   ===================================================================== */
const HOTBAR_STYLES = { galaxy: "Galaxy rails", nebula: "Nebula glass", glass: "Dark glass", constellation: "Constellation",
  rift: "Rift", neon: "Neon", celestial: "Celestial gold", stone: "Plain stone (still)" };
const HB_SEL_STYLES = { auto: "Match the hotbar", frame: "Galaxy frame", glow: "Glow", corners: "Corners", orbit: "Orbiting star", stone: "Plain" };
const HB_BUTTONS = { galaxy: "Galaxy", dark: "Dark", stone: "Grey stone" };
const HB_AUTO_SEL = { galaxy: "frame", nebula: "glow", glass: "glow", constellation: "orbit", rift: "glow", neon: "glow", celestial: "frame", stone: "stone" };
const HB_DEFAULTS = { enabled: true, style: "galaxy", selStyle: "auto", buttons: "galaxy",
  c1: "#160c46", c2: "#4a2ab8", c3: "#9c6cff", accent: "#b48cff", selCol: "#efe4ff", slotCol: "#0a0814", outlineCol: "#05030c", goldCol: "#e0b04a",
  slotA: 0.7, railA: 1, window: 0.6, round: 0.15, frameW: 0.5, glow: 0.8, shine: 0.6, stars: 1, texScale: 1,
  pulse: 0.5, selW: 2.4, selGlow: 0.9, orbit: 1, speed: 2, loopSec: 6, animFps: "ticks", motion: "random", shoot: 1 };
const hbStill = hb => hb.style === "stone" && hbSelStyle(hb) === "stone";
const hbSelStyle = hb => hb.selStyle === "auto" ? HB_AUTO_SEL[hb.style] || "glow" : hb.selStyle;
function hbPalette(hb) {
  const deep = unhex(hb.c1), cloud = unhex(hb.c2), bright = unhex(hb.c3);
  return { dark: scale3(deep, 0.23), deep, cloud, bright, cloud2: [cloud[0] * 0.63, Math.min(1, cloud[1] * 1.15), Math.min(1, cloud[2] * 1.02)],
    tint: [Math.min(1, cloud[0] * 1.5), cloud[1] * 0.5, cloud[2] * 0.6], star: WHITE, starMul: hb.stars };
}
const hbGalOpts = (hb, w, seed) => { const k = 1 / (hb.texScale || 1);
  return { scale: w > 40 ? [2.8125 * k, 5 * k] : [10.6667 * k, 10.6667 * k], drift: [1, 0], dens: 0.06, big: 0.006, wander: hb.motion === "random", shoot: w > 40 ? hb.shoot : 0, seed }; };
/* layer compositor: premultiplied "over" onto a running pixel */
function px0() { return { a: 0, r: 0, g: 0, b: 0 }; }
function over(p, a, c) { if (a <= 0) return; a = Math.min(1, a); p.r = c[0] * a + p.r * (1 - a); p.g = c[1] * a + p.g * (1 - a); p.b = c[2] * a + p.b * (1 - a); p.a = a + p.a * (1 - a); }
function putPx(img, k, p) { if (p.a > 0.003) setPx(img, k, p.a, [p.r / p.a, p.g / p.a, p.b / p.a]); }
const hueCycle = (cols, x) => { const n = cols.length, f = fract(x) * n, i = Math.floor(f); return mixc(cols[i % n], cols[(i + 1) % n], sstep(0, 1, f - i)); };

function hotbarIcon(S, hb, t) {
  const img = newImg(S, 182, 22), W = img.W, H = img.H, cov = covf(S), P = hbPalette(hb), style = hb.style;
  const buf = ["galaxy", "nebula", "celestial"].includes(style) ? starfield(S, 182, 22, t, P, hbGalOpts(hb, 182, 21)) : null;
  const acc = unhex(hb.accent), slotC = unhex(hb.slotCol), outC = unhex(hb.outlineCol), gold = unhex(hb.goldCol);
  const fw = hb.frameW, glow = hb.glow, hs = 8 + hb.window, pulse = 1 + hb.pulse * 0.3 * Math.sin(TAU * 2 * t);
  const twinkle = (n, seed) => 0.5 + 0.5 * Math.sin(TAU * ((1 + (n % 3)) * t + uhash(n, seed, 3)));
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const k = j * W + i, X = (i + 0.5) / S, Y = (j + 0.5) / S, p = px0();
    const si = Math.max(0, Math.min(8, Math.floor((X - 1) / 20))), cx = 11 + 20 * si;
    const dW = sdBox(X, Y, cx, 11, hs, hs, hb.round * hs), dB = sdBox(X, Y, 91, 11, 91, 11, 0);
    const inWin = cov(dW), rail = 1 - inWin, edgeBand = 1 - cov(dB + fw);           // outer outline band
    const g = buf ? gal(buf, k) : null;
    if (style === "galaxy") {
      over(p, hb.slotA * inWin, mixc(slotC, g, 0.18));
      over(p, inWin * 0.5 * Math.exp(dW / 0.9), scale3(slotC, 0.4));                 // inner shadow at the window edge
      over(p, hb.railA * rail, scale3(g, 1.1));
      over(p, glow * Math.exp(-Math.abs(dW) / 0.22) * 0.8 * pulse, mixc(acc, WHITE, 0.35));
      over(p, glow * Math.exp((dB + fw) / 0.45) * rail * 0.6, mixc(P.bright, WHITE, 0.4));
      over(p, edgeBand, outC);
    } else if (style === "nebula") {
      over(p, hb.railA * rail, scale3(g, 1.05));
      over(p, hb.slotA * inWin, mixc(scale3(g, 0.55), slotC, 0.45));
      over(p, glow * Math.exp(-Math.abs(dW) / 0.35) * 0.55 * pulse, mixc(P.bright, WHITE, 0.3));
      over(p, glow * Math.exp((dB + fw) / 0.35) * 0.7, mixc(P.bright, WHITE, 0.5));
      over(p, edgeBand, outC);
    } else if (style === "glass") {
      over(p, hb.railA * 0.85 * rail, mixc(slotC, acc, 0.16));
      over(p, hb.slotA * inWin, slotC);
      over(p, glow * Math.exp(-Math.abs(dW) / 0.16) * 0.55, mixc(acc, WHITE, 0.5));
      const band = (X - 0.45 * Y) - (-30 + 242 * t);                                // light sweep, off the bar at both loop ends
      over(p, hb.shine * 0.3 * Math.exp(-((band / 5) ** 2)) * (rail * 0.8 + 0.4), WHITE);
      for (let n = 0; n < 18; n++) { const sx = uhash(n, 4, 1) * 182, sy = uhash(n, 4, 2) < 0.5 ? 1.6 + uhash(n, 4, 5) * 0.8 : 20.4 - uhash(n, 4, 5) * 0.8;
        const dd = Math.hypot(X - sx, Y - sy); if (dd < 0.8) over(p, hb.stars * twinkle(n, 4) * Math.exp(-((dd / 0.3) ** 2)), WHITE); }
      over(p, glow * Math.exp((dB + fw) / 0.3) * 0.5, mixc(acc, WHITE, 0.6));
      over(p, edgeBand, outC);
    } else if (style === "constellation") {
      over(p, hb.railA * 0.9 * rail, scale3(slotC, 1.2));
      over(p, hb.slotA * inWin, slotC);
      const line = Math.min(Math.abs(dB + 1.3), ...[1, 2, 3, 4, 5, 6, 7, 8].map(n => Math.abs(X - (1 + 20 * n)) + Math.max(0, Math.abs(Y - 11) - 9.7)));
      over(p, glow * 0.55 * Math.exp(-((line / 0.16) ** 2)), mixc(acc, WHITE, 0.25));
      for (let n = 0; n <= 9; n++) for (const yy of [1.3, 20.7]) {                     // star at every slot corner
        const sx = n === 0 ? 1.3 : n === 9 ? 180.7 : 1 + 20 * n, dd = Math.hypot(X - sx, Y - yy), tw = twinkle(n * 2 + (yy > 10), 9);
        if (dd < 1.2) { over(p, Math.exp(-((dd / (0.35 + 0.2 * tw)) ** 2)), mixc(acc, WHITE, 0.6 + 0.4 * tw)); }
      }
      for (const [ph, yy] of [[0, 1.3], [0.5, 1.3], [0.25, 20.7], [0.75, 20.7]]) {      // lights travelling along the lines
        const sx = yy < 10 ? fract(t + ph) * 182 : (1 - fract(t + ph)) * 182, dd = Math.hypot((X - sx) * 0.5, Y - yy);
        over(p, hb.shine * Math.exp(-((dd / 0.45) ** 2)) * sstep(0, 8, Math.min(sx, 182 - sx)), mixc(acc, WHITE, 0.7));
      }
      for (let n = 0; n < 26; n++) { const sx = uhash(n, 6, 1) * 182, sy = 3 + uhash(n, 6, 2) * 16, dd = Math.hypot(X - sx, Y - sy);
        if (dd < 0.6 && (Math.abs(X - (11 + 20 * Math.round((sx - 11) / 20))) > 7.5 || Math.abs(sy - 11) > 7.5)) over(p, hb.stars * 0.8 * twinkle(n, 6) * Math.exp(-((dd / 0.22) ** 2)), WHITE); }
      over(p, edgeBand * 0.85, outC);
    } else if (style === "rift") {
      over(p, hb.railA * rail, scale3(slotC, 0.8));
      over(p, hb.slotA * inWin, slotC);
      const hm = 0.5 + 0.5 * Math.sin(X * 0.05 + TAU * t), col = mixc(acc, P.bright, hm);
      const fl = 1 + hb.pulse * 0.35 * (Math.sin(TAU * 3 * t + X * 0.08) * 0.6 + Math.sin(TAU * 5 * t - X * 0.13) * 0.4);
      const jag = 0.55 + 0.45 * vfbm(X * 1.3 + 3, Y < 11 ? 1.7 : 9.1, 3), dEdge = -dB - fw - jag;          // jagged glowing edge, top and bottom
      over(p, glow * fl * sat(Math.exp(-Math.max(0, dEdge) / 0.35)) * 0.9, col);
      over(p, glow * fl * Math.exp(-Math.abs(dEdge) / 0.1) * 0.7, mixc(col, WHITE, 0.7));
      const crack = Math.abs(X - (1 + 20 * Math.round((X - 1) / 20))) + 0.35 * vfbm(Y * 1.4, X * 0.3, 2) - 0.15;
      if (X > 5 && X < 177) over(p, glow * fl * 0.8 * Math.exp(-Math.max(0, crack) / 0.18), mixc(col, WHITE, 0.3));
      over(p, edgeBand, outC);
    } else if (style === "neon") {
      over(p, hb.railA * 0.6 * rail, slotC);
      over(p, hb.slotA * inWin, slotC);
      const col = hueCycle([acc, P.bright, P.cloud], X / 182 * 1.5 - t), dd = Math.abs(dW + 0.2);
      over(p, glow * pulse * 0.6 * Math.exp(-dd / 0.6), col);
      over(p, Math.exp(-((dd / 0.24) ** 2)), mixc(col, WHITE, 0.55));
      over(p, glow * 0.6 * Math.exp((dB + fw) / 0.3), col);
      over(p, edgeBand * 0.8, outC);
    } else if (style === "celestial") {
      over(p, hb.slotA * inWin, mixc(scale3(g, 0.6), slotC, 0.3));
      const lit = sat(0.62 - (Y - 11) / 16), bev = sat(0.5 + (Math.exp(-Math.abs(dW) / 0.4) - Math.exp((dB + fw) / 0.4)) * 0.6);
      let gc = mixc(scale3(gold, 0.45), mixc(gold, WHITE, 0.35), lit * 0.7 + bev * 0.3);
      gc = scale3(gc, 0.9 + 0.12 * vfbm(X * 0.9, Y * 2.3, 2));
      over(p, hb.railA * rail, gc);
      over(p, Math.exp(-((Math.abs(dW) / 0.18) ** 2)) * 0.8, scale3(gold, 0.3));
      for (let n = 0; n < 12; n++) { const sx = 11 + 20 * (n % 9) + (n >= 9 ? 10 : 0), sy = n >= 9 ? 11 : uhash(n, 8, 1) < 0.5 ? 1.5 : 20.5;
        const tw = twinkle(n, 8), d4 = star4(X, Y, n >= 9 ? 1 + 20 * (2 + n % 3 * 3) : sx, sy, 0.8 + 0.6 * tw, 0.14);
        over(p, hb.stars * sat(0.5 - d4 * S) * (0.5 + 0.5 * tw), mixc(gold, WHITE, 0.8)); }
      over(p, glow * 0.35 * Math.exp(-Math.abs(dW) / 0.5) * pulse, mixc(gold, WHITE, 0.5));
      over(p, edgeBand, scale3(gold, 0.18));
    } else {                                                                         // plain stone, still
      const n = 0.9 + 0.1 * vfbm(X * 1.7, Y * 1.7, 2);
      const bev = Math.exp((dB + fw) / 0.35) * (Y < 11 ? 0.25 : -0.2);
      over(p, hb.railA * rail, scale3(rgb(122, 122, 122), n + bev));
      over(p, hb.slotA * inWin, scale3(rgb(60, 60, 60), n));
      over(p, Math.exp(-((Math.abs(dW) / 0.25) ** 2)) * 0.6, dW < 0 ? rgb(30, 30, 30) : rgb(170, 170, 170));
      over(p, edgeBand, rgb(16, 16, 16));
    }
    putPx(img, k, p);
  }
  return toRGBA(img);
}

/* the 24 x 24 selection frame; the middle (where the item is) stays clear */
function hotbarSelIcon(S, hb, t) {
  const img = newImg(S, 24, 24), W = img.W, H = img.H, cov = covf(S), P = hbPalette(hb), style = hbSelStyle(hb);
  const buf = style === "frame" ? starfield(S, 24, 24, t, P, hbGalOpts(hb, 24, 23)) : null;
  const col = hb.style === "celestial" && hb.selStyle === "auto" ? unhex(hb.goldCol) : unhex(hb.selCol), acc = unhex(hb.accent);
  const sw = hb.selW, hole = Math.max(8.3, 12 - sw), pulse = 1 + hb.pulse * 0.4 * Math.sin(TAU * 2 * t), r = Math.min(3, hb.round * 12);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const k = j * W + i, X = (i + 0.5) / S, Y = (j + 0.5) / S, p = px0();
    const dO = sdBox(X, Y, 12, 12, 12, 12, r), dH = sdBox(X, Y, 12, 12, hole, hole, r * hole / 12);
    const ring = cov(dO) * (1 - cov(dH));
    if (style === "frame") {
      const gold = hb.style === "celestial" && hb.selStyle === "auto";
      const base = gold ? scale3(col, 0.6 + 0.5 * sat(0.6 - (Y - 12) / 20)) : scale3(gal(buf, k), 1.25);
      over(p, ring, base);
      over(p, ring * Math.exp(-Math.abs(dH) / 0.2) * hb.selGlow * pulse, mixc(col, WHITE, 0.4));
      over(p, ring * Math.exp(dO / 0.3) * 0.9, scale3(col, gold ? 0.25 : 1));
      over(p, (1 - cov(dO + 0.45)), unhex(hb.outlineCol));
    } else if (style === "glow") {
      const g = dH > 0 ? Math.exp(-dH / 1.1) * sat(-dO / 0.8) : Math.exp(dH / 0.35) * 0.4;
      over(p, hb.selGlow * pulse * g * 0.85, col);
      over(p, Math.exp(-((dH / 0.22) ** 2)), mixc(col, WHITE, 0.6));
      over(p, (1 - cov(dO + 0.4)) * 0.6 * cov(dO), scale3(col, 0.5));
    } else if (style === "corners") {
      const L = 5 + 1.2 * hb.pulse * Math.sin(TAU * 2 * t), near = Math.min(Math.abs(X - 12), Math.abs(Y - 12)) > 12 - L ? 1 : 0;
      over(p, ring * near * cov(-(Math.min(Math.abs(X - 12), Math.abs(Y - 12)) - (12 - L))), mixc(col, WHITE, 0.2));
      over(p, ring * near * Math.exp(-Math.abs(dH) / 0.25) * hb.selGlow, WHITE);
    } else if (style === "orbit") {
      const mid = hole + (12 - hole) / 2, dl = Math.abs(sdBox(X, Y, 12, 12, mid, mid, 0));
      over(p, 0.75 * Math.exp(-((dl / 0.22) ** 2)), mixc(col, acc, 0.3));
      over(p, hb.selGlow * 0.3 * Math.exp(-dl / 0.7), col);
      const n = Math.max(1, Math.round(hb.orbit));
      for (let q = 0; q < n; q++) {                                                // star(s) running around the square, with a tail
        for (let tr = 0; tr < 6; tr++) {
          const u = fract(t + q / n - tr * 0.012) * 4, sideI = Math.floor(u), f = u - sideI, m = mid;
          const pt = sideI === 0 ? [12 - m + 2 * m * f, 12 - m] : sideI === 1 ? [12 + m, 12 - m + 2 * m * f] : sideI === 2 ? [12 + m - 2 * m * f, 12 + m] : [12 - m, 12 + m - 2 * m * f];
          const dd = Math.hypot(X - pt[0], Y - pt[1]), w = tr === 0 ? 0.55 : 0.4 - tr * 0.04;
          over(p, (tr === 0 ? 1 : 0.5 * (1 - tr / 6)) * Math.exp(-((dd / w) ** 2)) * pulse, tr === 0 ? WHITE : mixc(col, WHITE, 0.4));
        }
      }
    } else {
      const lit = Y < 12 ? 1.15 : 0.85;
      over(p, ring, scale3(rgb(210, 210, 210), lit));
      over(p, 1 - cov(dO + 0.5), rgb(20, 20, 20));
      over(p, ring * Math.exp(-((dH / 0.25) ** 2)) * 0.6, rgb(90, 90, 90));
    }
    putPx(img, k, p);
  }
  return toRGBA(img);
}

/* menu buttons (200 x 20), the language button and the difficulty lock; still images */
function hbButtonIcon(S, hb, state, w = 200, h = 20, glyph = null, locked = false) {
  const img = newImg(S, w, h), W = img.W, H = img.H, cov = covf(S), P = hbPalette(hb), style = hb.buttons;
  const buf = style === "galaxy" ? starfield(S, w, h, 0, Object.assign({}, P, { starMul: 0.5 }), { scale: [6, 6], drift: [0, 0], dens: 0.04, big: 0.002, seed: 31 }) : null;
  const acc = unhex(hb.accent), hov = state === "hover", dis = state === "disabled";
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const k = j * W + i, X = (i + 0.5) / S, Y = (j + 0.5) / S, p = px0();
    const dB = sdBox(X, Y, w / 2, h / 2, w / 2, h / 2, 0), inner = 1 - cov(dB + 1), bevel = 1 - cov(dB + 2);
    let fill;
    if (style === "galaxy") fill = mixc(scale3(gal(buf, k), 0.55), scale3(P.deep, 0.5), 0.45);
    else if (style === "dark") fill = mixc(scale3(P.deep, 0.55), scale3(P.deep, 0.3), Y / h);
    else fill = scale3(rgb(111, 111, 111), 0.9 + 0.1 * vfbm(X * 0.9, Y * 0.9, 2));
    if (hov) fill = style === "stone" ? mixc(fill, rgb(126, 136, 191), 0.55) : mixc(scale3(fill, 1.35), acc, 0.12);
    if (dis) fill = style === "stone" ? rgb(44, 44, 44) : scale3(mixc(fill, [0.2, 0.2, 0.22], 0.6), 0.6);
    over(p, 1, fill);
    const hiC = dis ? [0.3, 0.3, 0.3] : style === "stone" ? rgb(170, 170, 170) : mixc(acc, WHITE, 0.3), loC = scale3(fill, 0.45);
    over(p, (bevel - inner) * (Y < h - 2 && X < w - 2 ? 0.75 : 0), hiC);             // light top-left bevel
    over(p, (bevel - inner) * (Y >= h - 2 || X >= w - 2 ? 0.8 : 0), loC);
    over(p, inner, hov ? (style === "stone" ? WHITE : mixc(acc, WHITE, 0.5)) : rgb(0, 0, 0));
    if (glyph === "globe") {
      const d = Math.hypot(X - 10, Y - 10) - 5.2, line = Math.min(Math.abs(d), Math.abs(Y - 10) + (d > 0 ? 9 : 0),
        Math.abs(Math.hypot((X - 10) * 2.1, Y - 10) - 5.2) + (d > 0 ? 9 : 0), Math.abs(X - 10) + (d > 0 ? 9 : 0));
      over(p, sat(0.6 - (line - 0.35) * S) * (dis ? 0.4 : 1), dis ? [0.6, 0.6, 0.6] : WHITE);
    } else if (glyph === "lock") {
      const body = sdBox(X, Y, 10, 12.2, 3.6, 2.9, 0.5), sh = Math.abs(Math.hypot(X - (locked ? 10 : 12.6), Y - 8.4) - 2.3) - 0.55;
      const shackle = Math.max(sh, Y - 9.3);
      const c = dis ? [0.55, 0.55, 0.55] : locked ? mixc(acc, WHITE, 0.55) : WHITE;
      over(p, sat(0.5 - Math.min(body, shackle) * S), c);
      over(p, sat(0.5 - (Math.hypot(X - 10, Y - 12) - 0.7) * S) * 0.8, scale3(fill, 0.4));
    }
    putPx(img, k, p);
  }
  return toRGBA(img);
}
/* the whole widgets.png at S px per base px; the hotbar and selection frame are frame 0 of their animations */
function buildWidgets(S, hb) {
  const Wd = 256 * S, out = new Uint8ClampedArray(Wd * Wd * 4);
  const put = (im, x, y) => { for (let r = 0; r < im.h; r++) out.set(im.data.subarray(r * im.w * 4, (r + 1) * im.w * 4), ((y * S + r) * Wd + x * S) * 4); };
  return { Wd, out, put, jobs: [
    () => put(hotbarIcon(S, hb, 0), 0, 0), () => put(hotbarSelIcon(S, hb, 0), 0, 22),
    () => put(hbButtonIcon(S, hb, "disabled"), 0, 46), () => put(hbButtonIcon(S, hb, "normal"), 0, 66), () => put(hbButtonIcon(S, hb, "hover"), 0, 86),
    () => { put(hbButtonIcon(S, hb, "normal", 20, 20, "globe"), 0, 106); put(hbButtonIcon(S, hb, "hover", 20, 20, "globe"), 0, 126); },
    () => { for (const [lk, x] of [[true, 0], [false, 20]]) for (const [stt, y] of [["normal", 146], ["hover", 166], ["disabled", 186]]) put(hbButtonIcon(S, hb, stt, 20, 20, "lock", lk), x, y); },
  ] };
}
