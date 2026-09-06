/**
 * Liquid Glass parameter vocabulary: the durable settings document section and
 * the live values the client applies. Shared by the Host settings half and the
 * browser half.
 *
 * @module @deepseek-ai/dsh-client-ui-theme-liquid-glass/settings
 */

/** Sea palette. */
export type SeaTheme = 'dark' | 'light'

/** The durable liquid glass parameter section. */
export interface LiquidGlassSettings {
  /** Whether the liquid glass theme drives the UI. */
  enabled: boolean
  /** Sea palette (dark 暗紫 / light 暖橙). */
  seaTheme: SeaTheme
  /** Color band flow speed. */
  speed: number
  /** Tide trough/peak hue oscillation. */
  colorWave: boolean
  /** Wallpaper opacity. */
  opacity: number
  /** Main glass blur radius in px (sidebar/overlays). */
  blur: number
}

/** Default parameter values (the schema's defaults mirror these). */
export const LIQUID_GLASS_DEFAULTS: Omit<LiquidGlassSettings, never> = {
  enabled: false,
  seaTheme: 'dark',
  speed: 1.3,
  colorWave: true,
  opacity: 1,
  blur: 26,
}

/** Sea theme options in display order. */
export const SEA_THEMES: readonly SeaTheme[] = ['dark', 'light']
