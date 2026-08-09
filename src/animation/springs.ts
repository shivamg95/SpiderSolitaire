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

/** Nominal flight time of a card move, in ms. Arc and stagger are tuned to it. */
export const MOVE_MS = 420
/** Height of the mid-flight hop, as a fraction of card height. */
export const MOVE_ARC_RATIO = 0.26
/** Delay between consecutive cards of a moving run, in ms. */
export const RUN_STAGGER_MS = 45
/** Cap so long runs still land promptly. */
export const RUN_STAGGER_MAX_MS = 220
/** Duration of the face-down reveal flip, in ms. */
export const FLIP_MS = 420
/** Hint ghosts travel deliberately slower than real cards. */
export const HINT_FLIGHT_MS = 850

export const springs = {
  snap: {
    type: 'spring',
    stiffness: 260,
    damping: 26,
    mass: 1,
  } satisfies SpringPreset,
  deal: {
    type: 'spring',
    stiffness: 280,
    damping: 26,
    mass: 1,
  } satisfies SpringPreset,
  /** Vertical hop that turns a straight move into an arc. */
  arc: {
    type: 'tween',
    duration: MOVE_MS / 1000,
    ease: 'easeInOut',
  } satisfies TweenPreset,
  hintFlight: {
    type: 'tween',
    duration: HINT_FLIGHT_MS / 1000,
    ease: 'easeInOut',
  } satisfies TweenPreset,
  flip: {
    type: 'tween',
    duration: FLIP_MS / 1000,
    ease: 'easeInOut',
  } satisfies TweenPreset,
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
