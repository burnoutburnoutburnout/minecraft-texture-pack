const pause = () => new Promise(r => setTimeout(r, 0));
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

  const hw = 18 * S, hh = 9 * S, hearts = new Uint8ClampedArray(hw * hh * HEART_FRAMES * 4);
  // hardcore hearts get their own animation strip when the two rows look different
  const hcSeparate = (st.heart.hardcore || "world") === "world", heartsHC = hcSeparate ? new Uint8ClampedArray(hearts.length) : null;
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
  for (let f = 0; f < HEART_FRAMES; f++) strip(hearts, "normal")(f);
  if (hcSeparate) for (let f = 0; f < HEART_FRAMES; f++) strip(heartsHC, "hardcore")(f);
  const xw = 182 * S, xh = 5 * S, xp = new Uint8ClampedArray(xw * xh * XP_FRAMES * 4);
  for (let f = 0; f < XP_FRAMES; f++) jobs.push(() => xp.set(BAR(S, f / XP_FRAMES, "fill").data, f * xw * xh * 4));

  const total = jobs.length + 4;
  for (let i = 0; i < jobs.length; i++) { jobs[i](); progress((i + 1) / total, "Drawing textures…"); await pause(); }

  const zip = new JSZip(), anim = "assets/minecraft/mcpatcher/anim/galaxygui/";
  zip.file("pack.mcmeta", JSON.stringify({ pack: { pack_format: 1, description: `§dGalaxy GUI §7${st.res}x\n§8Galaxy hearts & XP, steak hunger` } }, null, 2));
  const icon = HRT(28, 0, "full"), pk = new Uint8ClampedArray(256 * 256 * 4);
  for (let y = 0; y < icon.h; y++) pk.set(icon.data.subarray(y * icon.w * 4, (y + 1) * icon.w * 4), ((y + 2) * 256 + 2) * 4);
  zip.file("pack.png", encodePNG(pk, 256, 256));
  progress((jobs.length + 1) / total, "Compressing icons…"); await pause();
  zip.file("assets/minecraft/textures/gui/icons.png", encodePNG(icons, Wd, Wd));
  progress((jobs.length + 2) / total, "Compressing heart animation…"); await pause();
  zip.file(anim + "hearts.png", encodePNG(hearts, hw, hh * HEART_FRAMES));
  if (hcSeparate) zip.file(anim + "hearts_hardcore.png", encodePNG(heartsHC, hw, hh * HEART_FRAMES));
  progress((jobs.length + 3) / total, "Compressing XP animation…"); await pause();
  zip.file(anim + "xp.png", encodePNG(xp, xw, xh * XP_FRAMES));
  // interpolate=true (OptiFine 1.8.9 HD U L5 or newer) blends frames on every rendered frame instead of stepping each tick
  const props = (src, x, y, w, h, dur, smooth) => `from=./${src}\nto=textures/gui/icons.png\nx=${x}\ny=${y}\nw=${w}\nh=${h}\nduration=${dur}\n`
    + (smooth ? "interpolate=true\n" : "");
  zip.file(anim + "hearts.properties", props("hearts.png", 52 * S, 0, 18 * S, 9 * S, st.heart.speed, st.heart.animFps === "smooth"));
  zip.file(anim + "hearts_hardcore.properties", props(hcSeparate ? "hearts_hardcore.png" : "hearts.png", 52 * S, 45 * S, 18 * S, 9 * S, st.heart.speed, st.heart.animFps === "smooth"));
  zip.file(anim + "xp.properties", props("xp.png", 0, 69 * S, 182 * S, 5 * S, st.xp.speed, st.xp.animFps === "smooth"));
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
</script>
