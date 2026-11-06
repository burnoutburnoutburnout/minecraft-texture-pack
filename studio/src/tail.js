/* =====================================================================
   Settings
   ===================================================================== */
const DEFAULTS = {
  tab: "steak", pvHardcore: false,
  design: "grill", shape: designShape("grill"),
  steakCol: { meat: "#703624", dark: "#422015", rim: "#a65035", side: "#401f15", burn: "#100805", linked: true },
  hungerTint: "#64962e",
  empty: { style: "default", fill: "#1f2120", outline: "#060403", outlineW: 0.55, shade: 0.35, fillA: 1, alpha: 1,
    ghostBright: 0.35, ghostSat: 0.15, ghostTint: 0.25, size: 1, hungerFill: "#26321a" },
  heart: Object.assign(clone(EL_DEFAULTS.heart), { loopSec: 5.6 }),
  poison: { c1: "#0e3c18", c2: "#329638", c3: "#96f06e" },
  wither: { c1: "#121218", c2: "#403e4c", c3: "#828092" },
  gold: { c1: "#5a2e06", c2: "#d28818", c3: "#ffe26e" },
  armor: clone(EL_DEFAULTS.armor),
  xp: Object.assign(clone(EL_DEFAULTS.bar), { loopSec: 4.8 }),
  boss: { c1: "#3c0a46", c2: "#b428a0", c3: "#ff6edc" },
  jump: { c1: "#5a2e06", c2: "#d28818", c3: "#ffe26e" },
  bubble: { col: "#78c8ff", style: "classic", accent: "#ffd27a", size: 1, rim: 1, shine: 1, alpha: 1 },
  cross: { col: "#ffffff", len: 4.5, thick: 1.0 },
  hotbar: clone(HB_DEFAULTS),
  res: 128, perf: { preset: "light", animHearts: true, animHardcore: true, animXP: true, animHotbar: true },
};
const KEY = "galaxy-gui-studio-v4";
function deepMerge(base, over) {
  for (const k of Object.keys(over || {})) {
    if (over[k] && typeof over[k] === "object" && !Array.isArray(over[k]) && base[k] && typeof base[k] === "object") deepMerge(base[k], over[k]);
    else if (k in base) base[k] = over[k];
  }
  return base;
}
let st = clone(DEFAULTS);
try { deepMerge(st, JSON.parse(localStorage.getItem(KEY) || "null")); } catch (e) { /* storage unavailable */ }
/* Earlier versions of the bean outline: saved copies are upgraded to the current one. */
const OLD_BEANS = [
  [[0.25, 6.15], [0.75, 4.75], [1.95, 3.95], [3.15, 3.55], [3.85, 2.3], [4.95, 1.0], [6.5, 0.45], [7.95, 0.9], [8.8, 2.25], [8.75, 4.05], [7.8, 5.7], [6.15, 7.0], [4.3, 7.85], [2.45, 8.1], [0.95, 7.45]],
  [[0.39, 6.31], [0.2, 4.55], [1.17, 3.11], [2.65, 2.58], [3.45, 1.85], [4.52, 1.49], [5.83, 1.2], [7.57, 1.29], [8.8, 2.55], [8.5, 4.32], [7.48, 5.53], [6.52, 6.25], [5.64, 6.75], [4.67, 7.21], [3.38, 7.6], [1.66, 7.53]],
  [[0.47, 5.79], [0.2, 4.43], [0.85, 3.2], [1.89, 2.44], [3.05, 2.26], [3.97, 2.41], [4.62, 1.74], [5.66, 1.19], [6.95, 1.18], [8.21, 1.78], [8.8, 3.03], [8.64, 4.38], [8.05, 5.49], [7.29, 6.31], [6.45, 6.88], [5.58, 7.25], [4.65, 7.47], [3.64, 7.52], [2.54, 7.32], [1.4, 6.78]],
];
{
  const near = (p, q) => p.length === q.length && p.every((pt, i) => Math.abs(pt[0] - q[i][0]) < 0.02 && Math.abs(pt[1] - q[i][1]) < 0.02);
  if (st.shape.custom && Array.isArray(st.shape.points) && OLD_BEANS.some(o => near(st.shape.points, o))) {
    st.shape.points = clone(BEAN_POINTS); st.shape.rotate = 0.12;
  }
}
/* the earlier Smooth grilled (thin outline + underside slab) is upgraded to the traced version */
if (st.shape.texture === "smooth-grilled" && (st.shape.thick || 0) > 0) { st.shape = designShape("smooth-grilled"); st.steakCol.meat = "#864532"; }
function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* ignore */ } }
const getP = path => path.split(".").reduce((o, k) => o[k], st);
const setP = (path, v) => { const ks = path.split("."), last = ks.pop(); ks.reduce((o, k) => o[k], st)[last] = v; };

/* element renderers bound to the current settings */
/* Minecraft has a separate row of heart icons for hardcore worlds. HEART_ROW says which row is being drawn,
   and the hardcore mark is added when the setting asks for it on that row. */
let HEART_ROW = "normal";
const heartMarked = () => { const m = st.heart.hardcore || "world"; return m === "always" || (m === "world" && HEART_ROW === "hardcore"); };
const HRT = (S, t, mode = "full", flash = false, cols = st.heart, seed = 0) =>
  elementIcon("heart", S, heartMarked() ? Object.assign({}, st.heart, { hcMark: true }) : st.heart, cols, t, mode, flash, seed);
/* the half-armor icon is shown on its own in game, so it is the full piece on the left and the empty slot on the right */
function halfArmor(S) {
  const f = elementIcon("armor", S, st.armor, st.armor, 0, "full"), e = elementIcon("armor", S, st.armor, st.armor, 0, "empty");
  const out = new Uint8ClampedArray(f.data.length);
  for (let j = 0; j < f.h; j++) for (let i = 0; i < f.w; i++) {
    const k = (j * f.w + i) * 4, w = sat(0.5 - ((i + 0.5) / S - 4.5) * S);
    for (let c = 0; c < 4; c++) out[k + c] = f.data[k + c] * w + e.data[k + c] * (1 - w);
  }
  return { w: f.w, h: f.h, data: out };
}
const ARM = (S, mode) => mode === "half" ? halfArmor(S) : elementIcon("armor", S, st.armor, st.armor, 0, mode);
const BAR = (S, t, mode, cols = st.xp, seed = 5, flow = true) => elementIcon("bar", S, flow ? st.xp : Object.assign({}, st.xp, { flow: false }), cols, t, mode, false, seed);

/* =====================================================================
   Control panel (built from this list)
   ===================================================================== */
const SPEED = ["", "slow", "calm", "lively", "fast"];
const C = (path, label) => ({ type: "color", path, label });
const R = (path, label, min, max, step) => ({ type: "range", path, label, min, max, step });
const SP = (path, label) => ({ type: "speed", path, label });
const D = (path, label, min, max, step) => ({ type: "deg", path, label, min, max, step });
const TG = (path, label) => ({ type: "toggle", path, label });
const AN = (path, label) => ({ type: "angle", path, label, min: 0, max: 360, step: 1 });
const SEL = (path, label, options) => ({ type: "select", path, label, options });
// OptiFine times animation frames in game ticks (20 a second), so frame rates are 20 divided by a whole number
const FPS_OPTIONS = [["1", "20 fps (highest the game allows)"], ["2", "10 fps"], ["3", "6.7 fps"], ["4", "5 fps"], ["5", "4 fps"], ["10", "2 fps"]];
const NUM_SELECT = /(\.speed)$/;
// frames in a loop: frame rate x loop length, capped so the texture stays a sane size (512x XP bars are large)
function animFrames(el, kind, res = st.res) {
  const S = res / 16, cap = kind === "hotbar" ? Math.max(6, Math.min(240, Math.floor(40e6 / (182 * 22 * S * S))))
    : kind === "bar" ? (res >= 512 ? 64 : res >= 256 ? 160 : 240) : 240, loop = Math.max(1, +el.loopSec || 5);
  let dur = Math.max(1, Math.round(+el.speed || 2)), n = Math.round(loop * 20 / dur);
  if (n > cap) { dur = Math.ceil(loop * 20 / cap); n = Math.round(loop * 20 / dur); }
  return { n: Math.max(2, n), dur, fps: 20 / dur, capped: dur !== Math.max(1, Math.round(+el.speed || 2)) };
}
function fpsInfoText(el, kind) {
  const a = animFrames(el, kind), f = +a.fps.toFixed(1);
  let s = `In game: ${f} fps, ${a.n} frames, loops every ${(a.n * a.dur / 20).toFixed(1)} s.`;
  if (a.capped) s += ` Lowered from ${+(20 / (+el.speed || 2)).toFixed(1)} fps to keep the ${st.res}x texture a manageable size; shorten the loop for a higher frame rate.`;
  if (el.animFps === "smooth") s += " Smoothing blends between frames, so motion looks fluid at your monitor's refresh rate.";
  return s;
}
const INT_PATHS = /(burnCount|facets|segments|wave\.1|dash|stitch|shoot|breaks|sparks|spin|cycles)$/;

