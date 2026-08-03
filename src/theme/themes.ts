export type ThemeId = 'midnight' | 'aurora' | 'ember' | 'mono'

export const THEMES: readonly ThemeId[] = ['midnight', 'aurora', 'ember', 'mono']

export const DEFAULT_THEME: ThemeId = 'midnight'

export function isThemeId(value: string): value is ThemeId {
  return (THEMES as readonly string[]).includes(value)
}

export function applyTheme(
  theme: ThemeId,
  root: HTMLElement = document.documentElement,
): void {
  root.setAttribute('data-theme', theme)
}
