const pause = () => new Promise(r => setTimeout(r, 0));
/* Minecraft shrinks HUD textures to the screen with nearest-pixel sampling (no smoothing), so fine detail in a high-res
   pack turns into speckles. hudFilter pre-shrinks an image to the screen size for one GUI scale with a proper
   alpha-weighted area average, then blows it back up to the same size, so whichever texel the game picks for a
   screen pixel already holds that pixel's smoothed colour. texPerPx = texture pixels per screen pixel (S / GUI scale). */
function hudFilter(src, w, h, texPerPx) {
  const f = texPerPx; if (!(f > 1.001)) return src;
  const W2 = Math.max(1, Math.round(w / f)), H2 = Math.max(1, Math.round(h / f));
  const pass = (n, m) => {                                   // for 0..m-1 screen px: list of [texel, weight] over 0..n-1
    const out = [];
    for (let k = 0; k < m; k++) { const a = k * n / m, b2 = (k + 1) * n / m, list = [];
      for (let i = Math.floor(a); i < Math.min(n, Math.ceil(b2)); i++) { const wgt = Math.min(b2, i + 1) - Math.max(a, i); if (wgt > 1e-6) list.push([i, wgt]); }
      out.push(list); }
    return out; };
  const cx = pass(w, W2), cy = pass(h, H2);
  const tmp = new Float32Array(W2 * h * 4);                  // horizontal pass, premultiplied
  for (let y = 0; y < h; y++) for (let X = 0; X < W2; X++) { let r = 0, g = 0, bb = 0, a = 0, ws = 0;
    for (const [i, wg] of cx[X]) { const q = (y * w + i) * 4, al = src[q + 3] / 255; r += src[q] * al * wg; g += src[q + 1] * al * wg; bb += src[q + 2] * al * wg; a += al * wg; ws += wg; }
    const o = (y * W2 + X) * 4; tmp[o] = r / ws; tmp[o + 1] = g / ws; tmp[o + 2] = bb / ws; tmp[o + 3] = a / ws; }
  const small = new Float32Array(W2 * H2 * 4);               // vertical pass
  for (let Y = 0; Y < H2; Y++) for (let X = 0; X < W2; X++) { let r = 0, g = 0, bb = 0, a = 0, ws = 0;
    for (const [j, wg] of cy[Y]) { const q = (j * W2 + X) * 4; r += tmp[q] * wg; g += tmp[q + 1] * wg; bb += tmp[q + 2] * wg; a += tmp[q + 3] * wg; ws += wg; }
    const o = (Y * W2 + X) * 4; small[o] = r / ws; small[o + 1] = g / ws; small[o + 2] = bb / ws; small[o + 3] = a / ws; }
  const out = new Uint8ClampedArray(w * h * 4);              // back up to full size, nearest
  const mx = new Int32Array(w), my = new Int32Array(h);
  for (let i = 0; i < w; i++) mx[i] = Math.min(W2 - 1, Math.floor((i + 0.5) / f));
  for (let j = 0; j < h; j++) my[j] = Math.min(H2 - 1, Math.floor((j + 0.5) / f));
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const q = (my[j] * W2 + mx[i]) * 4, o = (j * w + i) * 4, a = small[q + 3];
    if (a > 1e-4) { out[o] = small[q] / a; out[o + 1] = small[q + 1] / a; out[o + 2] = small[q + 2] / a; out[o + 3] = a * 255; } }
  return out;
}
const hudTexPerPx = () => { const g = +st.guiMatch || 0; return g > 0 ? (st.res / 16) / g : 0; };
async function buildPack(progress) {
  const S = st.res / 16, Wd = 256 * S, icons = new Uint8ClampedArray(Wd * Wd * 4);
  const put = (img, bx, by) => { for (let y = 0; y < img.h; y++) icons.set(img.data.subarray(y * img.w * 4, (y + 1) * img.w * 4), ((by * S + y) * Wd + bx * S) * 4); };
  const jobs = [];
  jobs.push(() => put(crosshairIcon(S, st.cross), 0, 0));
  for (const row of [0, 45]) {
    const hr = row === 45 ? "hardcore" : "normal", J = f => jobs.push(() => { HEART_ROW = hr; try { f(); } finally { HEART_ROW = "normal"; } });
    J(() => { put(HRT(S, 0, "container"), 16, row); put(HRT(S, 0, "container", true), 25, row); put(HRT(S, 0, "container"), 34, row); put(HRT(S, 0, "container", true), 43, row); });
    [[st.heart, 0], [st.poison, 2], [st.wither, 3]].forEach(([cols, sd], n) => {
      const x = 52 + n * 36;
      J(() => { put(HRT(S, 0, "full", false, cols, sd), x, row); put(HRT(S, 0, "half", false, cols, sd), x + 9, row); });
      J(() => { put(HRT(S, 0, "full", true, cols, sd), x + 18, row); put(HRT(S, 0, "half", true, cols, sd), x + 27, row); });
    });
    J(() => { put(HRT(S, 0, "full", false, st.gold, 4), 160, row); put(HRT(S, 0, "half", false, st.gold, 4), 169, row); });
  }
  jobs.push(() => { for (const [k, x] of [["empty", 16], ["half", 25], ["full", 34]]) put(ARM(S, k), x, 9); });
  jobs.push(() => { put(HRT(S, 0, "container"), 52, 9); put(HRT(S, 0, "full"), 88, 9); put(HRT(S, 0, "half"), 97, 9); });
  jobs.push(() => { put(bubbleIcon(S, false, st.bubble.col), 16, 18); put(bubbleIcon(S, true, st.bubble.col), 25, 18); });
  const food = [["container", 0, 0, 16], ["container", 1, 0, 25], ["container", 0, 0, 34], ["container", 1, 0, 43], ["full", 0, 0, 52], ["half", 0, 0, 61], ["full", 1, 0, 70], ["half", 1, 0, 79],
    ["full", 0, 1, 88], ["half", 0, 1, 97], ["full", 1, 1, 106], ["half", 1, 1, 115], ["container", 0, 1, 133], ["container", 1, 1, 142]];
  for (const [k, fl, hu, x] of food) jobs.push(() => put(steakIcon(S, st, k, !!fl, !!hu), x, 27));
  jobs.push(() => { put(BAR(S, 0, "bg"), 0, 64); put(BAR(S, 0, "fill"), 0, 69); });
  jobs.push(() => { put(BAR(S, 0, "bg", st.boss, 8, false), 0, 74); put(BAR(S, 0, "fill", st.boss, 8, false), 0, 79); });
  jobs.push(() => { put(BAR(S, 0, "bg", st.jump, 9, false), 0, 84); put(BAR(S, 0, "fill", st.jump, 9, false), 0, 89); });
  jobs.push(() => { for (let l = 0; l < 6; l++) put(pingIcon(S, l), 0, 176 + l * 8); });

  const HA = animFrames(st.heart, "heart", st.res), XA = animFrames(st.xp, "bar", st.res), HEART_FRAMES = HA.n, XP_FRAMES = XA.n;
  const hw = 18 * S, hh = 9 * S, hearts = new Uint8ClampedArray(hw * hh * HEART_FRAMES * 4);
  // hardcore hearts get their own animation strip when the two rows look different
  const pf = st.perf || {}, aH = pf.animHearts !== false, aHC = aH && pf.animHardcore !== false, aX = pf.animXP !== false;
  const hcSeparate = aHC && (st.heart.hardcore || "world") === "world", heartsHC = hcSeparate ? new Uint8ClampedArray(hearts.length) : null;
  const strip = (buf, row) => f => jobs.push(() => {
    HEART_ROW = row;
    try {
      const full = HRT(S, f / HEART_FRAMES, "full"), half = HRT(S, f / HEART_FRAMES, "half");
      for (let y = 0; y < hh; y++) {
        const o = ((f * hh + y) * hw) * 4;
        buf.set(full.data.subarray(y * full.w * 4, (y + 1) * full.w * 4), o);
        buf.set(half.data.subarray(y * half.w * 4, (y + 1) * half.w * 4), o + full.w * 4);
      }
    } finally { HEART_ROW = "normal"; }
  });
  if (aH) for (let f = 0; f < HEART_FRAMES; f++) strip(hearts, "normal")(f);
  if (hcSeparate) for (let f = 0; f < HEART_FRAMES; f++) strip(heartsHC, "hardcore")(f);
  const xw = 182 * S, xh = 5 * S, xp = new Uint8ClampedArray(xw * xh * XP_FRAMES * 4);
  if (aX) for (let f = 0; f < XP_FRAMES; f++) jobs.push(() => xp.set(BAR(S, f / XP_FRAMES, "fill").data, f * xw * xh * 4));

  // hotbar, selection frame and buttons (textures/gui/widgets.png) plus their animation strips
  const hb = st.hotbar, hbOn = hb && hb.enabled !== false, aB = hbOn && pf.animHotbar !== false && !hbStill(hb), BA = animFrames(hb, "hotbar", st.res);
  const WG = hbOn ? buildWidgets(S, hb) : null;
  if (WG) jobs.push(...WG.jobs);
  const bw = 182 * S, bh = 22 * S, sw = 24 * S, hbStrip = aB ? new Uint8ClampedArray(bw * bh * BA.n * 4) : null, selStrip = aB ? new Uint8ClampedArray(sw * sw * BA.n * 4) : null;
  if (aB) for (let f = 0; f < BA.n; f++) jobs.push(() => { hbStrip.set(hotbarIcon(S, hb, f / BA.n).data, f * bw * bh * 4); selStrip.set(hotbarSelIcon(S, hb, f / BA.n).data, f * sw * sw * 4); });

  const total = jobs.length + 4;
  for (let i = 0; i < jobs.length; i++) { jobs[i](); progress((i + 1) / total, "Drawing textures…"); await pause(); }

  const zip = new JSZip(), anim = "assets/minecraft/mcpatcher/anim/galaxygui/";
  // see hudFilter; the crosshair (its own strip, or the top-left 16 x 16 of icons.png) keeps colour multiplied by alpha
  const premul = (d, w, x1, y1) => { for (let y = 0; y < y1; y++) for (let x = 0; x < x1; x++) { const q = (y * w + x) * 4, a = d[q + 3] / 255; d[q] *= a; d[q + 1] *= a; d[q + 2] *= a; } return d; };
  const encHUD = (d, w, h, cross) => { const f = hudTexPerPx(); if (!(f > 1.001)) return encodePNG(d, w, h);
    const o = hudFilter(d, w, h, f); if (cross) premul(o, w, cross[0], cross[1]); return encodePNG(o, w, h); };
  zip.file("pack.mcmeta", JSON.stringify({ pack: { pack_format: 1, description: `§dGalaxy GUI §7${st.res}x\n§8Galaxy hearts & XP, steak hunger` } }, null, 2));
  const icon = HRT(28, 0, "full"), pk = new Uint8ClampedArray(256 * 256 * 4);
  for (let y = 0; y < icon.h; y++) pk.set(icon.data.subarray(y * icon.w * 4, (y + 1) * icon.w * 4), ((y + 2) * 256 + 2) * 4);
  zip.file("pack.png", encodePNG(pk, 256, 256));
  progress((jobs.length + 1) / total, "Compressing icons…"); await pause();
  zip.file("assets/minecraft/textures/gui/icons.png", encHUD(icons, Wd, Wd, [16 * S, 16 * S]));
  progress((jobs.length + 2) / total, "Compressing heart animation…"); await pause();
  if (aH) zip.file(anim + "hearts.png", encHUD(hearts, hw, hh * HEART_FRAMES));
  if (hcSeparate) zip.file(anim + "hearts_hardcore.png", encHUD(heartsHC, hw, hh * HEART_FRAMES));
  progress((jobs.length + 3) / total, "Compressing XP animation…"); await pause();
  if (aX) zip.file(anim + "xp.png", encHUD(xp, xw, xh * XP_FRAMES));
  if (WG) zip.file("assets/minecraft/textures/gui/widgets.png", encHUD(WG.out, WG.Wd, WG.Wd));
  if (aB) { zip.file(anim + "hotbar.png", encHUD(hbStrip, bw, bh * BA.n)); zip.file(anim + "hotbar_sel.png", encHUD(selStrip, sw, sw * BA.n)); }
  // interpolate=true (OptiFine 1.8.9 HD U L5 or newer) blends frames on every rendered frame instead of stepping each tick
  const props = (src, x, y, w, h, dur, smooth) => `from=./${src}\nto=textures/gui/icons.png\nx=${x}\ny=${y}\nw=${w}\nh=${h}\nduration=${dur}\n`
    + (smooth ? "interpolate=true\n" : "");
  // animations that are switched off are left out entirely; their first frame stays in icons.png as a still image
  if (aH) zip.file(anim + "hearts.properties", props("hearts.png", 52 * S, 0, 18 * S, 9 * S, HA.dur, st.heart.animFps === "smooth"));
  if (aHC) zip.file(anim + "hearts_hardcore.properties", props(hcSeparate ? "hearts_hardcore.png" : "hearts.png", 52 * S, 45 * S, 18 * S, 9 * S, HA.dur, st.heart.animFps === "smooth"));
  if (aX) zip.file(anim + "xp.properties", props("xp.png", 0, 69 * S, 182 * S, 5 * S, XA.dur, st.xp.animFps === "smooth"));
  if (aB) {
    zip.file(anim + "hotbar.properties", props("hotbar.png", 0, 0, bw, bh, BA.dur, hb.animFps === "smooth").replace("textures/gui/icons.png", "textures/gui/widgets.png"));
    zip.file(anim + "hotbar_sel.properties", props("hotbar_sel.png", 0, 22 * S, sw, sw, BA.dur, hb.animFps === "smooth").replace("textures/gui/icons.png", "textures/gui/widgets.png"));
  }
  // item size: copies of the item models with a scaled "gui" display (hotbar, inventory and chests)
  const isc = +st.itemScale || 1;
  if (Math.abs(isc - 1) > 0.004) for (const name of Object.keys(ITEM_MODELS)) zip.file("assets/minecraft/models/item/" + name + ".json", itemModelJSON(name, isc));
  // animated crosshair: a strip copied onto the top-left of icons.png
  if (crossAnimated(st.cross)) {
    const CA = animFrames(st.cross, "cross", st.res), cw = 16 * S, cs = new Uint8ClampedArray(cw * cw * CA.n * 4);
    for (let f = 0; f < CA.n; f++) cs.set(crosshairIcon(S, st.cross, f / CA.n).data, f * cw * cw * 4);
    zip.file(anim + "crosshair.png", encHUD(cs, cw, cw * CA.n, [cw, cw * CA.n]));
    zip.file(anim + "crosshair.properties", props("crosshair.png", 0, 0, cw, cw, CA.dur, st.cross.animFps === "smooth"));
  }
  progress(1, "Zipping…"); await pause();
  return zip.generateAsync({ type: "blob", compression: "STORE" });
}

