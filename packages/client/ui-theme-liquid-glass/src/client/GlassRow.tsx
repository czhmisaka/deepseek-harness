/** Liquid Glass toggle row registered into the settings General section. */
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import css from './GlassRow.module.css'

/** Injected business face: the toggle write and the live state. */
export interface GlassRowInjected {
  /** Whether the liquid glass theme is currently active. */
  active: boolean
  /** Turn the liquid glass theme on (or back to the dark base). */
  toggle: () => void
}

/** Full component props: runtime share + locale seat + injected face. */
export type GlassRowComponentProps =
  PropsRuntime<'settings.general.item'> & PropsLocale<'liquidGlass'> & GlassRowInjected

/** Render the Liquid Glass toggle row. */
export function GlassRow({ t, active, toggle }: GlassRowComponentProps) {
  return (
    <div className={css.group}>
      <div className={css.title}>{t('row.title')}</div>
      <p className={css.description}>{t('row.description')}</p>
      <div className={css.rowFoot}>
        <button type='button' className={css.button} onClick={toggle}>
          {active ? t('row.disable') : t('row.enable')}
        </button>
        {active && <span className={css.state}>{t('row.enabledState')}</span>}
      </div>
    </div>
  )
}
