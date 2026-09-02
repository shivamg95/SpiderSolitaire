function isInstalledDisplayMode(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return (
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  )
}

/**
 * Best-effort immersive fullscreen so Android hides the system navigation bar.
 * iOS PWAs ignore this API; home-screen meta tags cover Safari chrome there.
 */
export async function enterImmersive(): Promise<void> {
  if (typeof document === 'undefined') return
  if (document.fullscreenElement) return
  const root = document.documentElement
  if (typeof root.requestFullscreen !== 'function') return
  try {
    await root.requestFullscreen({ navigationUI: 'hide' })
  } catch {
    // Browsers often require a user gesture, and some platforms reject entirely.
  }
}

/** Try on installed-PWA launch, on tab-visible, and on the next input if blocked. */
export function startImmersiveLock(): () => void {
  const tryEnter = () => {
    void enterImmersive()
  }

  if (isInstalledDisplayMode()) tryEnter()

  const onVisible = () => {
    if (document.visibilityState === 'visible' && isInstalledDisplayMode()) {
      tryEnter()
    }
  }

  window.addEventListener('pointerdown', tryEnter, true)
  window.addEventListener('keydown', tryEnter, true)
  document.addEventListener('visibilitychange', onVisible)

  return () => {
    window.removeEventListener('pointerdown', tryEnter, true)
    window.removeEventListener('keydown', tryEnter, true)
    document.removeEventListener('visibilitychange', onVisible)
  }
}
