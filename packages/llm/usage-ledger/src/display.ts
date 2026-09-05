/**
 * Human-readable rendering of usage totals for the /usage command. Pure text
 * shaping over one frozen totals snapshot.
 *
 * @module @deepseek-ai/dsh-usage-ledger/display
 */

import { dshHomeDisplay, resolveDshHome } from '@deepseek-ai/dsh-home-paths'
import type { UsageLedgerTotals } from './types.ts'

/** Routes listed under "By model" before the summary remainder line. */
const DISPLAYED_MODEL_ROUTES = 5

/**
 * Compact humanized token count: exact below 1000, one-decimal K below one
 * million, one-decimal M above, trailing zeros trimmed.
 *
 * @param count - a non-negative token count.
 * @returns the display form, e.g. "942", "12.3K", "1.1M".
 */
export function formatTokenCount(count: number): string {
  if (count < 1000) return String(count)
  if (count < 1_000_000) return scaledTokenCount(count, 1000) + 'K'
  return scaledTokenCount(count, 1_000_000) + 'M'
}

/** One-decimal scaled form with a trailing ".0" trimmed. */
function scaledTokenCount(count: number, divisor: number): string {
  const scaled = (count / divisor).toFixed(1)
  return scaled.endsWith('.0') ? scaled.slice(0, -2) : scaled
}

/**
 * Render the /usage command text for one totals snapshot.
 *
 * @param totals - the frozen totals to render.
 * @param ledgerDisplay - user-facing ledger path spelling for the header.
 * @returns the multi-line command result text.
 */
export function formatUsageTotals(totals: UsageLedgerTotals, ledgerDisplay: string): string {
  if (totals.requests === 0) {
    return 'No token usage recorded yet. Ledger: ' + ledgerDisplay
  }
  const lines = [
    'Token usage — all sessions (ledger: ' + ledgerDisplay + ')',
    'Requests ' + totals.requests.toLocaleString('en-US')
      + ' · Input ' + formatTokenCount(totals.inputTokens)
      + ' · Cache read ' + formatTokenCount(totals.cacheReadTokens)
      + ' · Cache write ' + formatTokenCount(totals.cacheWriteTokens)
      + ' · Output ' + formatTokenCount(totals.outputTokens)
      + ' · Total ' + formatTokenCount(totals.totalTokens),
  ]
  const today = new Date().toISOString().slice(0, 10)
  const todayTotals = totals.byDay.find(entry => entry.day === today)
  if (todayTotals !== undefined) {
    lines.push('Today (UTC ' + today + '): ' + todayTotals.requests.toLocaleString('en-US') + ' requests · ' + formatTokenCount(todayTotals.totalTokens) + ' tokens')
  }
  lines.push('By model:')
  for (const model of totals.byModel.slice(0, DISPLAYED_MODEL_ROUTES)) {
    lines.push('  ' + model.provider + '/' + model.model + ' — ' + model.requests.toLocaleString('en-US') + ' requests · ' + formatTokenCount(model.totalTokens) + ' tokens')
  }
  if (totals.byModel.length > DISPLAYED_MODEL_ROUTES) {
    const rest = totals.byModel.length - DISPLAYED_MODEL_ROUTES
    lines.push('  … and ' + String(rest) + ' more route' + (rest === 1 ? '' : 's'))
  }
  return lines.join('\n')
}

/**
 * Render the ledger path for user-facing display: home-relative spelling
 * (~/.dsh or $DSH_HOME) when the file sits inside the harness home, verbatim
 * otherwise.
 *
 * @param path - the configured absolute ledger path.
 * @returns the symbolic home-relative form, or the path unchanged.
 */
export function displayLedgerPath(path: string): string {
  const home = resolveDshHome()
  if (path === home) return dshHomeDisplay(home)
  if (path.startsWith(home + '/')) return dshHomeDisplay(home) + path.slice(home.length)
  return path
}