function elSections(key, kind, name, cls) {
  const p = s => key + "." + s;
  const shapeCtl = kind === "heart"
    ? [R(p("w"), "Width", 0.5, 1.5, 0.01), R(p("h"), "Height", 0.5, 1.5, 0.01), R(p("round"), "Roundness", 0, 1.6, 0.01),
       R(p("tip"), "Point length", 0.4, 2.5, 0.01), R(p("cleft"), "Top notch (negative = flatter)", -1.5, 2, 0.01)]
    : kind === "armor"
    ? [R(p("shoulder"), "Shoulder width", 1.5, 4.4, 0.01), R(p("sleeve"), "Sleeve reach", 1.5, 4.5, 0.01), R(p("sleeveY"), "Sleeve length", -2.5, 2, 0.01),
       R(p("armpit"), "Chest width", 1, 3.5, 0.01), R(p("waist"), "Waist width", 0.5, 4, 0.01), R(p("neckW"), "Collar width", 0.2, 2.8, 0.01),
       R(p("neckD"), "Collar depth", -0.5, 3.5, 0.01), R(p("top"), "Collar height", -4.4, -1.5, 0.01), R(p("bottom"), "Length", 1, 4.4, 0.01),
       R(p("round"), "Corner rounding", 0, 0.8, 0.01)]
    : [R(p("barH"), "Thickness", 1, 5, 0.05), R(p("radius"), "Corner roundness", 0, 2.5, 0.05), R(p("slant"), "Slant", -2, 2, 0.01),
       R(p("taper"), "Taper", -0.8, 0.8, 0.01), R(p("segments"), "Segments", 0, 30, 1), R(p("segGap"), "Segment gap", 0.1, 4, 0.05)];
  const posCtl = kind === "bar" ? [R(p("posY"), "Move up / down", -1.5, 1.5, 0.01)]
    : [R(p("posX"), "Move left / right", -3, 3, 0.01), R(p("posY"), "Move up / down", -3, 3, 0.01), R(p("size"), "Size", 0.4, 1.5, 0.01), D(p("tilt"), "Tilt", -1.57, 1.57, 0.01)];
  const borderCtl = [R(p("outline"), "Outline thickness", 0, 1.2, 0.01), R(p("rough.0"), "Roughness", 0, 0.45, 0.005), R(p("rough.1"), "Roughness detail", 1, 16, 0.1),
    R(p("wave.0"), "Ripples", 0, 0.45, 0.005), R(p("wave.1"), "Ripple count", 0, 40, 1)];
  if (kind !== "bar") borderCtl.push(R(p("facets"), "Facets", 0, 24, 1), R(p("thick"), "3D thickness", 0, 1.5, 0.01));
  borderCtl.push(SEL(p("waveType"), "Ripple shape", [["sine", "Wavy"], ["scallop", "Scalloped"], ["spike", "Spiky"]]),
    SEL(p("outlineStyle"), "Outline style", [["solid", "Solid colour"], ["gradient", "Shaded"], ["light", "Bright"], ["ink", "Ink black"],
      ["gold", "Gold"], ["silver", "Silver"], ["rainbow", "Rainbow"], ["frost", "Frost"]]),
    R(p("dash"), "Dashes", 0, 30, 1), R(p("stitch"), "Stitches", 0, 30, 1), R(p("bevel"), "Bevel (negative = inset)", -1.5, 1.5, 0.01),
    R(p("feather"), "Soft edge", 0, 1.2, 0.01), R(p("frame"), "Frame width", 0, 2.2, 0.01), R(p("frameLight"), "Frame lighting", 0, 1, 0.01),
    SEL(p("frameMat"), "Frame material", [["stone", "Stone"], ["iron", "Iron"], ["gold", "Gold"], ["bronze", "Bronze"], ["silver", "Silver"], ["obsidian", "Obsidian"]]));
  if (kind !== "bar") borderCtl.push(R(p("glowOut"), "Outer glow", 0, 1.5, 0.01),
    SEL(p("glowCol"), "Glow colour", [["main", "Highlight colour"], ["white", "White"], ["outline", "Outline colour"]]),
    R(p("sticker"), "Sticker border", 0, 0.8, 0.01), R(p("ring"), "Outer ring gap", 0, 0.8, 0.01), R(p("drop"), "Drop shadow", 0, 1, 0.01));
  borderCtl.push(TG(p("double"), "Inner highlight line"));
  const texCtl = [...(kind === "heart" ? [SEL(p("hardcore"), "Hardcore mark", [["world", "In hardcore worlds (like vanilla)"], ["always", "On all hearts"], ["off", "Never"]]),
      TG("pvHardcore", "Preview as a hardcore world"), SEL(p("illus"), "Heart style", [["", "Built from the cards below"], ["gemheart", "Framed gem heart (picture match)"]]),
      SEL(p("gemFill"), "Gem fill (framed gem heart)", [["facets", "Cut ruby facets"], ["texture", "Selected texture"]]),
      R(p("facetStr"), "Facet shading on the texture", 0, 1, 0.01)] : []),
    R(p("stars"), "Stars", 0, 3, 0.05), R(p("texScale"), "Texture size", 0.3, 3, 0.01), R(p("texStrength"), "Texture strength", 0, 1, 0.01), R(p("glow"), "Edge glow", 0, 1, 0.01)];
  if (kind !== "armor") texCtl.push(SEL(p("speed"), "Frame rate (FPS)", FPS_OPTIONS),
    R(p("loopSec"), kind === "bar" ? "Loop length in seconds (longer = slower flow)" : "Loop length in seconds (longer = slower motion)", 1, 12, 0.1),
    SEL(p("animFps"), "Smoothing", [["ticks", "Off (lightest)"], ["smooth", "Blend frames (smooth, costs FPS)"]]),
    { type: "info", path: p("fpsInfo"), kind }, 
    SEL(p("motion"), "Motion", [["random", "Random: wanders, changes speed, shooting stars"], ["loop", "Steady: drifts one way at one speed"]]),
    R(p("shoot"), "Shooting stars per loop (random)", 0, 5, 1));
  const lightCtl = [AN(p("light"), "Light direction"), R(p("shade"), "Inner shadow", 0, 2.5, 0.01), R(p("falloff"), "Light falloff", 0, 2, 0.01),
    R(p("rimLight"), "Rim light", 0, 2, 0.01), R(p("rimShadow"), "Rim shadow", 0, 2, 0.01)];
  const shineCtl = kind === "bar"
    ? [R(p("shine"), "Strength", 0, 1, 0.01), R(p("shineSize"), "Width", 0.3, 4, 0.01), R(p("shineY"), "Position", -2.5, 2.5, 0.05)]
    : [R(p("shine"), "Strength", 0, 1, 0.01), R(p("shineSize"), "Size", 0.3, 3, 0.01), R(p("shineX"), "Left / right", -4, 4, 0.05), R(p("shineY"), "Up / down", -4, 4, 0.05)];
  const colorCtl = [C(p("c1"), "Dark"), C(p("c2"), "Main"), C(p("c3"), "Highlight"), C(p("outlineCol"), "Outline")];
  if (kind === "heart") colorCtl.push(C(p("emptyCol"), "Empty heart"), C(p("emptyOutline"), "Empty outline"));
  if (kind === "armor") colorCtl.push(C(p("emptyCol"), "Empty slot"));
  if (kind === "bar") colorCtl.push(C(p("bgCol"), "Empty bar"));
  const colorGroups = [{ controls: colorCtl }];
  const extra = kind === "heart" ? [["poison", "Poison hearts"], ["wither", "Wither hearts"], ["gold", "Absorption (golden) hearts"]]
    : kind === "bar" ? [["boss", "Boss health bar"], ["jump", "Horse jump bar"]] : [];
  for (const [k, l] of extra) colorGroups.push({ label: l, controls: [C(k + ".c1", "Dark"), C(k + ".c2", "Main"), C(k + ".c3", "Highlight")] });
  const shapeGroups = [{ label: "Position & size", controls: posCtl }];
  if (kind !== "bar") shapeGroups.push({ label: "Draw my own", controls: [R(p("smooth"), "Corner smoothness", 0, 1, 0.01)] });
  shapeGroups.push({ label: kind === "bar" ? "Bar" : "Slider shape", controls: shapeCtl });
  return [
    ...(kind === "bar" ? [{ id: "xp-style", tab: key, title: "XP bar style", cls, chips: "styles-xp",
      hint: "A drawn style for the XP bar only, filled with your galaxy colours. \"Built from the cards\" uses the design, texture and border cards below.", groups: [] },
      { id: "xp-rift", tab: key, title: "Rift variants & settings", cls, chips: "rift-xp",
        hint: "Pick a rift variant (this switches the XP bar to the rift style), then tune it with the sliders.", groups: [
        { label: "Shape", controls: [R("xp.rift.width", "Thickness", 0.2, 2.2, 0.01), R("xp.rift.widthVar", "Thickness variation", 0, 1, 0.01),
          R("xp.rift.jag", "Jagged edges", 0, 0.6, 0.01), R("xp.rift.jagFreq", "Jag detail", 0.5, 5, 0.05), R("xp.rift.sharp", "Sharp, crackly edges", 0, 1, 0.01),
          R("xp.rift.wave", "Wave", 0, 1.4, 0.01), R("xp.rift.zigzag", "Zig-zag (lightning)", 0, 1.6, 0.01), R("xp.rift.twin", "Twin rifts gap (0 = one rift)", 0, 1.8, 0.01), R("xp.rift.breaks", "Breaks", 0, 14, 1)] },
        { label: "Light", controls: [R("xp.rift.glow", "Glow", 0, 1.6, 0.01), R("xp.rift.glowW", "Glow width", 0.05, 0.8, 0.01), R("xp.rift.fadeEnds", "Light fades at the ends", 0, 91, 0.5), R("xp.rift.core", "Hot edge", 0, 2, 0.01),
          R("xp.rift.inner", "Inside brightness", 0.2, 1.6, 0.01), R("xp.rift.pulse", "Flicker", 0, 1, 0.01), R("xp.rift.sparks", "Sparks", 0, 30, 1), R("xp.rift.shift", "Colour shift along the bar", 0, 1, 0.01)] },
        { label: "Colours", controls: [TG("xp.rift.custom", "Use my own glow colours (otherwise the galaxy colours)"), C("xp.rift.glowCol", "Glow"), C("xp.rift.hotCol", "Hot edge"), C("xp.rift.shiftCol", "Shift colour")] },
      ] }] : []),
    { id: key + "-design", tab: key, title: name + ": start from a design", cls, chips: "designs-" + key,
      hint: "A design sets the texture, colours, border, shape and lighting together. Change any part of it in the cards below.", groups: [] },
    { id: key + "-texture", tab: key, title: name + " texture", cls, chips: "textures-" + key, groups: [{ controls: texCtl }] },
    { id: key + "-border", tab: key, title: name + " border", cls, chips: "borders-" + key,
      hint: kind !== "bar" ? "Facets above 0 cut the edge into flat sides." : null, groups: [{ controls: borderCtl }] },
    { id: key + "-shape", tab: key, title: name + " shape", cls, editor: kind !== "bar" ? key : null, chips: kind === "heart" ? [["shapes-heart", "Pick a heart shape"]] : null,
      hint: kind !== "bar" ? "Use the sliders, or switch to Draw my own and drag the dots. The dashed square is the edge of the icon."
        : "The game shows as much of the fill as you have XP, so the shape runs along the whole bar.", groups: shapeGroups },
    { id: key + "-light", tab: key, title: name + " lighting", cls, groups: [{ controls: lightCtl }, { label: "Shine", controls: shineCtl }] },
    { id: key + "-colors", tab: key, title: name + " colours", cls, groups: colorGroups },
  ];
}

