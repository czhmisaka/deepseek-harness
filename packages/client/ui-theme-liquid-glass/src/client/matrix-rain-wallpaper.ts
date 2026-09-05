/**
 * Matrix rain wallpaper: mounts the bundled @xietuier/matrix-rain IIFE
 * (MIT, (c) czhmisaka) as a fixed bottom-layer canvas while the Liquid Glass
 * theme is active, and tears it down on any other theme.
 *
 * The IIFE is imported as a raw string and injected through a script tag so
 * the custom element registration happens exactly once per page.
 */
import matrixRainScript from './matrix-rain-script.ts'

const WALLPAPER_SELECTOR = '[data-dsg-matrix-rain-wallpaper]'

/** Whether the custom element has already been registered on this page. */
let scriptInjected = false

/**
 * Mount the matrix rain wallpaper as the bottom layer of the document.
 * Idempotent: repeated calls while mounted are no-ops.
 * @param themeName - the matrix-rain palette (e.g. 'silicon-valley').
 */
export function mountMatrixRain(themeName: string): void {
  if (typeof document === 'undefined') return
  if (document.querySelector(WALLPAPER_SELECTOR) !== null) return

  if (!scriptInjected && !customElements.get('matrix-rain')) {
    const script = document.createElement('script')
    script.textContent = matrixRainScript
    document.head.appendChild(script)
    scriptInjected = true
  }

  const layer = document.createElement('div')
  layer.setAttribute('data-dsg-matrix-rain-wallpaper', '')
  const rain = document.createElement('matrix-rain')
  rain.setAttribute('theme', themeName)
  rain.setAttribute('font-size', '11')
  rain.setAttribute('render-scale', '0.8')
  layer.appendChild(rain)
  document.body.prepend(layer)
}

/** Unmount the matrix rain wallpaper and stop its animation. Idempotent. */
export function unmountMatrixRain(): void {
  if (typeof document === 'undefined') return
  document.querySelector(WALLPAPER_SELECTOR)?.remove()
}