let downloads = null;
(async () => { try { downloads = window.claude ? await window.claude.use("downloads") : null; } catch (e) { downloads = null; } })();
$("build").addEventListener("click", async () => {
  const btn = $("build"); btn.disabled = true;
  if (typeof pako === "undefined" || typeof JSZip === "undefined") { setStatus("The zip tools did not load. Reload the page and try again.", "err"); btn.disabled = false; return; }
  const bar = $("bar");
  try {
    setStatus("Building the " + st.res + "x pack…");
    const blob = await buildPack((p, msg) => { bar.style.width = Math.round(p * 100) + "%"; setStatus(msg); });
    const name = `Galaxy-GUI-${st.res}x-1.8.9.zip`, mb = (blob.size / 1e6).toFixed(1);
    if (!downloads) { setStatus(`Built ${name} (${mb} MB), but saving files isn't available in this view. Open the artifact on claude.ai to download it.`, "err"); return; }
    setStatus(`Built ${name} (${mb} MB). Confirm the download…`);
    await downloads.save({ filename: name, data: blob });
    setStatus(`Saved ${name} (${mb} MB).`, "ok");
  } catch (e) {
    const code = e && e.code;
    if (code === "declined") setStatus("Download cancelled.");
    else if (code === "too_large") setStatus("That file is too large for this device. Try the 256x pack.", "err");
    else if (code === "rate_limited") setStatus("A save prompt is already open. Finish it, then try again.", "err");
    else if (e instanceof RangeError) setStatus("Your browser ran out of memory. Try the 256x pack or a desktop browser.", "err");
    else setStatus("The build failed: " + ((e && e.message) || e), "err");
  } finally { btn.disabled = false; setTimeout(() => { bar.style.width = "0%"; }, 1200); }
});

