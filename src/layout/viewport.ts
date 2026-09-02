import type { ViewportSize } from './computeLayout'

export function parseCssPx(value: string): number {
  const n = Number.parseFloat(value.trim())
  return Number.isFinite(n) ? n : 0
}

export function readSafeInsets(
  style: Pick<CSSStyleDeclaration, 'getPropertyValue'>,
): Pick<ViewportSize, 'safeTop' | 'safeRight' | 'safeBottom' | 'safeLeft'> {
  return {
    safeTop: parseCssPx(style.getPropertyValue('--safe-top')),
    safeRight: parseCssPx(style.getPropertyValue('--safe-right')),
    safeBottom: parseCssPx(style.getPropertyValue('--safe-bottom')),
    safeLeft: parseCssPx(style.getPropertyValue('--safe-left')),
  }
}

export function readViewportSize(
  win: Pick<Window, 'innerWidth' | 'innerHeight'> = window,
  style: Pick<CSSStyleDeclaration, 'getPropertyValue'> = getComputedStyle(
    document.documentElement,
  ),
): ViewportSize {
  return {
    width: win.innerWidth,
    height: win.innerHeight,
    ...readSafeInsets(style),
  }
}
