/**
 * Liquid Glass theme plugin, Host half: registers the durable parameter
 * section (enabled flag, sea palette, speed, wave, opacity, blur) so the
 * browser half can read and write the values through its settings scope.
 */
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-settings'
import { LIQUID_GLASS_DEFAULTS } from './liquid-glass-settings.ts'

/** Settings namespace owned by this plugin. */
export const LIQUID_GLASS_SETTINGS_NAMESPACE = 'liquid-glass'

/** The schema-resolved parameter shape (mirrors LiquidGlassSettings). */
export interface LiquidGlassSettingsShape {
  enabled: boolean
  seaTheme: 'dark' | 'light'
  speed: number
  colorWave: boolean
  opacity: number
  blur: number
}

/** Loader schema of the durable liquid glass parameter section. */
export const LiquidGlassSettingsSchema = z.object({
  enabled: z.boolean().default(LIQUID_GLASS_DEFAULTS.enabled),
  seaTheme: z.string().default(LIQUID_GLASS_DEFAULTS.seaTheme),
  speed: z.number().min(0.2).max(3).default(LIQUID_GLASS_DEFAULTS.speed),
  colorWave: z.boolean().default(LIQUID_GLASS_DEFAULTS.colorWave),
  opacity: z.number().min(0.3).max(1).default(LIQUID_GLASS_DEFAULTS.opacity),
  blur: z.number().min(0).max(40).default(LIQUID_GLASS_DEFAULTS.blur),
}) as unknown as z<LiquidGlassSettingsShape>

/**
 * Register the durable liquid glass parameter section when a settings
 * provider exists.
 * @param ctx - Host context whose optional settings service owns the section.
 */
export function apply(ctx: Context): void {
  ctx.inject(['settings'], (settingsCtx) => {
    settingsCtx.settings.register(LIQUID_GLASS_SETTINGS_NAMESPACE, LiquidGlassSettingsSchema)
  })
}
