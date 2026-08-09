export type ThemeId = 'midnight' | 'aurora' | 'ember' | 'mono'

export type AppearanceId = 'system' | 'light' | 'dark'

export type ResolvedAppearance = 'light' | 'dark'

export const THEMES: readonly ThemeId[] = ['midnight', 'aurora', 'ember', 'mono']

export const APPEARANCES: readonly AppearanceId[] = ['system', 'light', 'dark']

export const DEFAULT_THEME: ThemeId = 'midnight'

export const DEFAULT_APPEARANCE: AppearanceId = 'system'

export function isThemeId(value: string): value is ThemeId {
  return (THEMES as readonly string[]).includes(value)
}

export function isAppearanceId(value: string): value is AppearanceId {
  return (APPEARANCES as readonly string[]).includes(value)
}

export function resolveAppearance(
  appearance: AppearanceId,
  prefersLight = false,
): ResolvedAppearance {
  if (appearance === 'light') return 'light'
  if (appearance === 'dark') return 'dark'
  return prefersLight ? 'light' : 'dark'
}

export function systemPrefersLight(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia('(prefers-color-scheme: light)').matches
}

export function applyTheme(
  theme: ThemeId,
  root: HTMLElement = document.documentElement,
): void {
  root.setAttribute('data-theme', theme)
}

export function applyAppearance(
  appearance: AppearanceId,
  root: HTMLElement = document.documentElement,
): ResolvedAppearance {
  const resolved = resolveAppearance(appearance, systemPrefersLight())
  root.setAttribute('data-appearance', resolved)
  root.style.colorScheme = resolved
  return resolved
}

/** Subscribe to OS scheme changes while appearance is `system`. Returns unsubscribe. */
export function watchSystemAppearance(
  onChange: (resolved: ResolvedAppearance) => void,
): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => undefined
  }
  const mq = window.matchMedia('(prefers-color-scheme: light)')
  const handler = () => {
    onChange(mq.matches ? 'light' : 'dark')
  }
  mq.addEventListener('change', handler)
  return () => {
    mq.removeEventListener('change', handler)
  }
}
