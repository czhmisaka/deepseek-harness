/**
 * Liquid Glass parameter store: a mirror of the settings scope's resolved
 * section. The plugin's apply-world change listener is the only authoritative
 * writer (it owns the scope subscription and the durable writes); the section
 * component reads via props.useStore.
 */
import { defineStore, type EngineStoreHandle } from '@deepseek-ai/dsh-client-store'
import type { LiquidGlassSettings } from '../liquid-glass-settings.ts'

/** Store state mirrored from the settings scope. */
export interface LiquidGlassState {
  /** Scope readiness mirrored (loading until the first accepted section). */
  status: 'loading' | 'ready' | 'unavailable'
  /** The resolved parameter values; undefined before the first acceptance. */
  value: LiquidGlassSettings | undefined
  /** Scope revision; -1 until the first sync so revision 0 lands as a change. */
  revision: number
}

/** Declared action shape giving the exported factory a stable return type. */
type LiquidGlassActions = {
  sync: (draft: LiquidGlassState, status: 'loading' | 'ready' | 'unavailable', value: LiquidGlassSettings | undefined, revision: number) => void
}

/**
 * Declares the parameter state and read surface.
 * @returns the store handle.
 */
export function createLiquidGlassStore(): EngineStoreHandle<LiquidGlassState, LiquidGlassActions> {
  return defineStore({
    init: (): LiquidGlassState => ({ status: 'loading', value: undefined, revision: -1 }),
    actions: {
      sync: (
        draft: LiquidGlassState,
        status: 'loading' | 'ready' | 'unavailable',
        value: LiquidGlassSettings | undefined,
        revision: number,
      ) => {
        if (revision <= draft.revision) return
        draft.status = status
        draft.value = value
        draft.revision = revision
      },
    },
  })
}
