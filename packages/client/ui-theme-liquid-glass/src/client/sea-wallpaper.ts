/**
 * Sea wallpaper: mounts the bundled @xietuier/matrix-rain sea background
 * (flowing color bands, dark palette) as the fixed bottom layer while the
 * Liquid Glass theme is active, and destroys it on any other theme.
 *
 * The IIFE is imported as a string and injected through a script tag so the
 * global is defined exactly once per page.
 */
import seaBackgroundScript from './sea-background-script.ts'

const WALLPAPER_SELECTOR = '[data-dsg-sea-wallpaper]'

/** Whether the sea script has already been injected on this page. */
let scriptInjected = false

/** The mounted background handle (create + destroy live on the global). */
let instance: { destroy: () => void } | undefined

/**
 * Mount the sea wallpaper as the bottom layer of the document.
 * Idempotent: repeated calls while mounted are no-ops.
 */
export function mountSeaWallpaper(): void {
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

  type SeaGlobal = { MatrixRainSea?: { createSeaBackground: (options: Record<string, unknown>) => { destroy: () => void } } }
  const globalApi = (window as unknown as SeaGlobal).MatrixRainSea
  if (globalApi?.createSeaBackground === undefined) return
  instance = globalApi.createSeaBackground({
    container: layer,
    theme: 'dark',
    speed: 1.3,
    colorWave: true,
    opacity: 1,
  })
}

/** Unmount the sea wallpaper and stop its animation. Idempotent. */
export function unmountSeaWallpaper(): void {
  if (typeof document === 'undefined') return
  document.querySelector(WALLPAPER_SELECTOR)?.remove()
  instance?.destroy()
  instance = undefined
}
