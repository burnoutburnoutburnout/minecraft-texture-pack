/* =====================================================================
   HUD styles: brand-new designs for the hearts, armor and XP bar (drawn in ui.js), all filled
   with the galaxy. Styles never change the steak. One click applies a style.
   ===================================================================== */
const THEMES = [
  { id: "", name: "Your current look", desc: "Your hearts, armor and XP bar as you set them in the other tabs." },
  { id: "vial", name: "Galaxy vials", desc: "Glass containers with galaxy liquid sloshing inside: corked heart bottles, a glass XP tube, empty glass for empty slots." },
  { id: "constellation", name: "Constellations", desc: "Each heart and armor piece traced by twinkling stars joined with glowing lines; the XP bar is a chain of star nodes." },
  { id: "mosaic", name: "Low-poly mosaic", desc: "Everything built from small shimmering triangles of galaxy, with a dark outline." },
  { id: "rift", name: "Cosmic rift", desc: "Jagged, glowing tears in space with the galaxy showing through, and little shards orbiting the hearts." },
  { id: "celestial", name: "Celestial gold", desc: "Gold-rimmed galaxy with a crescent moon and a star on each heart, a star on the armor and star caps on the XP bar." },
];
/* build the settings a theme produces, starting from the current settings */
function themeState(th) {
  const s = clone(st);
  // a style only changes how the hearts, armor and XP bar are drawn; colours, animation and the steak stay as they are
  s.heart.uiStyle = th.id; s.armor.uiStyle = th.id; s.xp.uiStyle = th.id;
  return s;
}
/* a small HUD drawn with any settings (swaps the global settings while drawing) */
function drawMiniHud(cv, s, sc) {
  const saved = st; st = s;
  try {
    const g = cv.getContext("2d"), k = sc, W = cv.width, H = cv.height;
    const grad = g.createLinearGradient(0, 0, 0, H); grad.addColorStop(0, "#5d7d3f"); grad.addColorStop(1, "#43602c");
    g.fillStyle = grad; g.fillRect(0, 0, W, H);
    const x0 = Math.round((W - 182 * k) / 2), xpY = H - 7 * k, rowY = xpY - 10 * k, topY = rowY - 10 * k;
    const ic = rgba => toCanvas(rgba);
    const arm = ["empty", "half", "full"].map(m => ic(ARM(k, m)));
    const hf = ic(HRT(k, 0.15, "full")), hh = ic(HRT(k, 0.15, "half")), hc = ic(HRT(k, 0, "container"));
    const sf = ic(steakIcon(k, st, "full")), shf = ic(steakIcon(k, st, "half")), sc2 = ic(steakIcon(k, st, "container"));
    const bub = ic(bubbleIcon(k, false, st.bubble.col)), pop = ic(bubbleIcon(k, true, st.bubble.col));
    for (let i = 0; i < 10; i++) g.drawImage(arm[i < 6 ? 2 : i === 6 ? 1 : 0], x0 + i * 8 * k, topY);
    for (let i = 0; i < 10; i++) { const x = x0 + i * 8 * k; g.drawImage(hc, x, rowY); if (i < 9) g.drawImage(i < 8 ? hf : hh, x, rowY); }
    for (let i = 0; i < 10; i++) { const x = x0 + 182 * k - 9 * k - i * 8 * k; g.drawImage(sc2, x, rowY); if (i < 8) g.drawImage(i < 7 ? sf : shf, x, rowY); }
    for (let i = 0; i < 7; i++) g.drawImage(i < 6 ? bub : pop, x0 + 182 * k - 9 * k - i * 8 * k, topY);
    g.drawImage(ic(BAR(k, 0, "bg")), x0, xpY);
    const fw = Math.round(182 * 0.72 * k); g.drawImage(ic(BAR(k, 0.2, "fill")), 0, 0, fw, 5 * k, x0, xpY, fw, 5 * k);
  } finally { st = saved; }
}
