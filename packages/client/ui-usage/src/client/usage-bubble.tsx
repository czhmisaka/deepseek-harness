/**
 * Usage bubble: a root-scoped shell overlay showing the deployment's compact
 * total token count across every session. Click expands a small panel with
 * the headline figures; the fetch runs on mount, on expand, and on a slow
 * timer (the ledger moves on every model call - a live counter would
 * re-render on unrelated traffic).
 *
 * @module @deepseek-ai/dsh-client-ui-usage/usage-bubble
 */

import { useCallback, useEffect, useState } from 'react'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { UsageLedgerSnapshot } from '@deepseek-ai/dsh-api-remotes/client'
import { formatCompactCount } from './shaping.ts'
import type { UsageLoad } from './usage-section.tsx'
import css from './UsageBubble.module.css'

/** Registration-side business face (shared with the settings section). */
export interface UsageBubbleInjected {
  /** Fetch one fresh totals snapshot; never rejects. */
  load: () => Promise<UsageLoad>
}

/** Props the renderer binds for the bubble. */
export type UsageBubbleProps =
  PropsRuntime<'shell.overlay'>
  & PropsLocale<'usage'>
  & InjectFace<UsageBubbleInjected>

/** Auto-refresh cadence while the bubble is mounted. */
const REFRESH_INTERVAL_MS = 60_000

/** Shape state of the bubble's data. */
type BubbleState =
  | { readonly phase: 'loading' }
  | { readonly phase: 'failed'; readonly code: string; readonly detail: string }
  | { readonly phase: 'ready'; readonly snapshot: UsageLedgerSnapshot }

/** Render the usage bubble with its expandable summary panel. */
export function UsageBubble({ t, load }: UsageBubbleProps) {
  const [state, setState] = useState<BubbleState>({ phase: 'loading' })
  const [open, setOpen] = useState(false)

  const refresh = useCallback(() => {
    void load().then((outcome) => {
      if (outcome.ok) setState({ phase: 'ready', snapshot: outcome.snapshot })
      else setState({ phase: 'failed', code: outcome.code, detail: outcome.detail })
    })
  }, [load, t])

  useEffect(() => {
    refresh()
    const timer = setInterval(refresh, REFRESH_INTERVAL_MS)
    return () => { clearInterval(timer) }
  }, [refresh])

  const total = state.phase === 'ready'
    ? formatCompactCount(state.snapshot.totals.totalTokens)
    : null

  return (
    <div className={css.bubbleLayer}>
      {open && state.phase === 'ready' && (
        <div className={css.panel} role='dialog' aria-label={t('title')}>
          <div className={css.panelHead}>
            <span className={css.panelTitle}>{t('title')}</span>
            <button type='button' className={css.close} onClick={() => setOpen(false)} aria-label={t('close')}>{t('closeMark')}</button>
          </div>
          <div className={css.panelRow}>
            <span className={css.panelLabel}>{t('totalLabel')}</span>
            <span className={css.panelValue}>{formatCompactCount(state.snapshot.totals.totalTokens)}</span>
          </div>
          <div className={css.panelRow}>
            <span className={css.panelLabel}>{t('requestsLabel')}</span>
            <span className={css.panelValue}>{formatCompactCount(state.snapshot.totals.requests)}</span>
          </div>
          <div className={css.panelRow}>
            <span className={css.panelLabel}>{t('todayHeading')}</span>
            <span className={css.panelValue}>{todayTokens(state.snapshot.totals.byDay)}</span>
          </div>
          <p className={css.panelHint}>{t('ledgerPathLabel')}: {state.snapshot.ledgerDisplay}</p>
        </div>
      )}
      <button
        type='button'
        className={css.bubble}
        data-failed={state.phase === 'failed' ? 'true' : undefined}
        onClick={() => { setOpen(previous => !previous); if (state.phase !== 'loading') refresh() }}
        aria-label={t('bubbleAria')}
        title={t('bubbleAria')}
      >
        {total === null
          ? <span className={css.bubbleMark}>{t('bubbleMark')}</span>
          : (
            <span className={css.bubbleBody}>
              <span className={css.bubbleValue}>{total}</span>
              <span className={css.bubbleUnit}>{t('bubbleTotal')}</span>
            </span>
          )}
      </button>
    </div>
  )
}

/** Today's (UTC) compact total from the newest day entry, or an em dash. */
function todayTokens(byDay: readonly { day: string; totalTokens: number }[]): string {
  const today = new Date().toISOString().slice(0, 10)
  const entry = [...byDay].reverse().find(row => row.day <= today)
  return entry === undefined ? '-' : formatCompactCount(entry.totalTokens)
}
