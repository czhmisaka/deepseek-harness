/**
 * Liquid Glass theme plugin, browser half: registers the liquid-glass
 * ThemeDefinition (translucent alias tokens over the dark base), drives the
 * structural glass effects (wallpaper, backdrop blur, specular edges) from
 * the durable parameter section, and hosts the Liquid Glass settings page.
 *
 * Parameter flow: the settings scope's resolved values apply to the document
 * (body attribute, wallpaper instance, blur CSS variables); every scope write
 * re-applies, so slider changes land immediately and survive restarts.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
// Type-only: the ctx.theme Context merge and ThemeDefinition.
import type {} from '@deepseek-ai/dsh-client-ui-theme/client'
import type { ThemeRuntime } from '@deepseek-ai/dsh-client-ui-theme/client'

/** Structural shape of a registrable theme (matches ThemeDefinition). */
interface GlassThemeDefinition {
  id: string
  colorScheme: 'dark' | 'light'
  tokens: Record<string, string>
}
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: the settings section slot declaration.
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
// Type-only: the ctx.slots SlotRegistry merge (the register/inject seats).
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
// Type-only: the ctx.remote Context merge with the generated usage namespace.
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import glassCss from './glass.css?inline'
import { GLASS_TOKENS } from './tokens.ts'
import { mountSeaWallpaper, unmountSeaWallpaper } from './sea-wallpaper.ts'
import { LiquidGlassSection } from './LiquidGlassSection.tsx'
import { en, zh } from './locales.ts'
import type { LiquidGlassSettings } from '../liquid-glass-settings.ts'
import { LIQUID_GLASS_DEFAULTS } from '../liquid-glass-settings.ts'

/** Theme id this plugin registers. */
export const LIQUID_GLASS_THEME_ID = 'liquid-glass'

/** The body attribute scoping the structural glass effects. */
const GLASS_ATTRIBUTE = 'data-ds-glass'

/** Settings namespace owned by this plugin (declared by the Host half). */
const SETTINGS_NS = 'liquid-glass'

/** The registered theme definition. */
export const LIQUID_GLASS_THEME: GlassThemeDefinition = {
  id: LIQUID_GLASS_THEME_ID,
  colorScheme: 'dark',
  tokens: GLASS_TOKENS,
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The liquid glass settings page's copy. */
    'liquid-glass': import('./locales.ts').LiquidGlassLocaleKey
  }
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

/**
 * Apply one parameter set to the document: glass scope attribute, wallpaper
 * instance, theme preference, and the blur CSS axis.
 */
function applyParams(theme: ThemeRuntime, params: LiquidGlassSettings): void {
  const body = document.body
  if (params.enabled) {
    body.setAttribute(GLASS_ATTRIBUTE, '')
    body.style.setProperty('--dsg-blur-main', String(Math.round(params.blur)) + 'px')
    mountSeaWallpaper({ seaTheme: params.seaTheme, speed: params.speed })
    if ((theme.getTheme().preference as string) !== LIQUID_GLASS_THEME_ID) theme.setTheme(LIQUID_GLASS_THEME_ID)
  } else {
    body.removeAttribute(GLASS_ATTRIBUTE)
    unmountSeaWallpaper()
    if ((theme.getTheme().preference as string) === LIQUID_GLASS_THEME_ID) theme.setTheme('dark')
  }
}

/** Client plugin body: theme registration, parameter application, settings page. */
export function apply(ctx: ClientContext): void {
  const t = ctx.locale.bind('liquid-glass')
  installGlassStyles(ctx)

  const theme = ctx.theme
  const disposeTheme = theme.register(LIQUID_GLASS_THEME)
  ctx.effect(() => () => { disposeTheme() }, 'ui-theme-liquid-glass: theme registration')

  const scope = ctx.settingsScope.bind<LiquidGlassSettings>({ namespace: SETTINGS_NS })

  const applyFromScope = (): void => {
    const snapshot = scope.getSnapshot()
    if (snapshot.status !== 'ready' || snapshot.value === undefined) return
    applyParams(theme, { ...LIQUID_GLASS_DEFAULTS, ...snapshot.value })
  }
  applyFromScope()
  ctx.effect(() => scope.subscribe(() => { applyFromScope() }), 'ui-theme-liquid-glass: parameter application')

  ctx.effect(() => ctx.locale.register('liquid-glass', { zh, en }), 'ui-theme-liquid-glass: dictionaries')

  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'liquid-glass',
    order: 21,
    label: () => t('nav'),
    locale: SETTINGS_NS,
    inject: () => ({ scope, set: (field: string, value: unknown) => { void scope.set(field, value) } }),
  }, LiquidGlassSection))
}