const SECTIONS = [
  { id: "steak-vary", tab: "steak", title: "Steak: pick a slightly different shape", cls: "meat", vary: true,
    hint: "Each one reshapes your current steak's outline a little; texture, colours and border stay the same. Click one to use it, then make variations again to keep refining.", groups: [] },
  { id: "steak-design", tab: "steak", title: "Steak: start from a design", cls: "meat", chips: "designs",
    hint: "A design sets the texture, border and shape together. Change any part of it in the cards below.", groups: [] },
  { id: "steak-texture", tab: "steak", title: "Steak texture", cls: "meat", chips: [["texturesReal", "Realistic"], ["textures", "Cartoon"]], groups: [
    { controls: [R("shape.texStrength", "Texture strength", 0, 1, 0.01), R("shape.texScale", "Texture size", 0.3, 3, 0.01)] },
    { label: "Burn lines (grill textures)", controls: [R("shape.burnCount", "Number of lines", 0, 10, 1), R("shape.burnSpacing", "Spacing", 0.3, 2.5, 0.01),
      R("shape.burnW", "Width", 0.2, 3, 0.01), D("shape.burnAng", "Angle", -1.57, 1.57, 0.01), R("shape.burnOffset", "Slide", -3, 3, 0.01),
      R("shape.burnHalo", "Scorch glow", 0, 2.5, 0.01), TG("shape.cross", "Crosshatch"), TG("shape.smoothGrill", "Grill lines on the Smooth steak")] },
  ] },
  { id: "steak-border", tab: "steak", title: "Steak border", cls: "meat", chips: "borders",
    hint: "Facets above 0 cut the edge into flat sides, which turns off roughness, lumps and ripples.", groups: [
    { controls: [R("shape.outline", "Outline thickness", 0, 1, 0.01), R("shape.thick", "Steak thickness", 0, 2, 0.01),
      R("shape.rough.0", "Roughness", 0, 0.45, 0.005), R("shape.rough.1", "Roughness detail", 1, 16, 0.1),
      R("shape.lump.0", "Lumps", 0, 0.8, 0.01), R("shape.lump.1", "Lump count", 0.3, 6, 0.05),
      R("shape.wave.0", "Ripples", 0, 0.45, 0.005), R("shape.wave.1", "Ripple count", 0, 40, 1),
      R("shape.facets", "Facets", 0, 24, 1), TG("shape.double", "Inner highlight line")] },
  ] },
  { id: "steak-shape", tab: "steak", title: "Steak shape", cls: "meat", editor: "steak",
    hint: "Use the sliders, or switch to Draw my own and drag the dots. The dashed square is the edge of the icon.", groups: [
    { label: "Position & size", controls: [R("shape.posX", "Move left / right", -3, 3, 0.01), R("shape.posY", "Move up / down", -3, 3, 0.01),
      R("shape.size", "Size", 0.4, 1.6, 0.01), D("shape.angle", "Tilt", -1.57, 1.57, 0.01)] },
    { label: "Draw my own", controls: [R("shape.smooth", "Corner smoothness", 0, 1, 0.01), D("shape.rotate", "Rotate outline", -1.2, 1.2, 0.01)] },
    { label: "Body (slider shape)", controls: [R("shape.rx", "Length", 1.5, 4.6, 0.01), R("shape.ry", "Width", 0.8, 3.6, 0.01),
      R("shape.p", "Squareness", 1.2, 6, 0.05), R("shape.bend", "Bend", -1.5, 1.5, 0.01), R("shape.taper", "Taper", -0.8, 0.8, 0.01),
      R("shape.liftL", "Left end lift", -1.5, 1.8, 0.01), R("shape.lift", "Right end lift", -1.5, 1.8, 0.01)] },
    { label: "Top edge", controls: [R("shape.arch", "Arch", -0.8, 1.2, 0.01), R("shape.dip", "Dip (negative = bump)", -1, 1, 0.01),
      R("shape.dipX", "Dip position", -4, 4, 0.05), R("shape.dipW", "Dip width", 0.2, 3, 0.01)] },
    { label: "Bottom edge", controls: [R("shape.bulge", "Bulge", -0.8, 1.2, 0.01), R("shape.dipB", "Dip (negative = bump)", -1, 1, 0.01),
      R("shape.dipBX", "Dip position", -4, 4, 0.05), R("shape.dipBW", "Dip width", 0.2, 3, 0.01)] },
  ] },
  { id: "steak-light", tab: "steak", title: "Steak lighting", cls: "meat", groups: [
    { controls: [AN("shape.light", "Light direction"), R("shape.shade", "Shading", 0, 2.5, 0.01),
      R("shape.rimLight", "Rim light", 0, 2, 0.01), R("shape.rimShadow", "Rim shadow", 0, 2, 0.01)] },
    { label: "Shine spot", controls: [R("shape.shine", "Strength", 0, 1, 0.01), R("shape.shineSize", "Size", 0.3, 3, 0.01), R("shape.shineX", "Position", -4, 4, 0.05)] },
    { label: "Hunger bar finish", controls: [R("shape.shadow", "Drop shadow", 0, 1, 0.01), R("shape.edgeHi", "Edge highlight", 0, 1.5, 0.01)] },
  ] },
  { id: "steak-colors", tab: "steak", title: "Steak colours", cls: "meat", groups: [
    { controls: [C("steakCol.meat", "Meat"), C("steakCol.dark", "Seared"), C("steakCol.rim", "Highlight"), C("steakCol.side", "Side"),
      C("shape.outlineCol", "Outline"), C("steakCol.burn", "Burn lines"), C("hungerTint", "Hunger effect")] },
    { controls: [TG("steakCol.linked", "Match seared, highlight and side to the meat colour")] },
  ] },
  { id: "steak-empty", tab: "steak", title: "Empty steak slots", cls: "meat",
    hint: "How the hunger bar looks where you've lost food. Faded steak dims your own steak; Solid and Outline only use the colours below. The live preview shows the result.", groups: [
    { controls: [SEL("empty.style", "Style", [["default", "Design default"], ["solid", "Solid colour"], ["ghost", "Faded steak"], ["outline", "Outline only"], ["hidden", "Hidden (no empty slots)"]])] },
    { label: "Colours", controls: [C("empty.fill", "Fill"), C("empty.outline", "Outline"), C("empty.hungerFill", "Fill with hunger effect")] },
    { label: "Solid & outline only", controls: [R("empty.outlineW", "Outline thickness", 0, 1.5, 0.01), R("empty.shade", "Shading", 0, 1, 0.01), R("empty.fillA", "Fill opacity", 0, 1, 0.01)] },
    { label: "Faded steak", controls: [R("empty.ghostBright", "Brightness", 0, 1, 0.01), R("empty.ghostSat", "Steak colour kept", 0, 1, 0.01), R("empty.ghostTint", "Tint with fill colour", 0, 1, 0.01)] },
    { label: "All styles", controls: [R("empty.alpha", "Overall opacity", 0, 1, 0.01), R("empty.size", "Size", 0.6, 1.1, 0.01)] },
  ] },
  ...elSections("heart", "heart", "Hearts", ""),
  ...elSections("armor", "armor", "Armor", ""),
  ...elSections("xp", "bar", "XP bar", "xp"),
  { id: "hb-style", tab: "hotbar", title: "Hotbar style", cls: "", chips: "styles-hotbar",
    hint: "Replaces the hotbar in textures/gui/widgets.png. That file also holds the menu buttons, so the pack draws matching buttons (pick them below).", groups: [
    { controls: [TG("hotbar.enabled", "Include the hotbar and buttons in the pack")] }] },
  { id: "hb-gal", tab: "hotbar", title: "Galaxy variants", cls: "", chips: "hb-gal",
    hint: "Each variant sets the galaxy colours and effects. Picking one switches a non-galaxy hotbar to Galaxy rails; Nebula glass and Celestial gold keep their look and take the new galaxy.", groups: [
    { controls: [R("hotbar.gal.band", "Milky Way band", 0, 1.5, 0.01), R("hotbar.gal.swirl", "Swirl", 0, 1.5, 0.01), R("hotbar.gal.dust", "Star dust", 0, 1.5, 0.01), R("hotbar.gal.flare", "Supernova flares", 0, 1.5, 0.01)] }] },
  { id: "hb-rb", tab: "hotbar", title: "Rainbow variants", cls: "", chips: "hb-rb",
    hint: "Picking one switches the hotbar to the rainbow style.", groups: [
    { controls: [R("hotbar.rb.sat", "Colour strength", 0, 1, 0.01), R("hotbar.rb.light", "Brightness", 0.2, 1, 0.01), R("hotbar.rb.bands", "Rainbows across the bar", 0.25, 4, 0.05),
      R("hotbar.rb.cycles", "Colour cycles per loop", 0, 4, 1), R("hotbar.rb.angle", "Stripe angle", -80, 80, 1), R("hotbar.rb.slotTint", "Colour in the slots", 0, 1, 0.01),
      R("hotbar.rb.shimmer", "Shimmer", 0, 1.5, 0.01)] }] },
  { id: "hb-shape", tab: "hotbar", title: "Shape & rotation", cls: "", chips: [["hb-shape", "Slot shape"], ["hb-bar", "Bar shape"]],
    hint: "Items still sit in the same place; shapes are fitted inside each slot. The selected-slot frame takes the same shape and turn.", groups: [
    { controls: [R("hotbar.rot", "Rotation (degrees)", -90, 90, 1), R("hotbar.spin", "Spin (turns per loop, minus = other way)", -3, 3, 1), TG("hotbar.alt", "Alternate the turn on every other slot")] }] },
  { id: "hb-sel", tab: "hotbar", title: "Selected slot frame", cls: "", chips: "styles-hbsel", groups: [
    { controls: [C("hotbar.selCol", "Frame colour")] },
    { controls: [R("hotbar.selW", "Frame thickness", 1, 3.7, 0.05), R("hotbar.selGlow", "Glow", 0, 1.5, 0.01), R("hotbar.pulse", "Pulse", 0, 1, 0.01), R("hotbar.orbit", "Orbiting stars", 1, 4, 1)] }] },
  { id: "hb-look", tab: "hotbar", title: "Hotbar look", cls: "", groups: [
    { controls: [R("hotbar.slotA", "Slot opacity", 0, 1, 0.01), R("hotbar.railA", "Frame opacity", 0, 1, 0.01), R("hotbar.window", "Slot size", -0.5, 1.4, 0.01),
      R("hotbar.round", "Rounded slots", 0, 0.5, 0.01), R("hotbar.frameW", "Outline thickness", 0, 1.2, 0.01), R("hotbar.glow", "Glow", 0, 1.5, 0.01),
      R("hotbar.shine", "Shine and travelling lights", 0, 1.5, 0.01), R("hotbar.stars", "Stars", 0, 3, 0.05), R("hotbar.texScale", "Galaxy size", 0.3, 3, 0.01)] }] },
  { id: "hb-anim", tab: "hotbar", title: "Hotbar animation", cls: "", groups: [
    { controls: [SEL("hotbar.speed", "Frame rate (FPS)", FPS_OPTIONS), R("hotbar.loopSec", "Loop length in seconds (longer = slower motion)", 1, 12, 0.1),
      SEL("hotbar.animFps", "Smoothing", [["ticks", "Off (lightest)"], ["smooth", "Blend frames (smooth, costs FPS)"]]),
      SEL("hotbar.motion", "Motion", [["random", "Random: wanders, changes speed, shooting stars"], ["loop", "Steady: drifts one way at one speed"]]),
      R("hotbar.shoot", "Shooting stars per loop (random)", 0, 5, 1), { type: "info", path: "hotbar.fpsInfo", kind: "hotbar" }] }] },
  { id: "hb-colors", tab: "hotbar", title: "Hotbar colours", cls: "", groups: [
    { label: "Galaxy", controls: [C("hotbar.c1", "Dark"), C("hotbar.c2", "Main"), C("hotbar.c3", "Highlight")] },
    { label: "Details", controls: [C("hotbar.accent", "Accent (lines, neon, rift)"), C("hotbar.slotCol", "Slots"), C("hotbar.outlineCol", "Outline"), C("hotbar.goldCol", "Gold (celestial)")] }] },
  { id: "hb-buttons", tab: "hotbar", title: "Menu buttons", cls: "", chips: "buttons-hb",
    hint: "The buttons on the title screen, pause menu and settings. The game writes the text on top (yellow when you hover).", groups: [] },
  { id: "bubbles", tab: "other", title: "Air bubbles", chips: [["styles-bubble", "Pick a bubble style"]],
    hint: "Each style has a matching popping bubble for the last bit of air.", groups: [
    { controls: [C("bubble.col", "Colour"), C("bubble.accent", "Accent (planet ring, soap tint)")] },
    { controls: [R("bubble.size", "Size", 0.6, 1.25, 0.01), R("bubble.rim", "Rim thickness", 0.3, 2.5, 0.01),
      R("bubble.shine", "Shine", 0, 1.5, 0.01), R("bubble.alpha", "Opacity", 0.2, 1, 0.01)] },
  ] },
  { id: "other", tab: "other", title: "Crosshair", groups: [
    { controls: [C("cross.col", "Crosshair")] },
    { controls: [R("cross.len", "Crosshair size", 1.5, 7.5, 0.1), R("cross.thick", "Crosshair thickness", 0.4, 2.5, 0.05)] },
  ] },
];
const TABS = [["themes", "Styles"], ["steak", "Steak"], ["heart", "Hearts"], ["armor", "Armor"], ["xp", "XP bar"], ["hotbar", "Hotbar"], ["other", "Other HUD"]];
const $ = id => document.getElementById(id);

