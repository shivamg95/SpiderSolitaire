import type { GameState } from './types'
import { FOUNDATION_BONUS, INITIAL_SCORE } from './types'

export interface Clock {
  now(): number
}

export const systemClock: Clock = {
  now: () => Date.now(),
}

export type ScoringMode = 'standard' | 'vegas'

export interface StandardScoreInput {
  readonly mode: 'standard'
  readonly moveCount: number
  readonly undoCount: number
  readonly foundations: number
  readonly undoPenalty: boolean
}

export interface VegasScoreInput {
  readonly mode: 'vegas'
  readonly bankroll: number
  readonly foundations: number
  /** Elapsed visible play time in ms for this deal. */
  readonly elapsedMs: number
}

export type ScoreInput = StandardScoreInput | VegasScoreInput

/** Vegas time bonus tiers (house rule): +$50 per completed tier. */
export const VEGAS_TIME_TIERS_MS = [4 * 60_000, 6 * 60_000, 8 * 60_000] as const

export const VEGAS_BUY_IN = 500
export const VEGAS_FOUNDATION = 100
export const VEGAS_TIME_BONUS = 50

export function computeScore(input: ScoreInput): number {
  if (input.mode === 'standard') {
    const undoCost = input.undoPenalty ? input.undoCount : 0
    return (
      INITIAL_SCORE - input.moveCount - undoCost + input.foundations * FOUNDATION_BONUS
    )
  }
  const tiers = VEGAS_TIME_TIERS_MS.filter((t) => input.elapsedMs <= t).length
  return (
    input.bankroll -
    VEGAS_BUY_IN +
    input.foundations * VEGAS_FOUNDATION +
    tiers * VEGAS_TIME_BONUS
  )
}

export function scoreFromState(
  state: GameState,
  undoCount: number,
  undoPenalty: boolean,
): number {
  return computeScore({
    mode: 'standard',
    moveCount: state.moveCount,
    undoCount,
    foundations: state.foundations.length,
    undoPenalty,
  })
}

export interface TimerState {
  readonly accumulatedMs: number
  readonly runningSince: number | null
  readonly paused: boolean
}

export function createTimer(clock: Clock = systemClock): TimerState {
  return { accumulatedMs: 0, runningSince: clock.now(), paused: false }
}

export function pauseTimer(timer: TimerState, clock: Clock = systemClock): TimerState {
  if (timer.paused || timer.runningSince === null) {
    return { ...timer, paused: true, runningSince: null }
  }
  return {
    accumulatedMs: timer.accumulatedMs + (clock.now() - timer.runningSince),
    runningSince: null,
    paused: true,
  }
}

export function resumeTimer(timer: TimerState, clock: Clock = systemClock): TimerState {
  if (!timer.paused) return timer
  return { ...timer, paused: false, runningSince: clock.now() }
}

export function elapsedMs(timer: TimerState, clock: Clock = systemClock): number {
  if (timer.runningSince === null) return timer.accumulatedMs
  return timer.accumulatedMs + (clock.now() - timer.runningSince)
}
