/**
 * Liquid Glass theme plugin, browser half: registers the liquid-glass
 * ThemeDefinition (translucent alias tokens over the dark base), applies the
 * structural glass effects (backdrop blur, specular edges, wallpaper) through
 * a body[data-ds-glass] scope that follows the active theme, and offers the
 * toggle row in the settings General section.
 *
 * The theme selection is persisted in localStorage: ThemeRuntime only writes
 * built-in preferences (light/dark/system) to the durable settings document,
 * so a third-party theme keeps its own session-level persistence here.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
// Type-only: the ctx.theme Context merge and ThemeDefinition.
import type {} from '@deepseek-ai/dsh-client-ui-theme/client'
import type { ThemeDefinition } from '@deepseek-ai/dsh-client-ui-theme/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: the settings General section's item slot declaration.
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
// Type-only: the ctx.slots SlotRegistry merge (the register/inject seats).
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import glassCss from './glass.css?inline'
import { mountSeaWallpaper, unmountSeaWallpaper } from './sea-wallpaper.ts'
import { GLASS_TOKENS } from './tokens.ts'
import { en, zh, type LiquidGlassLocaleKey } from './locales.ts'
import { GlassRow } from './GlassRow.tsx'

/** Required services (cordis fiber inject). Consumer of ctx.slots/theme/locale. */
export const inject = ['slots', 'theme', 'locale']

/** Theme id this plugin registers. */
export const LIQUID_GLASS_THEME_ID = 'liquid-glass'

/** localStorage key of the on/off choice. */
const ENABLED_STORAGE_KEY = 'dsh-liquid-glass-enabled'

/** The body attribute scoping the structural glass effects. */
const GLASS_ATTRIBUTE = 'data-ds-glass'

/** The registered theme definition. */
export const LIQUID_GLASS_THEME: ThemeDefinition = {
  id: LIQUID_GLASS_THEME_ID,
  colorScheme: 'dark',
  tokens: GLASS_TOKENS,
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The liquid glass toggle row's copy. */
    liquidGlass: LiquidGlassLocaleKey
  }
}

/** Read the persisted on/off choice (default off). */
function readEnabled(): boolean {
  try { return localStorage.getItem(ENABLED_STORAGE_KEY) === '1' }
  catch { return false }
}

/** Persist the on/off choice; storage failures keep it session-scoped. */
function storeEnabled(enabled: boolean): void {
  try { localStorage.setItem(ENABLED_STORAGE_KEY, enabled ? '1' : '0') }
  catch { /* storage unavailable */ }
}

/** Mount the glass effects stylesheet for the owning plugin lifetime. */
function installGlassStyles(ctx: ClientContext): void {
  if (typeof document === 'undefined') return
  ctx.effect(() => {
    const tag = document.createElement('style')
    tag.dataset.plugin = '@deepseek-ai/dsh-client-ui-theme-liquid-glass'
    tag.textContent = glassCss
    document.head.appendChild(tag)
    return () => { tag.remove() }
  }, 'ui-theme-liquid-glass: glass stylesheet')
}

/** Client plugin body: register the theme, the glass scope, and the toggle row. */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register('liquidGlass', { zh, en }), 'ui-theme-liquid-glass: dictionaries')
  installGlassStyles(ctx)

  const theme = ctx.theme
  const disposeTheme = theme.register(LIQUID_GLASS_THEME)

  // Project the glass scope onto the body while the theme is active.
  const applyScope = (activeId: string): void => {
    if (activeId === LIQUID_GLASS_THEME_ID) {
      document.body.setAttribute(GLASS_ATTRIBUTE, '')
      mountSeaWallpaper()
    } else {
      document.body.removeAttribute(GLASS_ATTRIBUTE)
      unmountSeaWallpaper()
    }
  }
  applyScope(theme.getTheme().active.id)
  ctx.effect(() => ctx.on('theme/change', (snapshot) => { applyScope(snapshot.active.id) }), 'ui-theme-liquid-glass: glass scope')

  // Restore the persisted choice once at mount.
  if (readEnabled()) theme.setTheme(LIQUID_GLASS_THEME_ID)

  ctx.effect(() => () => {
    disposeTheme()
    document.body.removeAttribute(GLASS_ATTRIBUTE)
    unmountSeaWallpaper()
  }, 'ui-theme-liquid-glass: theme registration')

  ctx.slots.inject('settings.general.item', () => ctx.slots.register({
    name: 'settings.general.item',
    id: 'liquid-glass',
    order: 12,
    locale: 'liquidGlass',
    inject: () => ({
      active: (theme.getTheme().preference as string) === LIQUID_GLASS_THEME_ID,
      toggle: () => {
        const next = (theme.getTheme().preference as string) === LIQUID_GLASS_THEME_ID ? 'dark' : LIQUID_GLASS_THEME_ID
        theme.setTheme(next)
        storeEnabled(next === LIQUID_GLASS_THEME_ID)
      },
    }),
  }, GlassRow))
}