/* ---------- outline editors (steak, hearts, armor) ---------- */
const ED = 720, EDS = 40;          // canvas px, render scale (base px -> 360 px, drawn at 2x)
const EDIT = {
  steak: { label: "Steak", el: () => st.shape, world: (x, y) => { const r = rotPt(st.shape, x, y); return toWorld(st.shape, r[0], r[1]); },
    design: (x, y) => { const d = toDesign(st.shape, x, y); return rotPt(st.shape, d[0], d[1], true); },
    sample: n => shapeToPoints(st.shape, n), render: S => steakIcon(S, st, "full") },
  heart: { label: "Heart", el: () => st.heart, world: (x, y) => elWorld("heart", st.heart, x, y), design: (x, y) => elDesign("heart", st.heart, x, y),
    sample: n => elSamplePoints("heart", st.heart, n), render: S => HRT(S, 0.1) },
  armor: { label: "Armor", el: () => st.armor, world: (x, y) => elWorld("armor", st.armor, x, y), design: (x, y) => elDesign("armor", st.armor, x, y),
    sample: n => elSamplePoints("armor", st.armor, n), render: S => ARM(S, "full") },
};
const edState = {};
function makeEditor(key) {
  const box = document.createElement("div"); box.className = "editor";
  box.innerHTML = `<canvas id="shapeEd-${key}" class="shape-ed" width="${ED}" height="${ED}" aria-label="${EDIT[key].label} outline editor"></canvas>
    <div class="editor-side">
      <div class="seg" role="group" aria-label="Shape mode"><button type="button" id="m-sliders-${key}">Slider shape</button><button type="button" id="m-custom-${key}">Draw my own</button></div>
      <p class="hint" id="ed-hint-${key}"></p>
      <div class="export-row"><button type="button" class="btn" id="ed-restart-${key}">Restart from slider shape</button>
      <button type="button" class="btn" id="ed-more-${key}">More dots</button><button type="button" class="btn" id="ed-fewer-${key}">Fewer dots</button>
      ${key === "steak" ? `<button type="button" class="btn" id="ed-bean">Use the cleaned-up bean shape</button>` : ""}
      ${key === "heart" ? `<button type="button" class="btn" id="ed-gemheart" hidden>Use the gem-cut heart shape</button><button type="button" class="btn" id="ed-puffy" hidden>Use the puffy heart shape</button><button type="button" class="btn" id="ed-classic" hidden>Use the classic heart shape</button>` : ""}</div>
    </div>`;
  edState[key] = { drag: -1, fast: false };
  return box;
}
const edPoints = key => EDIT[key].el().points.map(([x, y]) => EDIT[key].world(x, y));
function drawEditor(key) {
  const cv = $("shapeEd-" + key); if (!cv) return;
  const E = EDIT[key], el = E.el(), g = cv.getContext("2d"), S = edState[key].fast ? 20 : EDS;
  g.clearRect(0, 0, ED, ED); g.fillStyle = "#2a2342"; g.fillRect(0, 0, ED, ED);
  g.strokeStyle = "rgba(255,255,255,0.06)"; g.lineWidth = 1;
  for (let i = 1; i < 9; i++) { const p = i * ED / 9; g.beginPath(); g.moveTo(p, 0); g.lineTo(p, ED); g.moveTo(0, p); g.lineTo(ED, p); g.stroke(); }
  g.imageSmoothingEnabled = true; g.drawImage(toCanvas(E.render(S)), 0, 0, ED, ED);
  g.setLineDash([10, 8]); g.strokeStyle = "rgba(255,255,255,0.35)"; g.lineWidth = 2; g.strokeRect(1, 1, ED - 2, ED - 2); g.setLineDash([]);
  if (el.custom) {
    const k = ED / 9, pts = edPoints(key);
    g.strokeStyle = "rgba(196,140,255,0.7)"; g.lineWidth = 2; g.beginPath();
    pts.forEach(([x, y], i) => i ? g.lineTo(x * k, y * k) : g.moveTo(x * k, y * k)); g.closePath(); g.stroke();
    pts.forEach(([x, y], i) => { g.beginPath(); g.arc(x * k, y * k, i === edState[key].drag ? 13 : 10, 0, TAU); g.fillStyle = "#c48cff"; g.fill(); g.lineWidth = 3; g.strokeStyle = "#1a0f2e"; g.stroke(); });
  }
}
function syncEditor(key) {
  if (!$("shapeEd-" + key)) return;
  const el = EDIT[key].el();
  $("m-sliders-" + key).setAttribute("aria-pressed", String(!el.custom));
  $("m-custom-" + key).setAttribute("aria-pressed", String(!!el.custom));
  $("ed-more-" + key).disabled = $("ed-fewer-" + key).disabled = !el.custom;
  $("ed-hint-" + key).textContent = el.custom
    ? "Drag a dot to move it. Double-click the outline to add a dot, double-click a dot to remove it. Position, size, border and lighting still apply."
    : "The shape follows the sliders below. Switch to Draw my own to drag its outline freely.";
  drawEditor(key);
}
function wireEditor(key) {
  const cv = $("shapeEd-" + key), E = EDIT[key], S_ = edState[key];
  const toBase = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * 9, (e.clientY - r.top) / r.height * 9]; };
  const hit = ([x, y]) => edPoints(key).findIndex(([px, py]) => Math.hypot(px - x, py - y) < 0.4);
  const startCustom = n => { const el = E.el(); el.points = E.sample(n); el.custom = true; };
  let raf = 0;
  cv.addEventListener("pointerdown", e => {
    if (!E.el().custom) return;
    const i = hit(toBase(e)); if (i < 0) return;
    S_.drag = i; S_.fast = true; cv.setPointerCapture(e.pointerId); e.preventDefault(); drawEditor(key);
  });
  cv.addEventListener("pointermove", e => {
    if (S_.drag < 0) return;
    const [x, y] = toBase(e), d = E.design(Math.max(0, Math.min(9, x)), Math.max(0, Math.min(9, y)));
    E.el().points[S_.drag] = [+d[0].toFixed(3), +d[1].toFixed(3)];
    if (!raf) raf = requestAnimationFrame(() => { raf = 0; drawEditor(key); });
  });
  const end = () => { if (S_.drag < 0) return; S_.drag = -1; S_.fast = false; changed(); };
  cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", end);
  cv.addEventListener("dblclick", e => {
    const el = E.el(); if (!el.custom) return;
    const b = toBase(e), i = hit(b), P = el.points;
    if (i >= 0) { if (P.length > 3) P.splice(i, 1); }
    else {
      const Wp = edPoints(key); let best = 0, bd = Infinity;
      for (let k = 0; k < Wp.length; k++) {
        const a = Wp[k], c = Wp[(k + 1) % Wp.length], ex = c[0] - a[0], ey = c[1] - a[1];
        const t = sat(((b[0] - a[0]) * ex + (b[1] - a[1]) * ey) / (ex * ex + ey * ey || 1));
        const dd = Math.hypot(a[0] + ex * t - b[0], a[1] + ey * t - b[1]); if (dd < bd) { bd = dd; best = k; }
      }
      const d = E.design(b[0], b[1]); P.splice(best + 1, 0, [+d[0].toFixed(3), +d[1].toFixed(3)]);
    }
    changed();
  });
  $("m-sliders-" + key).addEventListener("click", () => { E.el().custom = false; changed(); });
  $("m-custom-" + key).addEventListener("click", () => { const el = E.el(); if (!el.points || el.points.length < 3) startCustom(14); el.custom = true; changed(); });
  $("ed-restart-" + key).addEventListener("click", () => { startCustom(Math.max(12, E.el().points.length || 14)); changed(); });
  $("ed-more-" + key).addEventListener("click", () => {      // add a dot halfway along every side
    const el = E.el(), P = el.points; if (P.length >= 48) return;
    el.points = P.flatMap((p, i) => { const q = P[(i + 1) % P.length]; return [p, [+((p[0] + q[0]) / 2).toFixed(3), +((p[1] + q[1]) / 2).toFixed(3)]]; });
    changed();
  });
  const useShape = shapeConst => {
    const h = st.heart;
    if (h.illus === "gemheart") {                     // the framed gem heart has a fixed outline: carry its frame and fill over
      h.illus = ""; if (h.gemFill === "texture") h.texture = h.texture || "galaxy";
      Object.assign(h, { frame: 0.95, outline: 0.2, outlineStyle: "ink", border: h.frameMat + "Frame", glow: 0 });
    }
    Object.assign(h, shapeConst, { custom: false, facets: 0, posX: 0, tilt: 0 });
    syncInputs(); changed();
  };
  if (key === "heart") $("ed-classic").addEventListener("click", () => useShape(CLASSIC_SHAPE));
  if (key === "heart") $("ed-puffy").addEventListener("click", () => {
    const h = st.heart;
    if (h.illus === "gemheart") {                     // the framed gem heart has a fixed outline: carry its frame and fill over
      h.illus = ""; if (h.gemFill === "texture") h.texture = h.texture || "galaxy";
      Object.assign(h, { frame: 0.95, outline: 0.2, outlineStyle: "ink", border: h.frameMat + "Frame", glow: 0 });
    }
    Object.assign(h, PUFFY_SHAPE, { custom: false, facets: 0, posX: 0, tilt: 0 });
    syncInputs(); changed();
  });
  if (key === "heart") $("ed-gemheart").addEventListener("click", () => {
    Object.assign(st.heart, { custom: true, points: clone(GEM_HEART), smooth: 0.08, posX: 0, posY: 0, size: 1, facets: 0 });
    syncInputs(); changed();
  });
  if (key === "steak") $("ed-bean").addEventListener("click", () => {
    Object.assign(st.shape, { custom: true, points: clone(BEAN_POINTS), smooth: 1, rotate: 0.12, posX: 0, posY: 0, size: 1, facets: 0 });
    syncInputs(); changed();
  });
  $("ed-fewer-" + key).addEventListener("click", () => {     // keep every other dot (never fewer than 3)
    const el = E.el(), P = el.points; if (P.length <= 3) return;
    const half = P.filter((_, i) => i % 2 === 0); el.points = half.length >= 3 ? half : P.slice(0, P.length - 1);
    changed();
  });
}

const idOf = path => "f-" + path.replace(/\./g, "-");
const fmt = (ctl, v) => ctl.type === "speed" ? SPEED[5 - v] : ctl.type === "deg" ? Math.round(-v * 180 / Math.PI) + "°"
  : ctl.type === "angle" ? Math.round(v) + "°" : ctl.path === "shape.burnCount" ? (+v === 0 ? "design" : String(v))
  : INT_PATHS.test(ctl.path) ? (+v === 0 ? "off" : String(v)) : (+v).toFixed(2);
function linkShades() {
  const m = unhex(st.steakCol.meat);
  st.steakCol.dark = hex(scale3(m, 0.59)); st.steakCol.rim = hex(scale3(m, 1.48)); st.steakCol.side = hex(scale3(m, 0.57));
}

/* tabs */
const controlsEl = $("controls"), exportCard = $("export-card");
const tabBar = document.createElement("div"); tabBar.className = "tabs"; tabBar.setAttribute("role", "tablist"); tabBar.setAttribute("aria-label", "HUD parts");
for (const [key, label] of TABS) {
  const b = document.createElement("button"); b.type = "button"; b.setAttribute("role", "tab"); b.id = "tab-" + key; b.textContent = label;
  b.addEventListener("click", () => { st.tab = key; save(); showTab(); });
  tabBar.appendChild(b);
}
controlsEl.appendChild(tabBar);

