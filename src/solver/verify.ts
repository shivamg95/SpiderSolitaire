import { createGame } from '@/engine/game'
import { applyMove } from '@/engine/moves'
import { isWon } from '@/engine/rules'
import type { Difficulty, GameSettings, GameState, Move } from '@/engine/types'
import type { SolveBudget } from './solve'
import { SOLVE_PROFILES, solveDeal } from './solve'

/**
 * The ruleset every shipped seed is verified against.
 *
 * Dealing from the stock onto an empty column is the *permissive* rule
 * (`canDealStock` returns early when it is on), so a line that wins without
 * ever relying on it is still legal when the player turns the setting on. Prove
 * winnability under the strict rule once and the seed holds either way.
 */
export const VERIFY_SETTINGS: GameSettings = {
  allowDealWithEmptyColumn: false,
  undoPenalty: true,
}

/** Replay `moves` through the real engine and report whether they win. */
export function replayWins(
  root: GameState,
  moves: readonly Move[],
  settings: GameSettings = VERIFY_SETTINGS,
): boolean {
  let state = root
  for (const move of moves) {
    const result = applyMove(state, move, settings)
    if (!result.ok) return false
    state = result.state
  }
  return isWon(state)
}

export interface VerifyOutcome {
  readonly seed: number
  readonly difficulty: Difficulty
  readonly winnable: boolean
  readonly nodes: number
  readonly elapsedMs: number
  readonly moveCount: number
}

/**
 * Solve a seed and confirm the answer against the engine.
 *
 * `winnable` is only ever true for a line that has been replayed move by move
 * to a won state, so the solver's own bookkeeping can never be the reason a
 * seed reaches the pool.
 */
export function verifySeed(
  seed: number,
  difficulty: Difficulty,
  budget: SolveBudget = SOLVE_PROFILES.VERIFY,
): VerifyOutcome {
  const started = Date.now()
  const { state } = createGame(seed, difficulty, VERIFY_SETTINGS)
  const result = solveDeal(state, budget, VERIFY_SETTINGS)
  const elapsedMs = Date.now() - started

  if (result.status !== 'solved' || !replayWins(state, result.moves)) {
    return {
      seed,
      difficulty,
      winnable: false,
      nodes: result.nodes,
      elapsedMs,
      moveCount: 0,
    }
  }

  return {
    seed,
    difficulty,
    winnable: true,
    nodes: result.nodes,
    elapsedMs,
    moveCount: result.moves.length,
  }
}
