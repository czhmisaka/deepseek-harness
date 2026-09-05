/**
 * Unit behavior of the usage dashboard shaping: compact numbers, today
 * selection, the seven-day trend bars, and route capping.
 */

import type { UsageLedgerSnapshot, UsageLedgerTotals } from '@deepseek-ai/dsh-api-remotes/client'
import { describe, expect, it } from 'vitest'
import { formatCompactCount, shapeDashboard } from '../src/client/shaping.ts'

/** Localized figure labels the fold renders. */
const labels: Record<UsageFigureId, string> = {
  requests: 'Requests',
  input: 'Input',
  cacheRead: 'Cache read',
  cacheWrite: 'Cache write',
  output: 'Output',
  total: 'Total',
}

/** Figure key union for the label map. */
type UsageFigureId = 'requests' | 'input' | 'cacheRead' | 'cacheWrite' | 'output' | 'total'

/** The UTC calendar day key of "now". */
function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

/** One model-route row with unit counts. */
function routeRow(index: number) {
  return { provider: 'p' + String(index), model: 'm', requests: 1, inputTokens: 1, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, totalTokens: 1 }
}

/** One recorded day with a zeroed bucket set and the given total. */
function day(key: string, totalTokens: number) {
  return {
    day: key, requests: Math.min(3, totalTokens), inputTokens: 0, outputTokens: 0,
    cacheReadTokens: 0, cacheWriteTokens: 0, totalTokens,
  }
}

/** The base totals snapshot. */
function baseTotals(): UsageLedgerTotals {
  return {
    requests: 2,
    inputTokens: 1500,
    outputTokens: 250000,
    cacheReadTokens: 987,
    cacheWriteTokens: 0,
    totalTokens: 251500,
    byModel: [routeRow(0)],
    byDay: [day('2026-09-01', 1000)],
    lastRecordTime: 1000,
  }
}

/** A wire snapshot over one totals override. */
function snapshotOf(overrides: Partial<UsageLedgerTotals>): UsageLedgerSnapshot {
  return { totals: { ...baseTotals(), ...overrides }, ledgerDisplay: '~/.dsh/usage/usage.jsonl' }
}

/** Shaped view over one totals override. */
function viewOf(overrides: Partial<UsageLedgerTotals>) {
  return shapeDashboard(snapshotOf(overrides), labels)
}

describe('formatCompactCount', () => {
  it('formats exact counts below one thousand and trims scaled zeros', () => {
    expect(formatCompactCount(0)).toBe('0')
    expect(formatCompactCount(999)).toBe('999')
    expect(formatCompactCount(1000)).toBe('1K')
    expect(formatCompactCount(1_234_567)).toBe('1.2M')
  })
})

describe('shapeDashboard', () => {
  it('shapes the six figures, routes, and ledger location', () => {
    const view = shapeDashboard(snapshotOf({}), labels)
    expect(view.figures.map(figure => figure.id)).toEqual([
      'requests', 'input', 'cacheRead', 'cacheWrite', 'output', 'total',
    ])
    expect(view.figures.find(figure => figure.id === 'input')?.value).toBe('1.5K')
    expect(view.routes[0]).toEqual({ route: 'p0/m', requests: '1', tokens: '1' })
    expect(view.ledgerPath).toBe('~/.dsh/usage/usage.jsonl')
  })

  it('omits the today card when no record falls on today', () => {
    expect(viewOf({}).today).toBeUndefined()
  })

  it('selects the today entry when one falls on the current day', () => {
    const view = viewOf({ byDay: [day(todayKey(), 500)] })
    expect(view.today).toEqual({ requests: '3', total: '500' })
  })

  it('returns no trend bars before any recorded day', () => {
    const view = viewOf({ byDay: [], byModel: [] })
    expect(view.trend).toEqual([])
    expect(view.routes).toEqual([])
    expect(view.hiddenRoutes).toBe(0)
  })

  it('scales bars against the peak day and floors tiny days at two percent', () => {
    const view = viewOf({ byDay: [day('2026-09-01', 1000), day('2026-09-02', 4000), day('2026-09-03', 0)] })
    expect(view.trend).toHaveLength(3)
    expect(view.trend[0]).toMatchObject({ width: 25, active: true })
    expect(view.trend[1]).toMatchObject({ width: 100, active: true })
    expect(view.trend[2]).toMatchObject({ width: 2, active: false })
  })

  it('keeps at most eight route rows and summarizes the remainder', () => {
    const view = viewOf({ byModel: Array.from({ length: 10 }, (_, index) => routeRow(index)) })
    expect(view.routes).toHaveLength(8)
    expect(view.hiddenRoutes).toBe(2)
  })

  it('hides the trend chart while every recorded day totals zero', () => {
    const view = viewOf({ byDay: [day('2026-09-01', 0)] })
    expect(view.trend).toEqual([])
  })
})
