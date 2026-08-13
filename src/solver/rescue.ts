import { fold } from '@/engine/game'
import { isDeadEnd, isWon } from '@/engine/rules'
import type { Difficulty, GameSettings, GameState, Move } from '@/engine/types'
import { DEFAULT_GAME_SETTINGS } from '@/engine/types'
import { SOLVE_PROFILES, solveDeal } from './solve'
import { replayWins } from './verify'

/**
 * What the safety net knows about the current position.
 *
 * Three values, not two, and the distinction carries the whole feature:
 *
 * - `winnable`: a full winning line was found and replayed through the engine.
 * - `lost`: an unpruned search drained its entire frontier without a win. This
 *   is a proof, not a guess.
 * - `unknown`: neither could be established inside the budget. Most hard
 *   mid-game 4-suit positions land here, and the UI must stay silent for them.
 *   Warning on `unknown` would fire constantly on positions that are perfectly
 *   fine, and players would learn to ignore the warning that matters.
 */
export type Winnability = 'winnable' | 'lost' | 'unknown'

export interface WinnabilityReport {
  readonly verdict: Winnability
  readonly nodes: number
  /** True when there is no legal move at all, so the board is visibly stuck. */
  readonly deadEnd: boolean
}

/** Is `state` still winnable? See `Winnability` for what each answer means. */
export function winnabilityOf(
  state: GameState,
  settings: GameSettings = DEFAULT_GAME_SETTINGS,
): WinnabilityReport {
  if (isWon(state)) return { verdict: 'winnable', nodes: 0, deadEnd: false }

  const deadEnd = isDeadEnd(state, settings)
  if (deadEnd) return { verdict: 'lost', nodes: 0, deadEnd: true }

  // First try to find a win. A found line is proof of `winnable`, and this is
  // the strong searcher, so it is also the common answer.
  const found = solveDeal(state, SOLVE_PROFILES.RESCUE, settings)
  if (found.status === 'solved' && replayWins(state, found.moves, settings)) {
    return { verdict: 'winnable', nodes: found.nodes, deadEnd: false }
  }

  // Failing that, try to prove defeat with the sound searcher. Positions that
  // really are dead have tiny state spaces, which is exactly when exhausting the
  // frontier is achievable — so this succeeds precisely when it matters.
  const proof = solveDeal(state, SOLVE_PROFILES.PROVE_DEAD, settings)
  if (proof.status === 'unsolvable') {
    return { verdict: 'lost', nodes: found.nodes + proof.nodes, deadEnd: false }
  }
  if (proof.status === 'solved' && replayWins(state, proof.moves, settings)) {
    return { verdict: 'winnable', nodes: found.nodes + proof.nodes, deadEnd: false }
  }

  return { verdict: 'unknown', nodes: found.nodes + proof.nodes, deadEnd: false }
}

export function winnability(
  seed: number,
  difficulty: Difficulty,
  moveLog: readonly Move[],
  settings: GameSettings = DEFAULT_GAME_SETTINGS,
): WinnabilityReport {
  return winnabilityOf(fold(seed, difficulty, moveLog, settings), settings)
}

export interface LastWinnableResult {
  /** Move-log length to rewind to; 0 is the original deal. */
  readonly index: number
  readonly checked: number
  /**
   * A winning line from that prefix, replayed through the engine. Empty when
   * even the deal could not be proven inside the rescue budget.
   */
  readonly continuation: readonly Move[]
}

function winningLineFrom(
  state: GameState,
  settings: GameSettings,
): readonly Move[] | null {
  if (isWon(state)) return []
  const found = solveDeal(state, SOLVE_PROFILES.RESCUE, settings)
  if (found.status === 'solved' && replayWins(state, found.moves, settings)) {
    return found.moves
  }
  return null
}

/**
 * The largest move-log prefix length from which the deal can still be won.
 *
 * The current position is probed first: that is the common "I'm stuck" case,
 * and a found line means there is nothing to rewind. Only then do we binary
 * search earlier prefixes. Index 0 is solved for real rather than assumed
 * winnable — shared and random deals have no such guarantee.
 *
 * Binary search over prefixes: if move `i` is winnable, everything before it is
 * assumed to be too, so we look later; if not, earlier. That monotonicity is an
 * approximation — winnability is not strictly monotonic in a move log, since a
 * player can wander into and back out of trouble — but it is a good one, and it
 * costs log(n) searches instead of n.
 */
export function findLastWinnableIndex(
  seed: number,
  difficulty: Difficulty,
  moveLog: readonly Move[],
  settings: GameSettings = DEFAULT_GAME_SETTINGS,
): LastWinnableResult {
  let checked = 0

  const current = fold(seed, difficulty, moveLog, settings)
  if (isWon(current)) {
    return { index: moveLog.length, checked: 0, continuation: [] }
  }

  checked += 1
  const currentLine = winningLineFrom(current, settings)
  if (currentLine !== null) {
    return { index: moveLog.length, checked, continuation: currentLine }
  }

  let low = 1
  let high = moveLog.length - 1
  let best = 0
  let bestLine: readonly Move[] = []

  while (low <= high) {
    const mid = (low + high) >> 1
    checked += 1
    const state = fold(seed, difficulty, moveLog.slice(0, mid), settings)
    const line = winningLineFrom(state, settings)
    if (line !== null) {
      best = mid
      bestLine = line
      low = mid + 1
    } else {
      high = mid - 1
    }
  }

  if (best > 0) {
    return { index: best, checked, continuation: bestLine }
  }

  if (moveLog.length === 0) {
    return { index: 0, checked, continuation: [] }
  }

  checked += 1
  const deal = fold(seed, difficulty, [], settings)
  const dealLine = winningLineFrom(deal, settings)
  return { index: 0, checked, continuation: dealLine ?? [] }
}