const allControls = [];
for (const sec of SECTIONS) {
  const card = document.createElement("section"); card.className = "card" + (sec.cls ? " " + sec.cls : ""); card.dataset.tab = sec.tab;
  card.setAttribute("aria-labelledby", "h-" + sec.id);
  const h = document.createElement("h2"); h.id = "h-" + sec.id;
  const dot = document.createElement("span"); dot.className = "dot" + (sec.cls ? " " + sec.cls : ""); h.append(dot, sec.title); card.appendChild(h);
  if (sec.hint) { const p = document.createElement("p"); p.className = "hint"; p.textContent = sec.hint; card.appendChild(p); }
  if (sec.editor) card.appendChild(makeEditor(sec.editor));
  if (sec.vary) {
    const row = document.createElement("div"); row.className = "export-row";
    row.innerHTML = `<button type="button" class="btn" id="vary-make">Make shape variations of my steak</button>
      <button type="button" class="btn" id="vary-back" disabled>Go back to my steak</button>`;
    const grid = document.createElement("div"); grid.className = "designs vary-grid"; grid.id = "vary-grid";
    grid.setAttribute("role", "group"); grid.setAttribute("aria-label", "Steak variations");
    card.append(row, grid);
  }
  if (sec.chips) {
    const sets = Array.isArray(sec.chips) ? sec.chips : [[sec.chips, null]];
    for (const [set, label] of sets) {
      if (label) { const l = document.createElement("p"); l.className = "group-label"; l.textContent = label; card.appendChild(l); }
      const d = document.createElement("div"); d.className = "designs"; d.id = "chips-" + set; d.setAttribute("role", "group"); d.setAttribute("aria-label", label ? sec.title + ": " + label : sec.title); card.appendChild(d);
    }
  }
  for (const g of sec.groups) {
    if (g.label) { const l = document.createElement("p"); l.className = "group-label"; l.textContent = g.label; card.appendChild(l); }
    const colorsBox = document.createElement("div"); colorsBox.className = "colors";
    const slidersBox = document.createElement("div"); slidersBox.className = "sliders";
    for (const ctl of g.controls) {
      const id = idOf(ctl.path);
      if (ctl.type === "color") {
        const lab = document.createElement("label"); lab.className = "swatch"; lab.htmlFor = id; lab.textContent = ctl.label;
        const inp = document.createElement("input"); inp.type = "color"; inp.id = id; lab.appendChild(inp); colorsBox.appendChild(lab);
        inp.addEventListener("input", () => {
          setP(ctl.path, inp.value);
          if (ctl.path === "steakCol.meat" && st.steakCol.linked) { linkShades(); syncInputs(); }
          else if (["steakCol.dark", "steakCol.rim", "steakCol.side"].includes(ctl.path)) { st.steakCol.linked = false; syncInputs(); }
          changed();
        });
      } else if (ctl.type === "select") {
        const f = document.createElement("div"); f.className = "field";
        const lab = document.createElement("label"); lab.htmlFor = id; lab.textContent = ctl.label;
        const sel = document.createElement("select"); sel.id = id;
        for (const [v, l] of ctl.options) { const o = document.createElement("option"); o.value = v; o.textContent = l; sel.appendChild(o); }
        f.append(lab, sel); slidersBox.appendChild(f);
        sel.addEventListener("change", () => { setP(ctl.path, NUM_SELECT.test(ctl.path) ? +sel.value : sel.value); changed(); });
      } else if (ctl.type === "info") {
        const pEl = document.createElement("p"); pEl.className = "hint fps-info"; pEl.id = id; pEl.dataset.kind = ctl.kind; pEl.dataset.el = ctl.path.split(".")[0];
        slidersBox.appendChild(pEl);
      } else if (ctl.type === "toggle") {
        const f = document.createElement("label"); f.className = "toggle"; f.htmlFor = id;
        const inp = document.createElement("input"); inp.type = "checkbox"; inp.id = id; f.append(inp, ctl.label); slidersBox.appendChild(f);
        inp.addEventListener("change", () => {
          setP(ctl.path, inp.checked);
          if (ctl.path === "steakCol.linked" && inp.checked) { linkShades(); syncInputs(); }
          changed();
        });
      } else {
        const f = document.createElement("div"); f.className = "field";
        const lab = document.createElement("label"); lab.htmlFor = id; lab.textContent = ctl.label;
        const out = document.createElement("output"); out.id = id + "-o"; lab.appendChild(out);
        const inp = document.createElement("input"); inp.type = "range"; inp.id = id;
        if (ctl.type === "speed") { inp.min = 1; inp.max = 4; inp.step = 1; } else { inp.min = ctl.min; inp.max = ctl.max; inp.step = ctl.step; }
        f.append(lab, inp); slidersBox.appendChild(f);
        inp.addEventListener("input", () => {
          const v = +inp.value; setP(ctl.path, ctl.type === "speed" ? 5 - v : v); out.textContent = fmt(ctl, ctl.type === "speed" ? 5 - v : v);
          changed();
        });
      }
      allControls.push(ctl);
    }
    if (colorsBox.children.length) card.appendChild(colorsBox);
    if (slidersBox.children.length) card.appendChild(slidersBox);
  }
  controlsEl.appendChild(card);
}

/* themes card */
let themeUndo = null;
{
  const card = document.createElement("section"); card.className = "card"; card.dataset.tab = "themes"; card.setAttribute("aria-labelledby", "h-themes");
  card.innerHTML = `<h2 id="h-themes"><span class="dot"></span>HUD styles</h2>
    <p class="hint">New designs for the hearts, armor and XP bar, all filled with your galaxy. Your steak is never changed, and your colours and animation settings are kept. Click one to apply it; pick "Your current look" to go back.</p>
    <div class="export-row"><button type="button" class="btn" id="theme-undo" disabled>Undo theme</button></div>
    <div class="theme-grid" id="theme-grid"></div>`;
  controlsEl.appendChild(card);
  for (const th of THEMES) {
    const b = document.createElement("button"); b.type = "button"; b.className = "theme"; b.dataset.id = th.id;
    const c = document.createElement("canvas"); c.width = 560; c.height = 156; c.className = "fit";
    const n = document.createElement("strong"); n.textContent = th.name;
    const d = document.createElement("span"); d.textContent = th.desc;
    b.append(c, n, d);
    b.addEventListener("click", () => {
      themeUndo = clone(st); st = Object.assign(themeState(th), { tab: st.tab });
      $("theme-undo").disabled = false; syncInputs(); changed();
      for (const x of $("theme-grid").children) x.setAttribute("aria-pressed", String(x === b));
      setStatus(`Applied "${th.name}". Build the pack to use it.`, "ok");
    });
    $("theme-grid").appendChild(b);
  }
  $("theme-undo").addEventListener("click", () => { if (!themeUndo) return; st = themeUndo; themeUndo = null; $("theme-undo").disabled = true; syncInputs(); changed(); setStatus("Theme undone."); });
}
let themesDrawn = false;
function drawThemes() {
  if (themesDrawn) return; themesDrawn = true;
  const btns = [...$("theme-grid").children];
  btns.forEach((b, i) => setTimeout(() => drawMiniHud(b.querySelector("canvas"), themeState(THEMES[i]), 3), 30 * i));
}

/* chips: designs, textures and borders, each drawn with the current settings */
const cap = n => n.charAt(0).toUpperCase() + n.slice(1);
const elThumb = (kind, el) => kind === "bar" ? elementIcon("bar", 3, el, el, 0.2, "fill") : elementIcon(kind, 12, el, el, 0.15, "full");
const chipSets = {
  designs: { tab: "steak", names: Object.keys(DESIGNS), label: texLabel, render: n => steakIcon(12, st, "full", false, false, designShape(n)),
    pick: n => {
      st.design = n; st.shape = designShape(n);
      if (DESIGNS[n].meatCol) { st.steakCol.meat = DESIGNS[n].meatCol; if (st.steakCol.linked) linkShades(); }
    }, sel: () => st.design },
  texturesReal: { tab: "steak", names: REAL_TEXTURES, label: texLabel, render: n => steakIcon(12, st, "full", false, false, Object.assign(clone(st.shape), { texture: n })),
    pick: n => { st.shape.texture = n; }, sel: () => st.shape.texture },
  textures: { tab: "steak", names: TEXTURES, label: n => n, render: n => steakIcon(12, st, "full", false, false, Object.assign(clone(st.shape), { texture: n })),
    pick: n => { st.shape.texture = n; }, sel: () => st.shape.texture },
  borders: { tab: "steak", names: Object.keys(BORDERS), label: n => BORDER_NAMES[n], render: n => steakIcon(12, st, "full", false, false, Object.assign(clone(st.shape), borderPreset(n))),
    pick: n => { Object.assign(st.shape, borderPreset(n)); }, sel: () => st.shape.border },
};
for (const [key, kind] of [["heart", "heart"], ["armor", "armor"], ["xp", "bar"]]) {
  chipSets["designs-" + key] = { tab: key, kind, names: Object.keys(EL_DESIGNS[kind]), label: n => cap(n.replace("-", " in ")), render: n => elThumb(kind, applyElDesign(kind, {}, n)),
    pick: n => applyElDesign(kind, st[key], n), sel: () => st[key].design };
  chipSets["textures-" + key] = { tab: key, kind, names: EL_TEXTURES, label: n => EL_TEX_LABEL[n], render: n => elThumb(kind, Object.assign(clone(st[key]), { texture: n })),
    pick: n => { st[key].texture = n; if (st[key].illus === "gemheart") st[key].gemFill = "texture"; }, sel: () => st[key].texture };
  chipSets["borders-" + key] = { tab: key, kind, names: Object.keys(EL_BORDERS).filter(b => kind !== "bar" || !EL_OUTSIDE_BORDERS.includes(b)),
    label: n => EL_BORDERS[n].label, render: n => elThumb(kind, Object.assign(clone(st[key]), elBorderPreset(n))),
    pick: n => {
      // with the framed gem heart, a frame border just swaps the frame material; other borders switch back to the built heart
      if (st[key].illus === "gemheart" && EL_BORDERS[n].frameMat) Object.assign(st[key], { frameMat: EL_BORDERS[n].frameMat, border: n });
      else Object.assign(st[key], elBorderPreset(n), { illus: "" });
    }, sel: () => st[key].border };
}
chipSets["shapes-heart"] = { tab: "heart", kind: "heart", names: Object.keys(HEART_SHAPES), label: n => HEART_SHAPES[n].label,
  render: n => elThumb("heart", Object.assign(clone(st.heart), { illus: "" }, clone(HEART_SHAPES[n].set), { posX: 0, tilt: 0, facets: 0 })),
  pick: n => {
    const h = st.heart;
    if (h.illus === "gemheart") {                     // keep the framed look: carry the frame and galaxy fill over to the built heart
      h.illus = ""; if (h.gemFill === "texture") h.texture = h.texture || "galaxy";
      Object.assign(h, { frame: 0.95, outline: 0.2, outlineStyle: "ink", border: h.frameMat + "Frame", glow: 0 });
    }
    Object.assign(h, clone(HEART_SHAPES[n].set), { posX: 0, tilt: 0, facets: 0, heartShape: n });
  },
  sel: () => st.heart.illus === "gemheart" ? "gemcut" : st.heart.heartShape || "" };
chipSets["styles-bubble"] = { tab: "other", kind: "bubble", names: Object.keys(BUBBLE_STYLES), label: n => BUBBLE_STYLES[n],
  render: n => bubbleIcon(12, false, st.bubble.col, Object.assign({}, st.bubble, { style: n })),
  pick: n => { st.bubble.style = n; }, sel: () => st.bubble.style };
