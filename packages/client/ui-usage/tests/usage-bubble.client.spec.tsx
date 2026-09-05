// @vitest-environment jsdom
/** Component behavior of the usage bubble overlay. */

import { act } from 'react'
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { UsageBubble } from '../src/client/usage-bubble.tsx'
import type { UsageLoad } from '../src/client/usage-section.tsx'
import type { UsageLedgerSnapshot, UsageLedgerTotals } from '@deepseek-ai/dsh-api-remotes/client'

/** The stub translate the spec renders with. */
function stubT(key: string): string {
  const table: Record<string, string> = {
    bubbleAria: 'Token usage bubble',
    bubbleTotal: 'Total tokens',
    close: 'Close',
    closeMark: '\u00d7',
    bubbleMark: '\u03a3',
    title: 'Token usage',
    totalLabel: 'Total',
    requestsLabel: 'Requests',
    todayHeading: 'Today (UTC)',
    ledgerPathLabel: 'Ledger file',
  }
  return table[key] ?? key
}

/** A ready snapshot fixture. */
function snapshotOf(): UsageLedgerSnapshot {
  const totals: UsageLedgerTotals = {
    requests: 3,
    inputTokens: 100,
    outputTokens: 200,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    totalTokens: 4_200_000,
    byModel: [],
    byDay: [{ day: '2026-09-05', requests: 1, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, totalTokens: 77_000 }],
    lastRecordTime: 1000,
  }
  return { totals, ledgerDisplay: '~/.dsh/usage/usage.jsonl' }
}

/** Renderer props for one load stub. */
function propsFor(load: () => Promise<UsageLoad>) {
  return { t: stubT, load, close: () => {} } as unknown as Parameters<typeof UsageBubble>[0]
}

afterEach(cleanup)

describe('usage bubble', () => {
  it('shows the compact total while collapsed and expands on click', async () => {
    const screen = render(<UsageBubble {...propsFor(async () => ({ ok: true as const, snapshot: snapshotOf() }))} />)
    await act(async () => { await Promise.resolve() })
    expect(screen.getByText('4.2M')).toBeDefined()
    expect(screen.queryByRole('dialog')).toBeNull()
    await act(async () => { screen.getByRole('button', { name: 'Token usage bubble' }).click() })
    expect(screen.getByRole('dialog')).toBeDefined()
    expect(screen.getByText('Ledger file: ~/.dsh/usage/usage.jsonl')).toBeDefined()
  })

  it('shows the sigma mark and a failed state without a panel', async () => {
    const screen = render(<UsageBubble {...propsFor(async () => ({ ok: false as const, code: 'gateway/internal', detail: 'HTTP 404' }))} />)
    await act(async () => { await Promise.resolve() })
    expect(screen.getByText('\u03a3')).toBeDefined()
    await act(async () => { screen.getByRole('button', { name: 'Token usage bubble' }).click() })
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