syncInputs();
for (const key of Object.keys(EDIT)) wireEditor(key);
wireVariations();
showTab();
setTimeout(() => { buildPreview(); drawThumbs(); }, 0);
/* export just the crosshair, on the Crosshair tab: a PNG in true colours, or a tiny OptiFine pack that paints it onto
   whatever icons.png is loaded below it (so hearts and the rest of that pack stay as they are) */
function crossFramesRGBA(S, n) {                                // n frames, colour times alpha (as the game wants)
  const f = [];
  for (let k = 0; k < n; k++) f.push(crosshairIcon(S, st.cross, n > 1 ? k / n : 0).data);
  return f;
}
/* OptiFine only runs an animation whose target texture comes from the same pack, so the crosshair-only pack carries its
   own icons.png: the one the player already uses (from their other pack, an icons.png, or Minecraft's 1.8.9.jar),
   with this crosshair painted into its top-left 16 x 16 and everything else left exactly as it was. */
let crossBase = null;                                           // { data, w, h, from }
async function loadCrossBase(file) {
  let blob = file, from = file.name;
  if (!/\.png$/i.test(file.name)) {
    const z = await JSZip.loadAsync(file);
    const path = Object.keys(z.files).find(n => n.toLowerCase().replace(/\\/g, "/").endsWith("assets/minecraft/textures/gui/icons.png"));
    if (!path) throw new Error("There's no icons.png in " + file.name + " (assets/minecraft/textures/gui/icons.png). If that pack doesn't change the icons, choose Minecraft's 1.8.9.jar instead.");
    blob = await z.file(path).async("blob"); from = file.name;
  }
  const bm = await createImageBitmap(blob), c = document.createElement("canvas"); c.width = bm.width; c.height = bm.height;
  const g = c.getContext("2d"); g.drawImage(bm, 0, 0);
  if (bm.width !== bm.height || bm.width % 256 !== 0) throw new Error(`That icons.png is ${bm.width} × ${bm.height}; it should be square and 256, 512, 1024… pixels wide.`);
  crossBase = { data: g.getImageData(0, 0, bm.width, bm.height).data, w: bm.width, h: bm.height, from };
  return crossBase;
}
function crossOnlyPackBlob(detail) {
  // a low-res base is blown up by a whole number with copied pixels (looks exactly the same) so the crosshair can be sharp
  let base = crossBase; const k = Math.max(1, Math.floor((detail || 0) * 16 / base.w));
  if (k > 1) { const W = base.w * k, d = new Uint8ClampedArray(W * W * 4), s = base.data;
    for (let y = 0; y < W; y++) { const sy = Math.floor(y / k); for (let x = 0; x < W; x++) { const q = (sy * base.w + Math.floor(x / k)) * 4, o = (y * W + x) * 4; d[o] = s[q]; d[o + 1] = s[q + 1]; d[o + 2] = s[q + 2]; d[o + 3] = s[q + 3]; } }
    base = { data: d, w: W, h: W, from: base.from }; }
  const S = base.w / 256, cw = 16 * S, anim = crossAnimated(st.cross);
  const A = anim ? animFrames(st.cross, "cross", base.w / 16) : { n: 1, dur: 1 };
  let strip = new Uint8ClampedArray(cw * cw * A.n * 4);
  crossFramesRGBA(S, A.n).forEach((fr, k) => strip.set(fr, k * cw * cw * 4));
  const g = +st.guiMatch || 0, f = g > 0 ? S / g : 0;
  if (f > 1.001) { strip = hudFilter(strip, cw, cw * A.n, f); for (let q = 0; q < strip.length; q += 4) { const a = strip[q + 3] / 255; strip[q] *= a; strip[q + 1] *= a; strip[q + 2] *= a; } }
  const icons = new Uint8ClampedArray(base.data);               // the player's icons, crosshair area replaced
  for (let y = 0; y < cw; y++) icons.set(strip.subarray(y * cw * 4, (y + 1) * cw * 4), y * base.w * 4);
  const zip = new JSZip(), dir = "assets/minecraft/mcpatcher/anim/galaxyguicross/";
  zip.file("pack.mcmeta", JSON.stringify({ pack: { pack_format: 1, description: "§dGalaxy GUI crosshair\n§8On the icons from " + base.from.slice(0, 40) } }, null, 2));
  const icon = document.createElement("canvas"); icon.width = 128; icon.height = 128; const ig = icon.getContext("2d");
  ig.fillStyle = "#2a2440"; ig.fillRect(0, 0, 128, 128); ig.drawImage(toCanvas(crosshairIcon(7, st.cross, 0.15)), 8, 8);
  zip.file("pack.png", encodePNG(ig.getImageData(0, 0, 128, 128).data, 128, 128));
  zip.file("assets/minecraft/textures/gui/icons.png", encodePNG(icons, base.w, base.h));
  if (anim) {                                                    // animated: OptiFine animation onto this pack's own icons.png
    zip.file(dir + "crosshair.png", encodePNG(strip, cw, cw * A.n));
    zip.file(dir + "crosshair.properties", `from=./crosshair.png\nto=textures/gui/icons.png\nx=0\ny=0\nw=${cw}\nh=${cw}\nduration=${A.dur}\n` + (st.cross.animFps === "smooth" ? "interpolate=true\n" : ""));
  }
  return zip.generateAsync({ type: "blob", compression: "DEFLATE" });
}
function crossPngBlob(px) {                                     // true colours on transparent, px x px
  const S = px / 16, im = crosshairIcon(S, st.cross, 0.15), d = new Uint8ClampedArray(im.data);
  for (let q = 0; q < d.length; q += 4) { const a = d[q + 3] / 255; if (a > 0) { d[q] = Math.min(255, d[q] / a); d[q + 1] = Math.min(255, d[q + 1] / a); d[q + 2] = Math.min(255, d[q + 2] / a); } }
  return new Blob([encodePNG(d, im.w, im.h)], { type: "image/png" });
}
(() => {
  const card = document.querySelector('section.card[data-tab="crosshair"]'); if (!card) return;
  const box = document.createElement("div"); box.className = "saves";
  box.innerHTML = '<p class="group-label">Export just the crosshair</p>'
    + '<p class="hint"><b>Crosshair-only pack:</b> your crosshair on top of another pack (or vanilla) without touching its hearts and other icons. '
    + 'Choose the icons it should go on: <b>your other pack\'s .zip</b>, an <b>icons.png</b>, or for vanilla icons <b>Minecraft\'s 1.8.9.jar</b> (in <code>.minecraft/versions/1.8.9/</code>). '
    + 'The file stays in your browser. Put the new pack above the other one in your list. Works without OptiFine (animated crosshairs need it). If those icons are low-res, the pack copies each of their pixels into a bigger block, so they look the same and the crosshair can be sharp. '
    + '<b>PNG:</b> the crosshair on a transparent background in its real colours, for anything that takes a crosshair image.</p>';
  const row = document.createElement("div"); row.className = "export-row";
  const sel = document.createElement("input"); sel.type = "file"; sel.accept = ".zip,.jar,.png"; sel.setAttribute("aria-label", "Pack, icons.png or 1.8.9.jar to put the crosshair on");
  const det = document.createElement("select"); det.setAttribute("aria-label", "Crosshair detail");
  for (const [v, l] of [[0, "Crosshair detail: same as those icons"], [64, "Crosshair detail: 64x (sharper)"], [128, "Crosshair detail: 128x"]]) { const o = document.createElement("option"); o.value = v; o.textContent = l; if (v === 64) o.selected = true; det.appendChild(o); }
  const b1 = document.createElement("button"); b1.type = "button"; b1.className = "btn"; b1.textContent = "Crosshair-only pack (.zip)";
  const sel2 = document.createElement("select"); sel2.setAttribute("aria-label", "PNG size");
  for (const v of [16, 32, 64, 128, 256, 512]) { const o = document.createElement("option"); o.value = v; o.textContent = v + " × " + v + " px"; if (v === 128) o.selected = true; sel2.appendChild(o); }
  const b2 = document.createElement("button"); b2.type = "button"; b2.className = "btn"; b2.textContent = "Crosshair PNG";
  const row2 = document.createElement("div"); row2.className = "export-row";
  row.append(sel, det, b1); row2.append(sel2, b2);
  const msg = document.createElement("p"); msg.className = "status"; msg.setAttribute("role", "status");
  box.append(row, row2, msg); card.appendChild(box);
  const save2 = async (name, make) => {
    if (!downloads) { msg.textContent = "Saving files isn't available in this view. Open the artifact on claude.ai to download it."; msg.className = "status err"; return; }
    try { msg.textContent = "Making " + name + "…"; msg.className = "status"; const blob = await make();
      msg.textContent = "Confirm the download…"; await downloads.save({ filename: name, data: blob });
      msg.textContent = "Saved " + name + "."; msg.className = "status ok";
    } catch (e) { msg.textContent = e && e.code === "declined" ? "Download cancelled." : "Couldn't save the file: " + (e && e.message || e); msg.className = "status err"; }
  };
  b1.disabled = true;
  sel.addEventListener("change", async () => {
    const file = sel.files && sel.files[0]; if (!file) return; b1.disabled = true;
    try { msg.textContent = "Reading " + file.name + "…"; msg.className = "status"; const base = await loadCrossBase(file);
      msg.textContent = `Found icons.png (${base.w / 16}x) in ${file.name}. Now make the pack.`; msg.className = "status ok"; b1.disabled = false;
    } catch (e) { crossBase = null; msg.textContent = (e && e.message) || String(e); msg.className = "status err"; }
  });
  b1.addEventListener("click", () => crossBase && save2(`Crosshair-on-${crossBase.from.replace(/\.(zip|jar|png)$/i, "").replace(/[^\w.-]+/g, "_").slice(0, 40)}.zip`, () => crossOnlyPackBlob(+det.value)));
  b2.addEventListener("click", () => save2(`Galaxy-GUI-crosshair-${sel2.value}px.png`, async () => crossPngBlob(+sel2.value)));
})();