chipSets["styles-xp"] = { tab: "xp", kind: "bar", names: XP_STYLE_NAMES, label: n => n ? UI_LABELS[n] : "Built from the cards",
  render: n => elementIcon("bar", 3, Object.assign(clone(st.xp), { uiStyle: n }), st.xp, 0.2, "fill"),
  pick: n => { st.xp.uiStyle = n; }, sel: () => st.xp.uiStyle || "" };
chipSets["rift-xp"] = { tab: "xp", kind: "bar", names: Object.keys(RIFT_VARIANTS), label: n => RIFT_VARIANTS[n].label,
  render: n => elementIcon("bar", 3, Object.assign(clone(st.xp), { uiStyle: "rift", rift: riftParams(n) }), st.xp, 0.2, "fill"),
  pick: n => { st.xp.uiStyle = "rift"; st.xp.rift = riftParams(n); }, sel: () => st.xp.uiStyle === "rift" ? (st.xp.rift || {}).variant || "classic" : "" };
function hbThumb(hb) {                     // first slots of the hotbar with the selection frame on slot 1
  const c = document.createElement("canvas"); c.width = 112; c.height = 112; const g = c.getContext("2d");
  g.fillStyle = "#4f6b35"; g.fillRect(0, 0, 112, 112);
  g.drawImage(toCanvas(hotbarIcon(3, hb, 0.2)), -37, 23); g.drawImage(toCanvas(hotbarSelIcon(3, hb, 0.2)), 20, 20);
  return c;
}
chipSets["styles-hotbar"] = { tab: "hotbar", raw: true, names: Object.keys(HOTBAR_STYLES), label: n => HOTBAR_STYLES[n],
  render: n => hbThumb(Object.assign(clone(st.hotbar), { style: n, selStyle: "auto" })), pick: n => { st.hotbar.style = n; st.hotbar.enabled = true; }, sel: () => st.hotbar.style };
chipSets["styles-hbsel"] = { tab: "hotbar", raw: true, names: Object.keys(HB_SEL_STYLES), label: n => HB_SEL_STYLES[n],
  render: n => hbThumb(Object.assign(clone(st.hotbar), { selStyle: n })), pick: n => { st.hotbar.selStyle = n; }, sel: () => st.hotbar.selStyle };
chipSets["buttons-hb"] = { tab: "hotbar", raw: true, names: Object.keys(HB_BUTTONS), label: n => HB_BUTTONS[n],
  render: n => { const hb = Object.assign(clone(st.hotbar), { buttons: n }), c = document.createElement("canvas"); c.width = 112; c.height = 112; const g = c.getContext("2d");
    ["normal", "hover", "disabled"].forEach((s2, k) => g.drawImage(toCanvas(hbButtonIcon(1, hb, s2, 104, 20)), 0, 0, 104, 20, 4, 14 + k * 30, 104, 20)); return c; },
  pick: n => { st.hotbar.buttons = n; }, sel: () => st.hotbar.buttons };
function hbThumbWhole(hb) {                // the whole bar, to show its outline
  const c = document.createElement("canvas"); c.width = 112; c.height = 112; const g = c.getContext("2d");
  g.fillStyle = "#4f6b35"; g.fillRect(0, 0, 112, 112);
  g.drawImage(toCanvas(hotbarIcon(2, hb, 0.2)), 0, 0, 364, 44, 1, 26, 110, 13.3);
  g.drawImage(toCanvas(hotbarIcon(3, hb, 0.2)), 0, 0, 111, 66, 1, 62, 111, 66 * 111 / 111 * 0.6);
  return c;
}
const GAL_STYLES = ["galaxy", "nebula", "celestial"];
chipSets["hb-gal"] = { tab: "hotbar", raw: true, names: Object.keys(HB_GAL_VARIANTS), label: n => HB_GAL_VARIANTS[n].label,
  render: n => { const v = HB_GAL_VARIANTS[n], hb = Object.assign(clone(st.hotbar), { c1: v.c[0], c2: v.c[1], c3: v.c[2], accent: v.c[3], gal: galParams(n), selStyle: "auto" }, v.o);
    if (!GAL_STYLES.includes(hb.style)) hb.style = "galaxy"; return hbThumb(hb); },
  pick: n => { const v = HB_GAL_VARIANTS[n], hb = st.hotbar; Object.assign(hb, { c1: v.c[0], c2: v.c[1], c3: v.c[2], accent: v.c[3], gal: galParams(n) }, v.o);
    if (!GAL_STYLES.includes(hb.style)) hb.style = "galaxy"; hb.enabled = true; },
  sel: () => GAL_STYLES.includes(st.hotbar.style) ? (st.hotbar.gal || {}).variant || "deep" : "" };
chipSets["hb-rb"] = { tab: "hotbar", raw: true, names: Object.keys(HB_RB_VARIANTS), label: n => HB_RB_VARIANTS[n].label,
  render: n => hbThumb(Object.assign(clone(st.hotbar), { style: "rainbow", rb: rbParams(n), selStyle: "auto" })),
  pick: n => { st.hotbar.style = "rainbow"; st.hotbar.rb = rbParams(n); st.hotbar.enabled = true; },
  sel: () => st.hotbar.style === "rainbow" ? (st.hotbar.rb || {}).variant || "flow" : "" };
chipSets["hb-shape"] = { tab: "hotbar", raw: true, names: Object.keys(HB_SHAPES), label: n => HB_SHAPES[n].label,
  render: n => hbThumb(Object.assign(clone(st.hotbar), { slotShape: n })), pick: n => { st.hotbar.slotShape = n; }, sel: () => st.hotbar.slotShape };
chipSets["hb-bar"] = { tab: "hotbar", raw: true, names: Object.keys(HB_BAR_SHAPES), label: n => HB_BAR_SHAPES[n],
  render: n => hbThumbWhole(Object.assign(clone(st.hotbar), { barShape: n })), pick: n => { st.hotbar.barShape = n; }, sel: () => st.hotbar.barShape };
const thumbs = [];
for (const [set, cfg] of Object.entries(chipSets)) {
  for (const name of cfg.names) {
    const b = document.createElement("button"); b.type = "button"; b.className = "design"; b.dataset.name = name;
    const c = document.createElement("canvas"); c.width = 112; c.height = 112; b.appendChild(c);
    const s = document.createElement("span"); s.textContent = cfg.label(name); b.appendChild(s);
    b.addEventListener("click", () => { cfg.pick(name); syncInputs(); changed(); });
    $("chips-" + set).appendChild(b); thumbs.push({ c, tab: cfg.tab, bar: cfg.kind === "bar", raw: !!cfg.raw, draw: () => cfg.render(name) });
  }
}
function drawThumbs() {
  for (const th of thumbs) {
    if (th.tab !== st.tab) continue;
    const g = th.c.getContext("2d"); g.clearRect(0, 0, 112, 112);
    if (th.raw) { g.drawImage(th.draw(), 0, 0); continue; }
    const img = toCanvas(th.draw());
    if (th.bar) g.drawImage(img, 0, 0, 111, 15, 0, 48, 112, 15);
    else g.drawImage(img, 2, 2);
  }
}
/* ---------- small variations of the current steak ---------- */
/* Shape-only variations: each nudges the current outline a little. Works on the drawn outline;
   a slider shape is first turned into dots so it can be reshaped the same way. */
function outlineFrame(P) {
  const n = P.length, c = P.reduce((s, p) => [s[0] + p[0] / n, s[1] + p[1] / n], [0, 0]);
  let sxx = 0, syy = 0, sxy = 0;
  for (const [x, y] of P) { const dx = x - c[0], dy = y - c[1]; sxx += dx * dx; syy += dy * dy; sxy += dx * dy; }
  const th = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  let ax = [Math.cos(th), Math.sin(th)]; if (ax[0] < 0) ax = [-ax[0], -ax[1]];      // long axis, pointing right
  const nv = [-ax[1], ax[0]];                                                       // across: + is the bottom side
  const toL = ([x, y]) => [(x - c[0]) * ax[0] + (y - c[1]) * ax[1], (x - c[0]) * nv[0] + (y - c[1]) * nv[1]];
  const toW = ([u, v]) => [c[0] + u * ax[0] + v * nv[0], c[1] + u * ax[1] + v * nv[1]];
  return { toL, toW };
}
function reshape(sh, fn) {
  if (!sh.custom || !sh.points || sh.points.length < 3) { sh.points = shapeToPoints(sh, 16); sh.custom = true; }
  const F = outlineFrame(sh.points), L = sh.points.map(F.toL);
  const maxU = Math.max(...L.map(p => Math.abs(p[0]))), top = L.filter(p => p[1] < 0 && Math.abs(p[0]) < maxU * 0.65);
  const dip = top.length ? top.reduce((m, p) => p[1] > m[1] ? p : m) : [0, -1];   // the inward-most point on the top edge
  let out = fn(L, { maxU, dipU: dip[0], w: maxU * 0.42 }).map(F.toW);
  const xs = out.map(p => p[0]), ys = out.map(p => p[1]);                          // keep it inside the icon slot
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const k = Math.min(1, 8.6 / (x1 - x0), 8.6 / (y1 - y0)), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const sx = cx + Math.max(0, 0.2 - (cx - (cx - x0) * k)) - Math.max(0, cx + (x1 - cx) * k - 8.8);
  const sy = cy + Math.max(0, 0.2 - (cy - (cy - y0) * k)) - Math.max(0, cy + (y1 - cy) * k - 8.8);
  sh.points = out.map(([x, y]) => [+(sx + (x - cx) * k).toFixed(3), +(sy + (y - cy) * k).toFixed(3)]);
}
const gauss = (x, w) => Math.exp(-((x / w) ** 2));
const VARIATIONS = [
  ["Deeper dip", sh => reshape(sh, (L, o) => L.map(([u, v]) => [u, v < 0 ? v + 0.3 * gauss(u - o.dipU, o.w) : v]))],
  ["Shallower dip", sh => reshape(sh, (L, o) => L.map(([u, v]) => [u, v < 0 ? v - 0.25 * gauss(u - o.dipU, o.w) : v]))],
  ["Dip moved left", sh => reshape(sh, (L, o) => L.map(([u, v]) => [v < 0 ? u - 0.4 * gauss(u - o.dipU, o.w) : u, v]))],
  ["Dip moved right", sh => reshape(sh, (L, o) => L.map(([u, v]) => [v < 0 ? u + 0.4 * gauss(u - o.dipU, o.w) : u, v]))],
  ["Bigger right end", sh => reshape(sh, (L, o) => L.map(([u, v]) => [u, v * (1 + 0.13 * sstep(0, o.maxU, u))]))],
  ["Bigger left end", sh => reshape(sh, (L, o) => L.map(([u, v]) => [u, v * (1 + 0.13 * sstep(0, o.maxU, -u))]))],
  ["Slimmer", sh => reshape(sh, L => L.map(([u, v]) => [u, v * 0.91]))],
  ["Chubbier", sh => reshape(sh, L => L.map(([u, v]) => [u, v * 1.09]))],
  ["Longer", sh => reshape(sh, L => L.map(([u, v]) => [u * 1.07, v]))],
  ["Shorter", sh => reshape(sh, L => L.map(([u, v]) => [u * 0.93, v]))],
  ["Leans a bit more", sh => { reshape(sh, L => L); sh.rotate = (sh.rotate || 0) + 0.08; }],
  ["Leans a bit less", sh => { reshape(sh, L => L); sh.rotate = (sh.rotate || 0) - 0.08; }],
  ["More curved", sh => reshape(sh, (L, o) => L.map(([u, v]) => [u, v - 0.4 * ((u / o.maxU) ** 2 - 0.35)]))],
  ["Straighter", sh => reshape(sh, (L, o) => L.map(([u, v]) => [u, v + 0.3 * ((u / o.maxU) ** 2 - 0.35)]))],
  ["Smoother outline", sh => reshape(sh, L => L.map((p, i) => {
    const a = L[(i - 1 + L.length) % L.length], b = L[(i + 1) % L.length];
    return [lerp(p[0], (a[0] + b[0]) / 2, 0.4), lerp(p[1], (a[1] + b[1]) / 2, 0.4)];
  }))],
];
let varyBase = null, varyPicked = -1;
function makeVariations() {
  varyBase = { shape: clone(st.shape), steakCol: clone(st.steakCol), design: st.design }; varyPicked = -1;
  const grid = $("vary-grid"); grid.textContent = "";
  VARIATIONS.forEach(([label, fn], i) => {
    const sh = clone(varyBase.shape), col = clone(varyBase.steakCol); fn(sh, col);
    const b = document.createElement("button"); b.type = "button"; b.className = "design"; b.setAttribute("aria-pressed", "false");
    const c = document.createElement("canvas"); c.width = 148; c.height = 148;
    const s = document.createElement("span"); s.textContent = (i + 1) + ". " + label; b.append(c, s);
    c.getContext("2d").drawImage(toCanvas(steakIcon(16, Object.assign({}, st, { steakCol: col }), "full", false, false, sh)), 2, 2);
    b.addEventListener("click", () => {
      st.shape = clone(sh); st.steakCol = clone(col); varyPicked = i;
      for (const x of grid.children) x.setAttribute("aria-pressed", String(x === b));
      $("vary-back").disabled = false; syncInputs(); changed();
    });
    grid.appendChild(b);
  });
  $("vary-back").disabled = true;
}
function syncInputs() {
  if ($("perf-est")) syncPerf();
  for (const ctl of allControls) {
    const v = getP(ctl.path), inp = $(idOf(ctl.path));
    if (ctl.type === "color") inp.value = v;
    else if (ctl.type === "toggle") inp.checked = !!v;
    else if (ctl.type === "select") inp.value = String(v);
    else if (ctl.type === "info") { const el = st[inp.dataset.el]; inp.textContent = fpsInfoText(el, inp.dataset.kind); }
    else { inp.value = ctl.type === "speed" ? 5 - v : v; $(idOf(ctl.path) + "-o").textContent = fmt(ctl, v); }
  }
  for (const [set, cfg] of Object.entries(chipSets)) for (const b of $("chips-" + set).children) b.setAttribute("aria-pressed", String(b.dataset.name === cfg.sel()));
  for (const r of RESOLUTIONS) $("r" + r).setAttribute("aria-pressed", String(st.res === r));
}
function wireVariations() {
  $("vary-make").addEventListener("click", makeVariations);
  $("vary-back").addEventListener("click", () => {
    if (!varyBase) return;
    st.shape = clone(varyBase.shape); st.steakCol = clone(varyBase.steakCol); st.design = varyBase.design; varyPicked = -1;
    for (const x of $("vary-grid").children) x.setAttribute("aria-pressed", "false");
    $("vary-back").disabled = true; syncInputs(); changed();
  });
}
function showTab() {
  for (const b of tabBar.children) b.setAttribute("aria-selected", String(b.id === "tab-" + st.tab));
  for (const card of controlsEl.querySelectorAll(".card[data-tab]")) card.hidden = card.dataset.tab !== st.tab;
  drawThumbs(); if (EDIT[st.tab]) syncEditor(st.tab);
  if (st.tab === "themes") drawThemes();
  if (st.tab === "steak" && !varyBase) makeVariations();
}

