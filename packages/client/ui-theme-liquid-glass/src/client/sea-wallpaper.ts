/**
 * Sea wallpaper: mounts the bundled @xietuier/matrix-rain sea background
 * (flowing color bands, dark palette) as the fixed bottom layer while the
 * Liquid Glass theme is active, and destroys it on any other theme.
 *
 * The IIFE is imported as a string and injected through a script tag so the
 * global is defined exactly once per page.
 */
import seaBackgroundScript from './sea-background-script.ts'
import type { SeaTheme } from '../liquid-glass-settings.ts'

const WALLPAPER_SELECTOR = '[data-dsg-sea-wallpaper]'

/** Whether the sea script has already been injected on this page. */
let scriptInjected = false

/** The mounted background handle (create + destroy + live setters). */
interface SeaInstance {
  destroy: () => void
  setTheme?: (theme: string) => void
  setSpeed?: (speed: number) => void
}

let instance: SeaInstance | undefined

/** The sea global the injected IIFE defines. */
interface SeaGlobal {
  MatrixRainSea?: {
    createSeaBackground: (options: Record<string, unknown>) => SeaInstance
  }
}

/**
 * Mount the sea wallpaper as the bottom layer of the document.
 * Idempotent: repeated calls while mounted are no-ops.
 *
 * @param params - the sea palette and flow speed.
 */
export function mountSeaWallpaper(params: { seaTheme: SeaTheme; speed: number }): void {
  if (typeof document === 'undefined') return
  if (document.querySelector(WALLPAPER_SELECTOR) !== null) return

  if (!scriptInjected) {
    const script = document.createElement('script')
    script.textContent = seaBackgroundScript
    document.head.appendChild(script)
    scriptInjected = true
  }

  const layer = document.createElement('div')
  layer.setAttribute('data-dsg-sea-wallpaper', '')
  document.body.prepend(layer)

  const globalApi = (window as unknown as SeaGlobal).MatrixRainSea
  if (globalApi?.createSeaBackground === undefined) return
  instance = globalApi.createSeaBackground({
    container: layer,
    theme: params.seaTheme,
    speed: params.speed,
    colorWave: true,
    opacity: 1,
  })
}

/** Update the live sea instance (palette with built-in fade, flow speed). */
export function updateSeaWallpaper(params: { seaTheme: SeaTheme; speed: number }): void {
  if (instance === undefined) return
  instance.setTheme?.(params.seaTheme)
  instance.setSpeed?.(params.speed)
}

/** Unmount the sea wallpaper and stop its animation. Idempotent. */
export function unmountSeaWallpaper(): void {
  if (typeof document === 'undefined') return
  document.querySelector(WALLPAPER_SELECTOR)?.remove()
  instance?.destroy()
  instance = undefined
}
