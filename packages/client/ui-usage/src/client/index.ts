/**
 * Usage settings surface, browser half — one section rendering the
 * whole-deployment token dashboard from ctx.usageLedger's wire totals.
 *
 * The section fetches on mount and on the user's refresh; there is no
 * subscription: the ledger changes on every model call, and the Refresh
 * button is the currency affordance.
 */

// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: the settings shell's SlotMap merge (the 'settings.section' entry).
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
// Type-only: the ctx.remote Context merge with the generated usage namespace.
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { UsageLoad } from './usage-section.tsx'
import { UsageSection } from './usage-section.tsx'
import { en, zh } from './locales.ts'

/** Dictionary namespace owned by this plugin. */
const NS = 'usage'

/** Required services (cordis fiber inject). */
export const inject = ['slots', 'locale', 'remote', 'remote.usage']

/**
 * Mount the Usage settings section.
 * @param ctx - the browser plugin context.
 */
export function apply(ctx: ClientContext): void {
  const t = ctx.locale.bind(NS)
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-usage: section dictionaries')

  const load = async (): Promise<UsageLoad> => {
    const result = await ctx.remote.usage.totals()
    if (!result.ok) return { ok: false, code: result.error.code, detail: result.error.message }
    return { ok: true, snapshot: result.value }
  }

  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'usage',
    order: 20,
    label: () => t('nav'),
    locale: NS,
    inject: () => ({ load }),
  }, UsageSection))
}
