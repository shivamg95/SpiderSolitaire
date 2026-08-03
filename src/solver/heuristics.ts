import { movableRunLength } from '@/engine/rules'
import type { GameState } from '@/engine/types'

/** Weights for the search heuristic. */
export const HEURISTIC_WEIGHTS = {
  /** Prefer completed foundations. */
  w1_foundations: 100,
  /** Prefer fewer face-down cards. */
  w2_faceDown: 3,
  /** Prefer fewer buried blockers (face-down under face-up). */
  w3_buriedBlockers: 2,
  /** Prefer longer ordered same-suit runs at tails. */
  w4_orderedRun: 1,
  /** Prefer empty columns for parking. */
  w5_emptyColumns: 8,
} as const

export function heuristic(state: GameState): number {
  const w = HEURISTIC_WEIGHTS
  let faceDown = 0
  let buried = 0
  let ordered = 0
  let empty = 0
  for (const column of state.columns) {
    if (column.length === 0) {
      empty += 1
      continue
    }
    let seenUp = false
    for (const card of column) {
      if (card.faceUp) seenUp = true
      else {
        faceDown += 1
        if (seenUp) buried += 1
      }
    }
    ordered += movableRunLength(column)
  }
  return (
    w.w1_foundations * state.foundations.length -
    w.w2_faceDown * faceDown -
    w.w3_buriedBlockers * buried +
    w.w4_orderedRun * ordered +
    w.w5_emptyColumns * empty
  )
}
