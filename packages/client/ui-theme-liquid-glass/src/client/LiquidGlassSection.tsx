/** Liquid Glass settings section: enable toggle plus live parameter controls. */
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { LiquidGlassSettings } from '../liquid-glass-settings.ts'
import css from './LiquidGlassSection.module.css'

/** Injected business face: the scope read/write the apply chain shares. */
export interface LiquidGlassSectionInjected {
  /** The bound settings scope (value + revision flow through the caller's store). */
  scope: {
    getSnapshot: () => { status: string; value: LiquidGlassSettings | undefined }
  }
  /** Write one parameter; the scope subscription re-applies it. */
  set: (field: string, value: unknown) => void
}

/** Full component props: runtime share + locale seat + injected face. */
export type LiquidGlassSectionProps =
  PropsRuntime<'settings.section'>
  & PropsLocale<'liquid-glass'>
  & InjectFace<LiquidGlassSectionInjected>

/** The parameter rows' shared metadata (id → slider bounds). */
const SLIDERS: readonly { id: 'speed' | 'opacity' | 'blur'; min: number; max: number; step: number }[] = [
  { id: 'speed', min: 0.2, max: 3, step: 0.1 },
  { id: 'opacity', min: 0.3, max: 1, step: 0.05 },
  { id: 'blur', min: 0, max: 40, step: 1 },
]

/** Render the Liquid Glass page. */
export function LiquidGlassSection({ t, scope, set }: LiquidGlassSectionProps) {
  const snapshot = scope.getSnapshot()
  const value = snapshot.value
  const ready = snapshot.status === 'ready' && value !== undefined

  return (
    <div className={css.section}>
      <h2 className={css.heading}>{t('page.title')}</h2>
      <p className={css.intro}>{t('page.intro')}</p>
      {!ready && <p className={css.muted}>{t('enable.off')}</p>}
      {ready && value !== undefined && (
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
              min={SLIDERS[0]?.min}
              max={SLIDERS[0]?.max}
              step={SLIDERS[0]?.step}
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
              min={SLIDERS[1]?.min}
              max={SLIDERS[1]?.max}
              step={SLIDERS[1]?.step}
              value={value.opacity}
              onChange={(event) => { set('opacity', Number(event.target.value)) }}
            />
          </section>
          <section className={css.card} aria-label={t('blur.title')}>
            <div className={css.rowTitle}>{t('blur.title')}</div>
            <input
              className={css.slider}
              type='range'
              min={SLIDERS[2]?.min}
              max={SLIDERS[2]?.max}
              step={SLIDERS[2]?.step}
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
