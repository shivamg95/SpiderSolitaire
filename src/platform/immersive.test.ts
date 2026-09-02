import { afterEach, describe, expect, it, vi } from 'vitest'
import { enterImmersive, startImmersiveLock } from './immersive'

function stubFullscreen(
  requestFullscreen: ReturnType<typeof vi.fn>,
  element: Element | null = null,
) {
  Object.defineProperty(document.documentElement, 'requestFullscreen', {
    configurable: true,
    writable: true,
    value: requestFullscreen,
  })
  Object.defineProperty(document, 'fullscreenElement', {
    configurable: true,
    get: () => element,
  })
}

function stubInstalled(installed: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: installed,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  })
}

describe('enterImmersive', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('requests fullscreen with the navigation UI hidden', async () => {
    const requestFullscreen = vi.fn().mockResolvedValue(undefined)
    stubFullscreen(requestFullscreen)
    await enterImmersive()
    expect(requestFullscreen).toHaveBeenCalledWith({ navigationUI: 'hide' })
  })

  it('does nothing when already fullscreen', async () => {
    const requestFullscreen = vi.fn()
    stubFullscreen(requestFullscreen, document.documentElement)
    await enterImmersive()
    expect(requestFullscreen).not.toHaveBeenCalled()
  })

  it('swallows a rejected request', async () => {
    const requestFullscreen = vi.fn().mockRejectedValue(new Error('gesture'))
    stubFullscreen(requestFullscreen)
    await expect(enterImmersive()).resolves.toBeUndefined()
  })
})

describe('startImmersiveLock', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('does not request on load in a normal browser tab', async () => {
    const requestFullscreen = vi.fn().mockResolvedValue(undefined)
    stubFullscreen(requestFullscreen)
    stubInstalled(false)
    const stop = startImmersiveLock()
    await Promise.resolve()
    expect(requestFullscreen).not.toHaveBeenCalled()
    stop()
  })

  it('requests on load when already running as an installed app', async () => {
    const requestFullscreen = vi.fn().mockResolvedValue(undefined)
    stubFullscreen(requestFullscreen)
    stubInstalled(true)
    const stop = startImmersiveLock()
    await Promise.resolve()
    expect(requestFullscreen).toHaveBeenCalledWith({ navigationUI: 'hide' })
    stop()
  })

  it('retries on pointerdown after the first request is blocked', async () => {
    const requestFullscreen = vi
      .fn()
      .mockRejectedValueOnce(new Error('gesture'))
      .mockResolvedValueOnce(undefined)
    stubFullscreen(requestFullscreen)
    stubInstalled(false)

    const stop = startImmersiveLock()
    await Promise.resolve()
    expect(requestFullscreen).not.toHaveBeenCalled()

    window.dispatchEvent(new Event('pointerdown'))
    await Promise.resolve()
    expect(requestFullscreen).toHaveBeenCalledTimes(1)
    stop()
  })

  it('retries when an installed app becomes visible again', async () => {
    const requestFullscreen = vi.fn().mockResolvedValue(undefined)
    stubFullscreen(requestFullscreen)
    stubInstalled(true)
    const stop = startImmersiveLock()
    await Promise.resolve()
    requestFullscreen.mockClear()

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    })
    document.dispatchEvent(new Event('visibilitychange'))
    await Promise.resolve()
    expect(requestFullscreen).toHaveBeenCalledTimes(1)
    stop()
  })
})