/* =====================================================================
   Preview
   ===================================================================== */
const PS = 8;              // preview pixels per base px (GUI scale 4 on a 2x canvas)
let HEART_FRAMES = 56, XP_FRAMES = 48;
function toCanvas(rgba) { const c = document.createElement("canvas"); c.width = rgba.w; c.height = rgba.h; c.getContext("2d").putImageData(new ImageData(rgba.data, rgba.w, rgba.h), 0, 0); return c; }
let pv = null;
function drawInto(id, rgba) { const cv = $(id), g = cv.getContext("2d"); g.clearRect(0, 0, cv.width, cv.height); g.drawImage(toCanvas(rgba), 0, 0); }
function buildPreview() {
  HEART_ROW = st.pvHardcore ? "hardcore" : "normal";
  try { buildPreviewInner(); } finally { HEART_ROW = "normal"; }
}
function buildPreviewInner() {
  const hearts = [], xp = [];
  HEART_FRAMES = animFrames(st.heart, "heart").n; XP_FRAMES = animFrames(st.xp, "bar").n;
  const hb = st.hotbar, HB = animFrames(hb, "hotbar"), hbN = hbStill(hb) ? 1 : Math.min(HB.n, 72), hbBar = [], hbSel = [];
  for (let f = 0; f < hbN; f++) { hbBar.push(toCanvas(hotbarIcon(PS / 2, hb, f / hbN))); hbSel.push(toCanvas(hotbarSelIcon(PS / 2, hb, f / hbN))); }
  for (let f = 0; f < HEART_FRAMES; f++) hearts.push([toCanvas(HRT(PS, f / HEART_FRAMES, "full")), toCanvas(HRT(PS, f / HEART_FRAMES, "half"))]);
  for (let f = 0; f < XP_FRAMES; f++) xp.push(toCanvas(BAR(PS, f / XP_FRAMES, "fill")));
  pv = { hearts, xp, hbBar, hbSel, hbN, hbOn: hb.enabled, cont: toCanvas(HRT(PS, 0, "container")), xpbg: toCanvas(BAR(PS, 0, "bg")),
    bossbg: toCanvas(BAR(PS, 0, "bg", st.boss, 8, false)), boss: toCanvas(BAR(PS, 0, "fill", st.boss, 8, false)),
    cross: toCanvas(crosshairIcon(PS, st.cross)), bubble: toCanvas(bubbleIcon(PS, false, st.bubble.col)), pop: toCanvas(bubbleIcon(PS, true, st.bubble.col)),
    steak: toCanvas(steakIcon(PS, st, "full")), steakHalf: toCanvas(steakIcon(PS, st, "half")), steakCont: toCanvas(steakIcon(PS, st, "container")),
    armor: ["empty", "half", "full"].map(k => toCanvas(ARM(PS, k))) };
  drawInto("bigHeart", HRT(40, 0.1));
  drawInto("bigSteak", steakIcon(40, st, "full"));
  drawInto("bigArmor", ARM(40, "full"));
  const sc = $("states"), g = sc.getContext("2d"); g.clearRect(0, 0, sc.width, sc.height);
  const items = [HRT(16, 0, "full", false, st.poison, 2), HRT(16, 0, "full", false, st.wither, 3), HRT(16, 0, "full", false, st.gold, 4),
    HRT(16, 0, "full", true), steakIcon(16, st, "full", false, true), bubbleIcon(16, false, st.bubble.col)];
  items.forEach((it, i) => g.drawImage(toCanvas(it), i * 168 + 12, 0));
  g.drawImage(toCanvas(BAR(4, 0, "bg", st.jump, 9, false)), (1008 - 728) / 2, 160);
  g.drawImage(toCanvas(BAR(4, 0, "fill", st.jump, 9, false)), 0, 0, 728 * 0.6, 20, (1008 - 728) / 2, 160, 728 * 0.6, 20);
}
const hud = $("hud"), hctx = hud.getContext("2d");
const ground = (() => {
  const c = document.createElement("canvas"); c.width = 1600; c.height = 760; const g = c.getContext("2d");
  const grad = g.createLinearGradient(0, 0, 0, 760); grad.addColorStop(0, "#6b8c4a"); grad.addColorStop(1, "#43602c");
  g.fillStyle = grad; g.fillRect(0, 0, 1600, 760);
  const r = mulberry32(5); for (let i = 0; i < 4800; i++) { g.fillStyle = r() < 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.07)"; g.fillRect(r() * 1600, r() * 760, 4 + r() * 10, 4 + r() * 10); }
  return c;
})();
const reduceMotion = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
const t0 = performance.now();
let fpsN = 0, fpsT = performance.now();
function drawHud(now) {
  if (pv) {
    const g = 8, tick = (now - t0) / 50;                                   // 20 game ticks per second
    const hp = reduceMotion ? 0 : tick / animFrames(st.heart, "heart").dur, xp = reduceMotion ? 0 : tick / animFrames(st.xp, "bar").dur;
    const hf = Math.floor(hp) % HEART_FRAMES, xf = Math.floor(xp) % XP_FRAMES;
    // OptiFine "interpolate": the next frame fades in between ticks, so motion updates on every screen refresh
    const ha = st.heart.animFps === "smooth" ? hp % 1 : 0, xa = st.xp.animFps === "smooth" ? xp % 1 : 0;
    const hn = (hf + 1) % HEART_FRAMES, xn = (xf + 1) % XP_FRAMES;
    hctx.drawImage(ground, 0, 0);
    const x0 = (1600 - 182 * g) / 2;
    hctx.drawImage(pv.bossbg, x0, 36); hctx.drawImage(pv.boss, 0, 0, Math.round(182 * 0.62 * PS), 5 * PS, x0, 36, Math.round(182 * 0.62 * g), 5 * g);
    hctx.drawImage(pv.cross, 800 - 7.5 * g, 200 - 7.5 * g);
    const xpY = 500, rowY = xpY - 10 * g, topY = rowY - 10 * g;
    for (let i = 0; i < 10; i++) hctx.drawImage(pv.armor[i < 6 ? 2 : i === 6 ? 1 : 0], x0 + i * 8 * g, topY);
    for (let i = 0; i < 10; i++) { const x = x0 + i * 8 * g; hctx.drawImage(pv.cont, x, rowY); if (i < 9) { const h = i < 8 ? 0 : 1; hctx.drawImage(pv.hearts[hf][h], x, rowY);
      if (ha > 0) { hctx.globalAlpha = ha; hctx.drawImage(pv.hearts[hn][h], x, rowY); hctx.globalAlpha = 1; } } }
    for (let i = 0; i < 10; i++) { const x = x0 + 182 * g - 9 * g - i * 8 * g; hctx.drawImage(pv.steakCont, x, rowY); if (i < 8) hctx.drawImage(i < 7 ? pv.steak : pv.steakHalf, x, rowY); }
    for (let i = 0; i < 7; i++) hctx.drawImage(i < 6 ? pv.bubble : pv.pop, x0 + 182 * g - 9 * g - i * 8 * g, topY);
    hctx.drawImage(pv.xpbg, x0, xpY);
    const fw = Math.round(182 * 0.72 * PS); hctx.drawImage(pv.xp[xf], 0, 0, fw, 5 * PS, x0, xpY, fw * g / PS, 5 * g);
    if (xa > 0) { hctx.globalAlpha = xa; hctx.drawImage(pv.xp[xn], 0, 0, fw, 5 * PS, x0, xpY, fw * g / PS, 5 * g); hctx.globalAlpha = 1; }
    // hotbar (7 base px below the XP bar), selection frame on slot 2 holding steak
    const hbY = xpY + 7 * g, HBa = animFrames(st.hotbar, "hotbar"), hbp = reduceMotion ? 0 : tick / HBa.dur;
    const hbf = Math.floor(hbp * pv.hbN / HBa.n) % pv.hbN, hba = st.hotbar.animFps === "smooth" ? fract(hbp * pv.hbN / HBa.n) : 0, hbn = (hbf + 1) % pv.hbN;
    if (pv.hbOn) {
      hctx.drawImage(pv.hbBar[hbf], x0, hbY, 182 * g, 22 * g);
      if (hba > 0) { hctx.globalAlpha = hba; hctx.drawImage(pv.hbBar[hbn], x0, hbY, 182 * g, 22 * g); hctx.globalAlpha = 1; }
    } else { hctx.fillStyle = "rgba(0,0,0,0.45)"; hctx.fillRect(x0, hbY, 182 * g, 22 * g); }
    for (const s2 of [1, 3]) hctx.drawImage(pv.steak, x0 + (3 + 20 * s2) * g, hbY + 3 * g, 16 * g, 16 * g);
    if (pv.hbOn) { hctx.drawImage(pv.hbSel[hbf], x0 + (20 - 1) * g, hbY - g, 24 * g, 24 * g);
      if (hba > 0) { hctx.globalAlpha = hba; hctx.drawImage(pv.hbSel[hbn], x0 + 19 * g, hbY - g, 24 * g, 24 * g); hctx.globalAlpha = 1; } }
    // measured preview frame rate
    fpsN++; if (now - fpsT > 1000) { const fps = Math.round(fpsN * 1000 / (now - fpsT)); fpsN = 0; fpsT = now;
      const smooth = st.heart.animFps === "smooth" || st.xp.animFps === "smooth";
      const hf2 = +animFrames(st.heart, "heart").fps.toFixed(1), xf2 = +animFrames(st.xp, "bar").fps.toFixed(1);
      $("fps").textContent = smooth ? `Preview blending frames at ${fps} fps (your screen's refresh rate).` : `Preview stepping like the game: hearts ${hf2} fps, XP bar ${xf2} fps.`; }
  }
  requestAnimationFrame(drawHud);
}
requestAnimationFrame(drawHud);

