export interface SpringPreset {
  readonly type: 'spring'
  readonly stiffness: number
  readonly damping: number
  readonly mass?: number
}

export interface TweenPreset {
  readonly type: 'tween'
  readonly duration: number
  readonly ease: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut'
}

export type MotionTransition = SpringPreset | TweenPreset

export const springs = {
  snap: {
    type: 'spring',
    stiffness: 520,
    damping: 32,
    mass: 0.85,
  } satisfies SpringPreset,
  deal: {
    type: 'spring',
    stiffness: 280,
    damping: 26,
    mass: 1,
  } satisfies SpringPreset,
  flip: {
    type: 'spring',
    stiffness: 360,
    damping: 28,
    mass: 0.9,
  } satisfies SpringPreset,
  panel: {
    type: 'spring',
    stiffness: 420,
    damping: 34,
    mass: 0.8,
  } satisfies SpringPreset,
  celebrate: {
    type: 'spring',
    stiffness: 200,
    damping: 18,
    mass: 1.1,
  } satisfies SpringPreset,
} as const

export const lowMotionTween: TweenPreset = {
  type: 'tween',
  duration: 0.08,
  ease: 'easeOut',
}

export function readSpringFromCss(
  name: 'stiffness' | 'damping',
  fallback: number,
): number {
  if (typeof document === 'undefined') return fallback
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(name === 'stiffness' ? '--spring-stiffness' : '--spring-damping')
    .trim()
  const n = Number(raw)
  return Number.isFinite(n) ? n : fallback
}
