/** Liquid Glass settings section: enable toggle plus live parameter controls. */
import type { InjectFace, PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots'
import type { createLiquidGlassStore } from './settings-store.ts'
import css from './LiquidGlassSection.module.css'

/** Injected business face: currently empty (writes ride the store actions). */
export interface LiquidGlassSectionInjected {
  /** Write one parameter durably (the apply chain re-applies it). */
  set: (field: string, value: unknown) => void
}

/** Full component props: runtime share + store share + locale seat + injected face. */
export type LiquidGlassSectionProps =
  PropsRuntime<'settings.section'>
  & PropsStore<ReturnType<typeof createLiquidGlassStore>>
  & PropsLocale<'liquid-glass'>
  & InjectFace<LiquidGlassSectionInjected>

/** Render the Liquid Glass page. */
export function LiquidGlassSection({ t, useStore, set }: LiquidGlassSectionProps) {
  const { status, value } = useStore(s => s)

  return (
    <div className={css.section}>
      <h2 className={css.heading}>{t('page.title')}</h2>
      <p className={css.intro}>{t('page.intro')}</p>
      {(status !== 'ready' || value === undefined) && <p className={css.muted}>{t('enable.off')}</p>}
      {status === 'ready' && value !== undefined && (
        <>
          <section className={css.card} aria-label={t('enable.title')}>
            <div className={css.rowHead}>
              <div>
                <div className={css.rowTitle}>{t('enable.title')}</div>
                <div className={css.rowHint}>{t('enable.description')}</div>
              </div>
              <button
                type='button'
                className={css.toggle}
                aria-pressed={value.enabled}
                onClick={() => { set('enabled', !value.enabled) }}
              >
                {value.enabled ? t('enable.on') : t('enable.off')}
              </button>
            </div>
          </section>
          <section className={css.card} aria-label={t('seaTheme.title')}>
            <div className={css.rowTitle}>{t('seaTheme.title')}</div>
            <div className={css.optionRow}>
              {(['dark', 'light'] as const).map(option => (
                <button
                  key={option}
                  type='button'
                  className={css.option}
                  aria-pressed={value.seaTheme === option}
                  onClick={() => { set('seaTheme', option) }}
                >
                  {t(option === 'dark' ? 'seaTheme.dark' : 'seaTheme.light')}
                </button>
              ))}
            </div>
          </section>
          <section className={css.card} aria-label={t('speed.title')}>
            <div className={css.rowTitle}>{t('speed.title')}</div>
            <input
              className={css.slider}
              type='range'
              min={0.2}
              max={3}
              step={0.1}
              value={value.speed}
              onChange={(event) => { set('speed', Number(event.target.value)) }}
            />
          </section>
          <section className={css.card} aria-label={t('colorWave.title')}>
            <div className={css.rowHead}>
              <div className={css.rowTitle}>{t('colorWave.title')}</div>
              <button
                type='button'
                className={css.toggle}
                aria-pressed={value.colorWave}
                onClick={() => { set('colorWave', !value.colorWave) }}
              >
                {value.colorWave ? t('enable.on') : t('enable.off')}
              </button>
            </div>
          </section>
          <section className={css.card} aria-label={t('opacity.title')}>
            <div className={css.rowTitle}>{t('opacity.title')}</div>
            <input
              className={css.slider}
              type='range'
              min={0.3}
              max={1}
              step={0.05}
              value={value.opacity}
              onChange={(event) => { set('opacity', Number(event.target.value)) }}
            />
          </section>
          <section className={css.card} aria-label={t('blur.title')}>
            <div className={css.rowTitle}>{t('blur.title')}</div>
            <input
              className={css.slider}
              type='range'
              min={0}
              max={40}
              step={1}
              value={value.blur}
              onChange={(event) => { set('blur', Number(event.target.value)) }}
            />
            <p className={css.hint}>{t('blur.hint')}</p>
          </section>
        </>
      )}
    </div>
  )
}
