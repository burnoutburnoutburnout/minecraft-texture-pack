# Galaxy GUI Crosshair (Forge 1.8.9)

Minecraft 1.8.9 draws the crosshair with an inverting blend, so it always shows as the opposite of what is behind it and a resource pack's colours never show as themselves. This client-side mod cancels the game's crosshair draw and draws the same texture (the top-left 16 × 16 of `textures/gui/icons.png`, including OptiFine animations on it) with normal blending.

- **Install:** put `dist/GalaxyGUI-Crosshair-1.0-1.8.9.jar` in `.minecraft/mods/` with Forge for 1.8.9. The Galaxy GUI Studio's Crosshair tab can also download it.
- **Config** (`config/galaxyguicrosshair.cfg`, made on first launch): `enabled` (turn the mod's drawing off), `blend` (`auto`, `normal` or `premultiplied`; `auto` suits the Galaxy GUI pack and plain crosshairs).
- **Leaves alone:** the F3 screen (which shows axes instead) and spectator mode.

## Building

```bash
./mod/build.sh
```

The script uses no ForgeGradle: it downloads the 1.8.9 client, the MCP SRG mappings, Forge universal and SpecialSource, remaps the client and Forge to SRG names, compiles the mod for Java 8 against them (any JDK from 9 up), and writes the jar to `dist/`. Member names in the source are SRG names, with the readable MCP names listed in the class comment.
