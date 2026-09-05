/**
 * Pure view-model shaping for the usage dashboard: compact numbers, the
 * seven-day trend, and the capped route table. All functions are pure over
 * their inputs so the component derives everything in a single useMemo.
 *
 * @module @deepseek-ai/dsh-client-ui-usage/shaping
 */

import type {
  UsageLedgerSnapshot, UsageLedgerTotals,
} from '@deepseek-ai/dsh-api-remotes/client'

/** One labeled figure the totals grid renders. */
export interface UsageFigureView {
  /** Stable grid key and test id. */
  readonly id: 'requests' | 'input' | 'cacheRead' | 'cacheWrite' | 'output' | 'total'
  /** Display label (already localized). */
  readonly label: string
  /** Display value (compact number form). */
  readonly value: string
}

/** One trend bar of the seven-day chart. */
export interface UsageTrendBar {
  /** UTC calendar day (YYYY-MM-DD). */
  readonly day: string
  /** Short display label (MM-DD). */
  readonly label: string
  /** Humanized day total. */
  readonly display: string
  /** Relative bar width 0-100, rounded. */
  readonly width: number
  /** Whether the day carries any usage. */
  readonly active: boolean
}

/** One model-route table row. */
export interface UsageRouteView {
  /** provider/model display form. */
  readonly route: string
  /** Humanized request count. */
  readonly requests: string
  /** Humanized total tokens. */
  readonly tokens: string
}

/** Fully shaped view model of one snapshot. */
export interface UsageDashboardView {
  readonly figures: readonly UsageFigureView[]
  readonly today: { readonly requests: string; readonly total: string } | undefined
  readonly trend: readonly UsageTrendBar[]
  readonly routes: readonly UsageRouteView[]
  readonly hiddenRoutes: number
  readonly ledgerPath: string
}

/** Routes rendered before the summary remainder line. */
const DISPLAYED_ROUTES = 8

/** Days in the trend chart. */
const TREND_DAYS = 7

/**
 * Compact number form: exact below 1000, one-decimal K/M above, trailing
 * zeros trimmed. Locale-neutral by design, matching the /usage command.
 * @param count - a non-negative count.
 * @returns the display form, e.g. "942", "12.3K", "1.1M".
 */
export function formatCompactCount(count: number): string {
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
 * Shape the wire snapshot into the dashboard view model.
 * @param snapshot - the frozen wire snapshot.
 * @param labels - the six localized figure labels keyed by figure id.
 * @returns the shaped dashboard view.
 */
export function shapeDashboard(
  snapshot: UsageLedgerSnapshot,
  labels: Record<UsageFigureView['id'], string>,
): UsageDashboardView {
  const totals = snapshot.totals
  return {
    figures: [
      { id: 'requests', label: labels.requests, value: formatCompactCount(totals.requests) },
      { id: 'input', label: labels.input, value: formatCompactCount(totals.inputTokens) },
      { id: 'cacheRead', label: labels.cacheRead, value: formatCompactCount(totals.cacheReadTokens) },
      { id: 'cacheWrite', label: labels.cacheWrite, value: formatCompactCount(totals.cacheWriteTokens) },
      { id: 'output', label: labels.output, value: formatCompactCount(totals.outputTokens) },
      { id: 'total', label: labels.total, value: formatCompactCount(totals.totalTokens) },
    ],
    today: shapeToday(totals),
    trend: shapeTrend(totals),
    routes: shapeRoutes(totals),
    hiddenRoutes: Math.max(0, totals.byModel.length - DISPLAYED_ROUTES),
    ledgerPath: snapshot.ledgerDisplay,
  }
}

/** Today's (UTC) figures, or undefined when no record falls on today. */
function shapeToday(totals: UsageLedgerTotals): UsageDashboardView['today'] {
  const today = utcDay(Date.now())
  const entry = totals.byDay.find(day => day.day === today)
  if (entry === undefined) return undefined
  return { requests: formatCompactCount(entry.requests), total: formatCompactCount(entry.totalTokens) }
}

/** The newest seven recorded days as relative bars, oldest first. */
function shapeTrend(totals: UsageLedgerTotals): readonly UsageTrendBar[] {
  const days = totals.byDay.slice(-TREND_DAYS)
  const peak = days.reduce((max, day) => Math.max(max, day.totalTokens), 0)
  if (peak === 0) return []
  return days.map(day => ({
    day: day.day,
    label: day.day.slice(5),
    display: formatCompactCount(day.totalTokens),
    width: Math.max(2, Math.round((day.totalTokens / peak) * 100)),
    active: day.totalTokens > 0,
  }))
}

/** Route rows capped for the table, most-used first. */
function shapeRoutes(totals: UsageLedgerTotals): readonly UsageRouteView[] {
  return totals.byModel.slice(0, DISPLAYED_ROUTES).map(entry => ({
    route: entry.provider + '/' + entry.model,
    requests: formatCompactCount(entry.requests),
    tokens: formatCompactCount(entry.totalTokens),
  }))
}

/** The UTC calendar day (YYYY-MM-DD) of one epoch-ms time. */
function utcDay(time: number): string {
  return new Date(time).toISOString().slice(0, 10)
}
