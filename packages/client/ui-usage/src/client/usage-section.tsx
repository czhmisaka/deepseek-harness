/** Usage settings section: the whole-deployment token dashboard. */

import { useCallback, useEffect, useState } from 'react'
import type {
  InjectFace, PropsLocale, PropsRuntime,
} from '@deepseek-ai/dsh-client-ui-slots'
import type { UsageLedgerSnapshot } from '@deepseek-ai/dsh-api-remotes/client'
import type { UsageDashboardView } from './shaping.ts'
import { shapeDashboard } from './shaping.ts'
import type { UsageLocaleKey } from './locales.ts'
import css from './UsageSection.module.css'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** This feature's settings-section copy (the usage dashboard). */
    usage: UsageLocaleKey
  }
}

/** One usage fetch outcome the section's inject face resolves. */
export type UsageLoad =
  | { readonly ok: true; readonly snapshot: UsageLedgerSnapshot }
  | { readonly ok: false; readonly code: string; readonly detail: string }

/** Registration-side business face for the section. */
export interface UsageSectionInjected {
  /** Fetch one fresh totals snapshot; never rejects. */
  load: () => Promise<UsageLoad>
}

/** Props the renderer binds for the section. */
export type UsageSectionProps =
  PropsRuntime<'settings.section'>
  & PropsLocale<'usage'>
  & InjectFace<UsageSectionInjected>

/** Shape state of the async dashboard load. */
type LoadState =
  | { readonly phase: 'loading' }
  | { readonly phase: 'failed'; readonly code: string; readonly detail: string }
  | { readonly phase: 'ready'; readonly view: UsageDashboardView }

/** Render one Usage page: totals grid, today, seven-day trend, and routes. */
export function UsageSection({ t, load }: UsageSectionProps) {
  const [state, setState] = useState<LoadState>({ phase: 'loading' })

  const refresh = useCallback(() => {
    setState({ phase: 'loading' })
    void load().then((outcome) => {
      if (outcome.ok) {
        setState({
          phase: 'ready',
          view: shapeDashboard(outcome.snapshot, {
            requests: t('requestsLabel'),
            input: t('inputLabel'),
            cacheRead: t('cacheReadLabel'),
            cacheWrite: t('cacheWriteLabel'),
            output: t('outputLabel'),
            total: t('totalLabel'),
          }),
        })
      } else {
        setState({ phase: 'failed', code: outcome.code, detail: outcome.detail })
      }
    })
  }, [load, t])

  useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <div className={css.section}>
      <div className={css.headerRow}>
        <h2 className={css.heading}>{t('title')}</h2>
        <button type='button' className={css.refresh} onClick={refresh}>{t('refresh')}</button>
      </div>
      <p className={css.intro}>{t('intro')}</p>
      {state.phase === 'loading' && <p className={css.muted}>{t('empty')}</p>}
      {state.phase === 'failed' && (
        <p className={css.error}>
          {t('loadFailed')}
          {' '}
          <span className={css.code}>{state.code}</span>
          <span className={css.code}>{state.detail}</span>
        </p>
      )}
      {state.phase === 'ready' && <Dashboard t={t} view={state.view} />}
    </div>
  )
}

/** Dashboard body once a snapshot is ready. */
function Dashboard({ t, view }: { t: (key: UsageLocaleKey) => string; view: UsageDashboardView }) {
  return (
    <>
      <section className={css.card} aria-label={t('totalsHeading')}>
        <h3 className={css.cardHeading}>{t('totalsHeading')}</h3>
        <div className={css.figures}>
          {view.figures.map(figure => (
            <div key={figure.id} className={css.figure} data-figure={figure.id}>
              <span className={css.figureLabel}>{figure.label}</span>
              <span className={css.figureValue}>{figure.value}</span>
            </div>
          ))}
        </div>
        <p className={css.ledgerPath}>
          {t('ledgerPathLabel')}
          {': '}
          {view.ledgerPath}
        </p>
      </section>
      <section className={css.card} aria-label={t('todayHeading')}>
        <h3 className={css.cardHeading}>{t('todayHeading')}</h3>
        {view.today === undefined
          ? <p className={css.muted}>{t('todayNone')}</p>
          : (
            <p className={css.todayLine}>
              <strong>{view.today.total}</strong>
              {' · '}
              {view.today.requests}
            </p>
          )}
      </section>
      <section className={css.card}>
        <h3 className={css.cardHeading}>{t('trendHeading')}</h3>
        {view.trend.length === 0
          ? <p className={css.muted}>{t('trendEmpty')}</p>
          : (
            <div className={css.trend}>
              {view.trend.map(bar => (
                <div key={bar.day} className={css.trendColumn}>
                  <span className={css.trendValue}>{view.trend.length > 1 || bar.active ? bar.display : ''}</span>
                  <div className={css.trendTrack}>
                    <span
                      className={css.trendBar}
                      data-active={bar.active ? 'true' : undefined}
                      style={{ width: String(bar.width) + '%' }}
                    />
                  </div>
                  <span className={css.trendDay}>{bar.label}</span>
                </div>
              ))}
            </div>
          )}
      </section>
      <section className={css.card}>
        <h3 className={css.cardHeading}>{t('routesHeading')}</h3>
        {view.routes.length === 0
          ? <p className={css.muted}>{t('routesEmpty')}</p>
          : (
            <table className={css.table}>
              <thead>
                <tr>
                  <th scope='col'>{t('routeNameColumn')}</th>
                  <th scope='col'>{t('routeRequestsColumn')}</th>
                  <th scope='col'>{t('routeTokensColumn')}</th>
                </tr>
              </thead>
              <tbody>
                {view.routes.map(row => (
                  <tr key={row.route}>
                    <td>{row.route}</td>
                    <td>{row.requests}</td>
                    <td>{row.tokens}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        {view.hiddenRoutes > 0 && <p className={css.more}>{t('moreRoutes').replace('{count}', String(view.hiddenRoutes))}</p>}
      </section>
    </>
  )
}
