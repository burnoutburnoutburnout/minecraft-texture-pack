package com.galaxygui.crosshair;

import java.io.File;

import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.Gui;
import net.minecraft.client.renderer.GlStateManager;
import net.minecraftforge.client.event.RenderGameOverlayEvent;
import net.minecraftforge.common.MinecraftForge;
import net.minecraftforge.common.config.Configuration;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.fml.common.event.FMLInitializationEvent;
import net.minecraftforge.fml.common.event.FMLPreInitializationEvent;
import net.minecraftforge.fml.common.eventhandler.SubscribeEvent;

/**
 * Minecraft 1.8.9 draws the crosshair with an inverting blend (ONE_MINUS_DST_COLOR, ONE_MINUS_SRC_COLOR), so it shows
 * as the opposite of whatever is behind it and resource-pack colours never show as themselves. This mod cancels that
 * draw and draws the same crosshair texture (the top-left 16 x 16 of textures/gui/icons.png) with normal blending.
 *
 * Member names are Forge's SRG names (func_ / field_), which is what Forge mods use in a normal game. MCP names:
 * func_71410_x getMinecraft, field_71474_y gameSettings, field_74330_P showDebugInfo, field_178879_v reducedDebugInfo,
 * field_71439_g thePlayer, func_175140_cp hasReducedDebug, field_71442_b playerController, func_78747_a isSpectator,
 * func_110434_K getTextureManager, func_110577_a bindTexture, field_110324_m icons, field_71456_v ingameGUI,
 * func_73729_b drawTexturedModalRect, func_78326_a / func_78328_b getScaledWidth / getScaledHeight,
 * func_179147_l enableBlend, func_179084_k disableBlend, func_179120_a tryBlendFuncSeparate, func_179141_d enableAlpha,
 * func_179131_c color.
 */
@Mod(modid = NoInvertCrosshair.MODID, name = "Galaxy GUI Crosshair", version = NoInvertCrosshair.VERSION,
        clientSideOnly = true, acceptedMinecraftVersions = "[1.8.9]")
public class NoInvertCrosshair {
    public static final String MODID = "galaxyguicrosshair";
    public static final String VERSION = "1.0";

    /** "normal": the crosshair's own colours (default). "premultiplied": same, for textures that store colour times alpha
     *  (the Galaxy GUI pack does). "inverted": the game's usual look. */
    private String blend = "auto";
    private boolean enabled = true;

    @Mod.EventHandler
    public void preInit(FMLPreInitializationEvent event) {
        File file = event.getSuggestedConfigurationFile();
        Configuration config = new Configuration(file);
        config.load();
        enabled = config.getBoolean("enabled", "crosshair", true,
                "Draw the crosshair with its real colours instead of inverting what is behind it.");
        blend = config.getString("blend", "crosshair", "auto",
                "auto = right for the Galaxy GUI pack and for vanilla-style crosshairs; normal = plain alpha blending; "
                        + "premultiplied = for crosshair textures whose colour is already multiplied by alpha.",
                new String[] { "auto", "normal", "premultiplied" });
        if (config.hasChanged()) config.save();
    }

    @Mod.EventHandler
    public void init(FMLInitializationEvent event) {
        MinecraftForge.EVENT_BUS.register(this);
    }

    @SubscribeEvent
    public void onOverlay(RenderGameOverlayEvent.Pre event) {
        if (!enabled || event.type != RenderGameOverlayEvent.ElementType.CROSSHAIRS) return;
        Minecraft mc = Minecraft.func_71410_x();
        if (mc.field_71474_y == null || mc.field_71439_g == null || mc.field_71442_b == null) return;
        // leave the game's own rules alone: F3 shows the axes instead, spectators only see it over some targets
        if (mc.field_71474_y.field_74330_P && !mc.field_71439_g.func_175140_cp() && !mc.field_71474_y.field_178879_v) return;
        if (mc.field_71442_b.func_78747_a()) return;

        event.setCanceled(true);
        int w = event.resolution.func_78326_a(), h = event.resolution.func_78328_b();
        mc.func_110434_K().func_110577_a(Gui.field_110324_m);
        GlStateManager.func_179147_l();
        GlStateManager.func_179141_d();
        GlStateManager.func_179131_c(1.0F, 1.0F, 1.0F, 1.0F);
        // GL_ONE / GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA: premultiplied colour is right for the Galaxy GUI pack (which
        // stores colour times alpha for the vanilla blend) and identical for vanilla's solid white crosshair
        int src = "normal".equals(blend) ? 770 : 1;
        GlStateManager.func_179120_a(src, 771, 1, 771);
        mc.field_71456_v.func_73729_b(w / 2 - 7, h / 2 - 7, 0, 0, 16, 16);
        GlStateManager.func_179120_a(770, 771, 1, 0);
        GlStateManager.func_179084_k();
    }
}