/* crosshair mod download, on the Crosshair tab */
(() => {
  const card = document.querySelector('section.card[data-tab="crosshair"]'); if (!card) return;
  const box = document.createElement("div"); box.className = "saves";
  box.innerHTML = '<p class="group-label">Turn the colour inversion off in game</p>'
    + '<p class="hint">A resource pack can\'t change how the game blends the crosshair, so this is a small Forge 1.8.9 mod that does: it draws the crosshair from your pack with its real colours. '
    + 'It downloads as a .zip: open it and put the .jar inside into <code>.minecraft/mods/</code> (needs Forge for 1.8.9). Untick the preview option above to see what it will look like. '
    + 'Clients that don\'t load Forge mods have their own crosshair settings instead.</p>';
  const row = document.createElement("div"); row.className = "export-row";
  const btn = document.createElement("button"); btn.type = "button"; btn.className = "btn"; btn.textContent = "Download the crosshair mod (.zip)";
  const msg = document.createElement("p"); msg.className = "status"; msg.setAttribute("role", "status");
  row.appendChild(btn); box.append(row, msg); card.appendChild(box);
  btn.addEventListener("click", async () => {
    if (!downloads) { msg.textContent = "Saving files isn't available in this view. Open the artifact on claude.ai to download it."; msg.className = "status err"; return; }
    try {
      // .jar files can't be saved from here, so the jar goes inside a zip with a short note
      const bin = atob(CROSS_MOD_JAR), bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const zip = new JSZip(), zname = CROSS_MOD_NAME.replace(/\.jar$/, ".zip");
      zip.file(CROSS_MOD_NAME, bytes);
      zip.file("HOW TO INSTALL.txt", "Galaxy GUI Crosshair - Forge mod for Minecraft 1.8.9\r\n\r\n"
        + "1. Install Forge for Minecraft 1.8.9 (and OptiFine as a Forge mod if you use it).\r\n"
        + "2. Take " + CROSS_MOD_NAME + " out of this zip and put it in your .minecraft/mods/ folder.\r\n"
        + "   Put the .jar itself there, not this zip and not an unzipped folder.\r\n"
        + "3. Launch the Forge profile. The crosshair now shows its real colours instead of inverting what is behind it.\r\n\r\n"
        + "Settings: config/galaxyguicrosshair.cfg (made on first launch). enabled=false turns the mod off.\r\n");
      const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
      msg.textContent = "Confirm the download…"; msg.className = "status";
      await downloads.save({ filename: zname, data: blob });
      msg.textContent = "Saved " + zname + ". Open it and move the .jar inside into .minecraft/mods/."; msg.className = "status ok";
    } catch (e) { msg.textContent = e && e.code === "declined" ? "Download cancelled." : "Couldn't save the file: " + (e && e.message || e); msg.className = "status err"; }
  });
})();

setTimeout(drawGameCheck, 400);
</script>
