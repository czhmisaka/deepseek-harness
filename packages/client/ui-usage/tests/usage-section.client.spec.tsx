// @vitest-environment jsdom
/**
 * Usage settings section, browser behavior: realistic fetch stubs drive the
 * rendered dashboard, and the spec asserts user-visible output.
 */

import { act } from 'react'
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { UsageSection } from '../src/client/usage-section.tsx'
import type { UsageLoad } from '../src/client/usage-section.tsx'
import type { UsageLedgerSnapshot, UsageLedgerTotals } from '@deepseek-ai/dsh-api-remotes/client'

/** A ready snapshot fixture. */
function snapshotOf(totalsOverrides: Partial<UsageLedgerTotals>): UsageLedgerSnapshot {
  const totals: UsageLedgerTotals = {
    requests: 2,
    inputTokens: 1500,
    outputTokens: 250000,
    cacheReadTokens: 987,
    cacheWriteTokens: 0,
    totalTokens: 252500,
    byModel: [
      { provider: 'deepseek-official', model: 'deepseek-v4-flash', requests: 120, inputTokens: 1, outputTokens: 1, cacheReadTokens: 1, cacheWriteTokens: 0, totalTokens: 2_200_000 },
      { provider: 'pi', model: 'gateway', requests: 8, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, totalTokens: 60_000 },
    ],
    byDay: [{ day: '2026-09-03', requests: 12, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, totalTokens: 210_000 }],
    lastRecordTime: 1000,
    ...totalsOverrides,
  }
  return { totals, ledgerDisplay: '~/.dsh/usage/usage.jsonl' }
}

/** Renderer props for one load stub. */
function propsFor(load: () => Promise<UsageLoad>) {
  return { t: stubT, load, close: () => {} } as unknown as Parameters<typeof UsageSection>[0]
}

/** The dictionary the stub t resolves. */
const copy: Record<string, string> = {
  nav: 'Usage',
  title: 'Token usage',
  intro: 'Whole-deployment token accounting.',
  refresh: 'Refresh',
  empty: 'No token usage recorded yet.',
  loadFailed: 'Usage data is unavailable',
  retry: 'Retry',
  totalsHeading: 'All time',
  requestsLabel: 'Requests',
  inputLabel: 'Input',
  cacheReadLabel: 'Cache read',
  cacheWriteLabel: 'Cache write',
  outputLabel: 'Output',
  totalLabel: 'Total',
  todayHeading: 'Today (UTC)',
  todayNone: 'No usage today yet.',
  trendHeading: 'Last 7 days (UTC)',
  trendEmpty: 'Not enough history for a trend yet.',
  routesHeading: 'By model',
  routesEmpty: 'No routes recorded.',
  routeNameColumn: 'Route',
  routeRequestsColumn: 'Requests',
  routeTokensColumn: 'Total tokens',
  ledgerPathLabel: 'Ledger file',
  moreRoutes: '{count} more routes',
}

/** The stub translate the spec renders with. */
function stubT(key: string): string {
  return copy[key] ?? key
}

describe('usage section', () => {
  afterEach(cleanup)

  it('renders the totals grid, today, trend, and routes when data loads', async () => {
    const screen = render(<UsageSection {...propsFor(async () => ({ ok: true, snapshot: snapshotOf({ totalTokens: 1_234_567 }) }))} />)
    await act(async () => { await Promise.resolve() })
    expect(screen.getByText('Token usage')).toBeDefined()
    expect(screen.getByText('1.2M')).toBeDefined()
    expect(screen.getByText('deepseek-official/deepseek-v4-flash')).toBeDefined()
    expect(screen.getByText((_, element) => element?.textContent === 'Ledger file: ~/.dsh/usage/usage.jsonl')).toBeDefined()
  })

  it('shows the failure copy with the wire code when the call fails', async () => {
    const screen = render(<UsageSection {...propsFor(async () => ({ ok: false, code: 'gateway/internal' }))} />)
    await act(async () => { await Promise.resolve() })
    expect(screen.getByText('Usage data is unavailable')).toBeDefined()
    expect(screen.getByText('gateway/internal')).toBeDefined()
  })

  it('refetches on the refresh affordance', async () => {
    let loads = 0
    const screen = render(<UsageSection {...propsFor(async () => {
      loads += 1
      return { ok: true as const, snapshot: snapshotOf({}) }
    })} />)
    await act(async () => { await Promise.resolve() })
    expect(loads).toBe(1)
    await act(async () => { screen.getByText('Refresh').click() })
    expect(loads).toBe(2)
  })

  it('keeps the loading copy while the first fetch is in flight', async () => {
    let resolveLoad: ((outcome: UsageLoad) => void) | undefined
    const screen = render(<UsageSection {...propsFor(() => new Promise<UsageLoad>((resolve) => { resolveLoad = resolve }))} />)
    expect(screen.getByText('No token usage recorded yet.')).toBeDefined()
    await act(async () => {
      resolveLoad?.({ ok: true, snapshot: snapshotOf({}) })
      await Promise.resolve()
    })
    expect(screen.getByText('deepseek-official/deepseek-v4-flash')).toBeDefined()
  })

  it('shows an empty ledger without trend or routes', async () => {
    const emptyTotals = {
      requests: 0, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, totalTokens: 0, byModel: [], byDay: [],
    }
    const screen = render(<UsageSection {...propsFor(async () => ({ ok: true as const, snapshot: snapshotOf(emptyTotals) }))} />)
    await act(async () => { await Promise.resolve() })
    expect(screen.getByText('Not enough history for a trend yet.')).toBeDefined()
    expect(screen.getByText('No routes recorded.')).toBeDefined()
  })
})