let timer = null;
function changed() {
  if ($("perf-est")) syncPerf();
  for (const pEl of document.querySelectorAll(".fps-info")) pEl.textContent = fpsInfoText(st[pEl.dataset.el], pEl.dataset.kind);
  save(); clearTimeout(timer);
  if (EDIT[st.tab]) syncEditor(st.tab);
  timer = setTimeout(() => { buildPreview(); drawThumbs(); }, 150);
}
const RESOLUTIONS = [64, 128, 256, 512];
for (const r of RESOLUTIONS) $("r" + r).addEventListener("click", () => { st.res = r; syncInputs(); changed(); });
$("reset").addEventListener("click", () => { const tab = st.tab; st = clone(DEFAULTS); st.tab = tab; syncInputs(); changed(); showTab(); setStatus("Everything is back to the original pack.", "ok"); });
$("copy").addEventListener("click", () => {
  const text = JSON.stringify(st, null, 2), done = () => setStatus("Settings copied. Paste them to Claude to update the repository.", "ok");
  try { navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text)); } catch (e) { fallbackCopy(text); }
});
function fallbackCopy(text) {
  const ta = document.createElement("textarea"); ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
  document.body.appendChild(ta); ta.select();
  let ok = false; try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
  document.body.removeChild(ta);
  setStatus(ok ? "Settings copied. Paste them to Claude to update the repository." : "Copy was blocked here. Your settings are still saved in this browser.", ok ? "ok" : "err");
}
/* ---------- performance ---------- */
// OptiFine copies each animated region into icons.png on every update. Stepped animations update a few times a
// second; interpolated ("Smooth") ones are blended on the CPU on every rendered frame, which is what costs FPS.
function perfEstimate(fps = 240) {
  const S = st.res / 16, pf = st.perf, rate = (el, kind) => el.animFps === "smooth" ? fps : animFrames(el, kind).fps;
  const aH = pf.animHearts, aHC = aH && pf.animHardcore, aX = pf.animXP, aB = pf.animHotbar && st.hotbar.enabled && !hbStill(st.hotbar);
  const heartPx = 18 * S * 9 * S, xpPx = 182 * S * 5 * S, hbPx = (182 * 22 + 24 * 24) * S * S;
  return ((aH ? heartPx * rate(st.heart, "heart") : 0) + (aHC ? heartPx * rate(st.heart, "heart") : 0) + (aX ? xpPx * rate(st.xp, "bar") : 0)
    + (aB ? hbPx * rate(st.hotbar, "hotbar") : 0)) / 1e6;
}
function syncPerf() {
  const pf = st.perf, allOn = pf.animHearts && pf.animHardcore && pf.animXP && pf.animHotbar;
  const sm = st.heart.animFps === "smooth" && st.xp.animFps === "smooth" && st.hotbar.animFps === "smooth", stp = st.heart.animFps === "ticks" && st.xp.animFps === "ticks";
  const noneOn = !pf.animHearts && !pf.animXP && !pf.animHotbar;
  pf.preset = noneOn ? (st.res <= 128 ? "none" : "custom") : !allOn ? "custom" : sm ? "smooth"
    : stp && st.hotbar.animFps !== "smooth" && st.res <= 128 && +st.heart.speed >= 2 && +st.xp.speed >= 2 && +st.hotbar.speed >= 2 ? "light" : stp ? "balanced" : "custom";
  $("perf-preset").value = pf.preset;
  $("perf-hearts").checked = pf.animHearts; $("perf-hc").checked = pf.animHardcore; $("perf-xp").checked = pf.animXP; $("perf-hb").checked = pf.animHotbar;
  $("perf-hc").disabled = !pf.animHearts;
  const m = perfEstimate(), smooth = st.heart.animFps === "smooth" || st.xp.animFps === "smooth";
  const level = m < 8 ? ["Light", "ok"] : m < 40 ? ["Moderate", ""] : ["Heavy: likely to lower your FPS", "err"];
  const vram = Math.round((256 * st.res / 16) ** 2 * 4 / 1048576);
  $("perf-est").textContent = (m === 0 ? "No animation work at all: the HUD is still images, so it runs like vanilla."
    : `${level[0]}. About ${m < 10 ? m.toFixed(1) : Math.round(m)} million pixels a second of animation work`
      + (smooth ? " at 240 FPS (Smooth animation costs more the higher your FPS)." : "."))
    + ` The ${st.res}x icons texture takes about ${vram} MB of video memory.`;
  $("perf-est").className = "status " + (m === 0 ? "ok" : level[1]);
}
function applyPerfPreset(p) {
  const pf = st.perf; pf.preset = p;
  const allAnim = { animHearts: true, animHardcore: true, animXP: true, animHotbar: true };
  if (p === "none") { st.res = 128; Object.assign(pf, { animHearts: false, animHardcore: false, animXP: false, animHotbar: false }); }
  if (p === "light") { st.res = 128; st.heart.animFps = "ticks"; st.xp.animFps = "ticks"; st.heart.speed = Math.max(2, +st.heart.speed); st.xp.speed = Math.max(2, +st.xp.speed);
    st.hotbar.animFps = "ticks"; st.hotbar.speed = Math.max(2, +st.hotbar.speed); Object.assign(pf, allAnim); }
  if (p === "balanced") { st.heart.animFps = "ticks"; st.xp.animFps = "ticks"; st.hotbar.animFps = "ticks"; Object.assign(pf, allAnim); }
  if (p === "smooth") { st.heart.animFps = "smooth"; st.xp.animFps = "smooth"; st.hotbar.animFps = "smooth"; Object.assign(pf, allAnim); }
}
$("perf-preset").addEventListener("change", () => { applyPerfPreset($("perf-preset").value); syncInputs(); changed(); });
for (const [id, key] of [["perf-hearts", "animHearts"], ["perf-hc", "animHardcore"], ["perf-xp", "animXP"], ["perf-hb", "animHotbar"]])
  $(id).addEventListener("change", () => { st.perf[key] = $(id).checked; st.perf.preset = "custom"; syncInputs(); save(); });

/* ---------- saved setups ---------- */
const SAVES_KEY = "galaxy-gui-studio-saves";
function readSaves() { try { return JSON.parse(localStorage.getItem(SAVES_KEY) || "[]"); } catch (e) { return []; } }
function writeSaves(list) { try { localStorage.setItem(SAVES_KEY, JSON.stringify(list)); return true; } catch (e) { return false; } }
function loadSetup(data) {
  const tab = st.tab; st = deepMerge(clone(DEFAULTS), data); st.tab = tab;
  save(); syncInputs(); changed(); showTab(); themesDrawn = false;
}
function renderSaves() {
  const ul = $("save-list"); ul.textContent = "";
  const list = readSaves();
  if (!list.length) { const li = document.createElement("li"); li.className = "empty"; li.textContent = "No saved setups yet."; ul.appendChild(li); return; }
  list.forEach((s, i) => {
    const li = document.createElement("li");
    const nm = document.createElement("span"); nm.className = "nm"; nm.textContent = s.name;
    const when = document.createElement("span"); when.className = "when"; when.textContent = new Date(s.time).toLocaleString([], { dateStyle: "short", timeStyle: "short" });
    const ld = document.createElement("button"); ld.type = "button"; ld.className = "btn"; ld.textContent = "Load";
    ld.addEventListener("click", () => { loadSetup(s.data); setStatus(`Loaded "${s.name}".`, "ok"); });
    const del = document.createElement("button"); del.type = "button"; del.className = "btn"; del.textContent = "Delete";
    del.addEventListener("click", () => {
      if (del.dataset.armed) { const l = readSaves(); l.splice(i, 1); writeSaves(l); renderSaves(); setStatus(`Deleted "${s.name}".`); return; }
      del.dataset.armed = "1"; del.textContent = "Confirm delete"; setTimeout(() => { if (del.isConnected) { delete del.dataset.armed; del.textContent = "Delete"; } }, 3000);
    });
    li.append(nm, when, ld, del); ul.appendChild(li);
  });
}
$("save-btn").addEventListener("click", () => {
  const name = ($("save-name").value || "").trim() || "My setup " + (readSaves().length + 1);
  const list = readSaves().filter(s => s.name !== name);                    // saving under an existing name replaces it
  list.unshift({ name, time: Date.now(), data: clone(st) });
  if (writeSaves(list)) { $("save-name").value = ""; renderSaves(); setStatus(`Saved "${name}".`, "ok"); }
  else setStatus("This browser blocked saving. Use Download settings file instead.", "err");
});
$("save-name").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); $("save-btn").click(); } });
$("save-download").addEventListener("click", async () => {
  if (!downloads) { setStatus("Downloads aren't available in this view. Use Copy settings instead.", "err"); return; }
  try { await downloads.save({ filename: "galaxy-gui-settings.json", data: JSON.stringify({ app: "galaxy-gui-studio", version: 1, settings: st }, null, 2) }); setStatus("Settings file saved.", "ok"); }
  catch (e) { setStatus(e && e.code === "declined" ? "Download cancelled." : "Couldn't save the file: " + ((e && e.message) || e), e && e.code === "declined" ? "" : "err"); }
});
$("save-upload").addEventListener("change", async () => {
  const f = $("save-upload").files[0]; if (!f) return;
  try {
    const j = JSON.parse(await f.text()), data = j.settings || j;
    if (!data || typeof data !== "object" || !data.heart || !data.shape) throw new Error("not a Galaxy GUI settings file");
    loadSetup(data); setStatus(`Loaded settings from ${f.name}.`, "ok");
  } catch (e) { setStatus("That file couldn't be loaded: " + e.message + ".", "err"); }
  $("save-upload").value = "";
});
renderSaves();
function setStatus(msg, cls = "") { const s = $("status"); s.textContent = msg; s.className = "status " + cls; }

