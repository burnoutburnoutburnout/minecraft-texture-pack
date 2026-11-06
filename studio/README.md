# Galaxy GUI Studio

A single-page editor for the Galaxy GUI 1.8.9 HUD pack. It previews the HUD live and builds the 256x or 512x pack zip in the browser.

- **Live page:** https://claude.ai/artifact/4DyYxVHU6WCpY6YtteUwzp (private to its owner until shared from the page's Share menu).
- **Built file:** `galaxy-gui-studio.html`. This is what gets published.
- **Source:** `src/`. The page is these pieces joined in a fixed order.

## Rebuilding

```bash
./studio/build.sh
```

Edit the files in `src/`, run the script, then publish `studio/galaxy-gui-studio.html` to the artifact URL above. Don't edit the built HTML by hand: the next build overwrites it.

## What's where

| File | Contents |
| --- | --- |
| `head.html` | Title, styles, page layout and the Build card (including saved setups) |
| `core1.js` | Maths, tiling noise, signed distance functions, stars and the starfield, including random motion and shooting stars |
| `mid.js` | Colour helpers, air bubbles, ping icons |
| `steak.js` | Steak designs, textures, borders, shape editor geometry, empty-slot styles, and `steakIcon()` |
| `photo.js`, `pan.js` | Photo-real grilled steak and pan-seared ribeye |
| `smooth.js`, `slab.js` | Smooth and Smooth grilled steaks (traced from reference screenshots) |
| `elements.js` | Hearts, armor and XP bar: designs, textures, borders, shapes (standard, classic, puffy, gem-cut), frames, and `elementIcon()` |
| `gh.js` | The framed gem heart traced from the ruby reference |
| `ui.js` | The five HUD styles (vials, constellations, mosaic, rift, celestial) and the hardcore mark |
| `hotbar.js` | Hotbar styles, the selected-slot frame, and the menu buttons, language and lock icons that share `widgets.png` |
| `armor.js` | Cosmic armor: galaxy and rainbow armor in several shapes and finishes |
| `crosshair.js` | Crosshair parts, presets, fills and animation (1.8.9 draws the crosshair with an inverting blend, so colour is stored multiplied by alpha) |
| `itemmodels.js` | The 1.8.9 item models (compact copy of `assets/minecraft/models/item` from the 1.8.9 client), used to write item models with a scaled `gui` display for the item size setting |
| `png.js` | PNG encoder |
| `themes.js` | Style list and the mini HUD previews |
| `tail.js` | Settings, every control card, tabs, previews, saving and loading |
| `build.js` | Pack builder: `icons.png`, animation strips and OptiFine `.properties` files |

## Notes

- Settings are stored in the viewer's browser under `galaxy-gui-studio-v4`, and saved setups under `galaxy-gui-studio-saves`. Changing the shape of the settings can drop older saves, so add new fields with defaults (see `deepMerge` in `tail.js`).
- Animations use OptiFine Custom Animations (`assets/minecraft/mcpatcher/anim/galaxygui/`). The Smooth setting writes `interpolate=true`.
- The page uses the artifact `downloads` capability to hand over the zip and the settings file.
