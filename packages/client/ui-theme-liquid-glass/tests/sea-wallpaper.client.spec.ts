// @vitest-environment jsdom
/** Sea wallpaper mount/unmount behavior (the sea IIFE is mocked out). */

import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../src/client/sea-background-script.ts', () => ({ default: 'window.__SEA_TEST__ = true' }))

const { mountSeaWallpaper, unmountSeaWallpaper } = await import('../src/client/sea-wallpaper.ts')

afterEach(() => {
  unmountSeaWallpaper()
  vi.restoreAllMocks()
  delete (window as unknown as Record<string, unknown>).__SEA_TEST__
  delete (window as unknown as Record<string, unknown>).MatrixRainSea
})

describe('sea wallpaper', () => {
  it('injects the sea script once and creates the background in a holder layer', () => {
    const create = vi.fn(() => ({ destroy: () => {} }))
    ;(window as unknown as Record<string, unknown>).MatrixRainSea = { createSeaBackground: create }
    mountSeaWallpaper({ seaTheme: 'dark', speed: 1.3 })
    const layer = document.querySelector('[data-dsg-sea-wallpaper]')
    expect(layer).not.toBeNull()
    expect(document.querySelectorAll('script').length).toBe(1)
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ theme: 'dark', speed: 1.3, colorWave: true }))
    // Idempotent: a second mount adds nothing.
    mountSeaWallpaper({ seaTheme: 'dark', speed: 1.3 })
    expect(document.querySelectorAll('[data-dsg-sea-wallpaper]')).toHaveLength(1)
    expect(document.querySelectorAll('script')).toHaveLength(1)
  })

  it('destroys the instance and removes the layer on unmount', () => {
    const destroy = vi.fn()
    ;(window as unknown as Record<string, unknown>).MatrixRainSea = { createSeaBackground: () => ({ destroy }) }
    mountSeaWallpaper({ seaTheme: 'dark', speed: 1.3 })
    unmountSeaWallpaper()
    expect(destroy).toHaveBeenCalledOnce()
    expect(document.querySelector('[data-dsg-sea-wallpaper]')).toBeNull()
    // Unmount is idempotent.
    expect(() => { unmountSeaWallpaper() }).not.toThrow()
  })

  it('leaves the layer mounted without a sea global (defensive)', () => {
    mountSeaWallpaper({ seaTheme: 'dark', speed: 1.3 })
    expect(document.querySelector('[data-dsg-sea-wallpaper]')).not.toBeNull()
  })
})
