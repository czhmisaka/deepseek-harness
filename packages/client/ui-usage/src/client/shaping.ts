/**
 * Pure view-model shaping for the usage dashboard: compact numbers, the
 * calendar-aligned usage-over-time series, the capped route table, and the
 * capped session table. All functions are pure over their inputs so the
 * component derives everything per render.
 *
 * @module @deepseek-ai/dsh-client-ui-usage/shaping
 */

import type {
  UsageLedgerHourTotals, UsageLedgerSessionTotals, UsageLedgerSnapshot, UsageLedgerTotals,
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

/** One plotted point of the usage-over-time chart. */
export interface UsageSeriesPoint {
  /** UTC bucket key: a calendar day (YYYY-MM-DD) or an hour (YYYY-MM-DDTHH). */
  readonly key: string
  /** Short display label (MM-DD for days, HH:00 for hours). */
  readonly label: string
  /** Hover title: bucket plus humanized total. */
  readonly title: string
  /** Humanized bucket total. */
  readonly display: string
  /** Horizontal position 0-100, evenly spaced by bucket index. */
  readonly x: number
  /** Vertical position 0-100; 100 sits at the series peak. */
  readonly y: number
  /** Whether the bucket carries any usage. */
  readonly active: boolean
}

/** One sparse axis label under the chart. */
export interface UsageSeriesAxisLabel {
  /** Short display label (MM-DD). */
  readonly label: string
  /** Horizontal position 0-100, matching its point's x. */
  readonly x: number
}

/** The calendar-aligned series the time chart renders. */
export interface UsageSeriesView {
  /** One point per hour or day in the selected range, oldest first. */
  readonly points: readonly UsageSeriesPoint[]
  /** Humanized series peak; the implicit y-axis reference. */
  readonly peak: string
  /** Sparse labels under the x-axis. */
  readonly axis: readonly UsageSeriesAxisLabel[]
}

/** Selectable chart ranges: trailing hours or trailing UTC days. */
export const SERIES_RANGES = ['24h', '7d', '30d'] as const

/** One selectable chart range. */
export type SeriesRange = (typeof SERIES_RANGES)[number]

/** One model-route table row. */
export interface UsageRouteView {
  /** provider/model display form. */
  readonly route: string
  /** Humanized request count. */
  readonly requests: string
  /** Humanized total tokens. */
  readonly tokens: string
  /** Token share against the table's largest row, 0-100, for the share bar. */
  readonly share: number
}

/** One per-session table row. */
export interface UsageSessionView {
  /** Full session id: the React key and the row's hover title. */
  readonly sessionId: string
  /** Compact display label (leading characters of the unprefixed id). */
  readonly label: string
  /** Humanized request count. */
  readonly requests: string
  /** Humanized total tokens. */
  readonly tokens: string
  /** Token share against the table's largest row, 0-100, for the share bar. */
  readonly share: number
  /** UTC calendar day (YYYY-MM-DD) of the session's newest record. */
  readonly lastActivity: string
}

/** Fully shaped view model of one snapshot. */
export interface UsageDashboardView {
  readonly figures: readonly UsageFigureView[]
  readonly today: { readonly requests: string; readonly total: string } | undefined
  readonly series: UsageSeriesView
  readonly routes: readonly UsageRouteView[]
  readonly hiddenRoutes: number
  readonly sessions: readonly UsageSessionView[]
  readonly hiddenSessions: number
  readonly ledgerPath: string
}

/** Routes rendered before the summary remainder line. */
const DISPLAYED_ROUTES = 8

/** Sessions rendered before the summary remainder line. */
const DISPLAYED_SESSIONS = 10

/** Characters kept from a session id for the compact table label. */
const SESSION_LABEL_CHARS = 8

/** Milliseconds per UTC day; UTC days are a fixed length, so day stepping is exact. */
const MS_PER_DAY = 86_400_000

/** Milliseconds per hour; hour stepping on the UTC clock is exact the same way. */
const MS_PER_HOUR = 3_600_000

/** Points in the hourly view. */
const HOURLY_POINTS = 24

/** Roughly this many axis labels render under the chart. */
const SERIES_AXIS_LABELS = 4

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
 * @param range - the chart's granularity and span.
 * @returns the shaped dashboard view.
 */
export function shapeDashboard(
  snapshot: UsageLedgerSnapshot,
  labels: Record<UsageFigureView['id'], string>,
  range: SeriesRange,
): UsageDashboardView {
  const totals = snapshot.totals
  // An absent bySession reads empty: a freshly rebuilt client can render
  // against a still-running Host whose fold predates the field.
  const sessionRows: readonly UsageLedgerSessionTotals[] = Array.isArray(totals.bySession)
    ? totals.bySession
    : []
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
    series: shapeSeries(totals, range),
    routes: shapeRoutes(totals),
    hiddenRoutes: Math.max(0, totals.byModel.length - DISPLAYED_ROUTES),
    sessions: shapeSessions(sessionRows),
    hiddenSessions: Math.max(0, sessionRows.length - DISPLAYED_SESSIONS),
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

/**
 * The series for one range, ending at the current hour (24h) or UTC day
 * (7d/30d). Buckets without a recorded entry read as zero, so the x-axis is
 * an honest calendar span instead of the ledger's recorded buckets only.
 */
function shapeSeries(totals: UsageLedgerTotals, range: SeriesRange): UsageSeriesView {
  if (range === '24h') return hourlySeries(totals)
  return dailySeries(totals, range === '7d' ? 7 : 30)
}

/** The trailing 24 hourly buckets; hours without a record read as zero. */
function hourlySeries(totals: UsageLedgerTotals): UsageSeriesView {
  // An absent byHour reads empty: a freshly rebuilt client can render against
  // a still-running Host whose fold predates the field.
  const rows: readonly UsageLedgerHourTotals[] = Array.isArray(totals.byHour) ? totals.byHour : []
  const tokensByHour = new Map(rows.map(entry => [entry.hour, entry.totalTokens]))
  const now = Date.now()
  const raw = Array.from({ length: HOURLY_POINTS }, (_, index) => {
    const hour = utcHour(now - (HOURLY_POINTS - 1 - index) * MS_PER_HOUR)
    return { key: hour, tokens: tokensByHour.get(hour) ?? 0 }
  })
  return finishSeries(
    raw,
    key => key.slice(11) + ':00',
    (key, display) => key.slice(0, 10) + ' ' + key.slice(11) + ':00 · ' + display,
  )
}

/** The trailing UTC daily buckets; days without a record read as zero. */
function dailySeries(totals: UsageLedgerTotals, days: 7 | 30): UsageSeriesView {
  const tokensByDay = new Map(totals.byDay.map(entry => [entry.day, entry.totalTokens]))
  const now = Date.now()
  const raw = Array.from({ length: days }, (_, index) => {
    const day = utcDay(now - (days - 1 - index) * MS_PER_DAY)
    return { key: day, tokens: tokensByDay.get(day) ?? 0 }
  })
  return finishSeries(raw, key => key.slice(5), (key, display) => key + ' · ' + display)
}

/** Shared point shaping: peak scaling, even spacing, and the sparse axis. */
function finishSeries(
  raw: readonly { key: string; tokens: number }[],
  label: (key: string) => string,
  title: (key: string, display: string) => string,
): UsageSeriesView {
  const peak = raw.reduce((max, entry) => Math.max(max, entry.tokens), 0)
  const points = raw.map((entry, index) => ({
    key: entry.key,
    label: label(entry.key),
    title: title(entry.key, formatCompactCount(entry.tokens)),
    display: formatCompactCount(entry.tokens),
    x: Math.round((index / (raw.length - 1)) * 100),
    y: peak === 0 ? 0 : Math.round((entry.tokens / peak) * 100),
    active: entry.tokens > 0,
  }))
  return { points, peak: formatCompactCount(peak), axis: seriesAxis(points) }
}

/** Roughly SERIES_AXIS_LABELS evenly spaced bucket labels, always ending at the newest. */
function seriesAxis(points: readonly UsageSeriesPoint[]): readonly UsageSeriesAxisLabel[] {
  if (points.length === 0) return []
  const step = Math.max(1, Math.ceil(points.length / (SERIES_AXIS_LABELS + 1)))
  const axis: UsageSeriesAxisLabel[] = []
  for (let index = 0; index < points.length; index += step) {
    const point = points[index]
    if (point !== undefined) axis.push({ label: point.label, x: point.x })
  }
  const last = points[points.length - 1]
  if (last !== undefined && axis[axis.length - 1]?.x !== last.x) {
    axis.push({ label: last.label, x: last.x })
  }
  return axis
}

/**
 * Token share against the table's largest row, 0-100. Rows arrive sorted
 * largest first, so the first row is the 100 percent reference.
 */
function shareOf(entryTokens: number, largestTokens: number): number {
  if (largestTokens <= 0) return 0
  return Math.round((entryTokens / largestTokens) * 100)
}

/** Route rows capped for the table, most-used first. */
function shapeRoutes(totals: UsageLedgerTotals): readonly UsageRouteView[] {
  const rows = totals.byModel.slice(0, DISPLAYED_ROUTES)
  const largest = rows[0]?.totalTokens ?? 0
  return rows.map(entry => ({
    route: entry.provider + '/' + entry.model,
    requests: formatCompactCount(entry.requests),
    tokens: formatCompactCount(entry.totalTokens),
    share: shareOf(entry.totalTokens, largest),
  }))
}

/** Compact session label: the id without its "session-" prefix, trimmed. */
function sessionLabel(sessionId: string): string {
  const bare = sessionId.startsWith('session-') ? sessionId.slice('session-'.length) : sessionId
  return bare.length > SESSION_LABEL_CHARS ? bare.slice(0, SESSION_LABEL_CHARS) + '…' : bare
}

/** Session rows capped for the table, most-used first (the fold's order). */
function shapeSessions(rows: readonly UsageLedgerSessionTotals[]): readonly UsageSessionView[] {
  const capped = rows.slice(0, DISPLAYED_SESSIONS)
  const largest = capped[0]?.totalTokens ?? 0
  return capped.map(entry => ({
    sessionId: entry.sessionId,
    label: sessionLabel(entry.sessionId),
    requests: formatCompactCount(entry.requests),
    tokens: formatCompactCount(entry.totalTokens),
    share: shareOf(entry.totalTokens, largest),
    lastActivity: new Date(entry.lastActivity).toISOString().slice(0, 10),
  }))
}

/** The UTC calendar day (YYYY-MM-DD) of one epoch-ms time. */
function utcDay(time: number): string {
  return new Date(time).toISOString().slice(0, 10)
}

/** The UTC hour key (YYYY-MM-DDTHH) of one epoch-ms time. */
function utcHour(time: number): string {
  return new Date(time).toISOString().slice(0, 13)
}
