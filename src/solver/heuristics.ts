import { movableRunLength } from '@/engine/rules'
import type { Card, Difficulty, GameState } from '@/engine/types'

/** Per-term weights for the search / hint heuristic. */
export interface HeuristicWeights {
  readonly foundations: number
  readonly faceDown: number
  readonly buriedBlockers: number
  /** Superlinear same-suit group score: sum(g*(g-1)/2). */
  readonly suitGroups: number
  /** Penalty for rank-ok but off-suit adjacent face-up pairs. */
  readonly junctions: number
  /** Penalty for face-up pairs that do not descend by one. */
  readonly hardBreaks: number
  readonly emptyColumns: number
  /** Small bonus for the movable same-suit tail length. */
  readonly tailRun: number
}

/**
 * Weights by difficulty. In 4-suit, suit consolidation outranks blind digging;
 * in 1-suit the balance stays close to the original face-down-first heuristic.
 */
export const HEURISTIC_WEIGHTS_BY_DIFFICULTY: Record<Difficulty, HeuristicWeights> = {
  1: {
    foundations: 100,
    faceDown: 3,
    buriedBlockers: 2,
    suitGroups: 1,
    junctions: 0,
    hardBreaks: 2,
    emptyColumns: 8,
    tailRun: 1,
  },
  2: {
    foundations: 100,
    faceDown: 2.5,
    buriedBlockers: 2,
    suitGroups: 2.5,
    junctions: 3,
    hardBreaks: 2,
    emptyColumns: 8,
    tailRun: 0.5,
  },
  4: {
    foundations: 100,
    faceDown: 2,
    buriedBlockers: 2,
    suitGroups: 4,
    junctions: 5,
    hardBreaks: 3,
    emptyColumns: 8,
    tailRun: 0.5,
  },
}

/** @deprecated Prefer HEURISTIC_WEIGHTS_BY_DIFFICULTY; kept for callers that expect a flat table. */
export const HEURISTIC_WEIGHTS = HEURISTIC_WEIGHTS_BY_DIFFICULTY[1]

/** Weights for the full-game search. See SEARCH_WEIGHTS_BY_DIFFICULTY. */
export interface SearchWeights {
  readonly foundations: number
  readonly faceDown: number
  readonly buried: number
  /** Linear: adjacent face-up pairs that descend by one in the same suit. */
  readonly suitPairs: number
  /** Superlinear: sum(g*(g-1)/2) over maximal same-suit descending groups. */
  readonly suitGroupsQuad: number
  readonly junctions: number
  readonly hardBreaks: number
  readonly emptyColumns: number
  readonly tailRun: number
}

/**
 * Separate weights for the full-game search, tuned on 4-suit solve rate rather
 * than on which single move looks best.
 *
 * Two things the tuning runs showed, both counter-intuitive enough to be worth
 * recording. First, `foundations` has to dwarf everything else: at the hint
 * weighting a finished K→A run in a column is worth 78 * 4 = 312 points and the
 * foundation it becomes pays only 100, so the board score *drops* on the one
 * move that wins the game. Second, the superlinear group term still has to be
 * there and has to be large. Scoring sequences linearly instead cut the 4-suit
 * solve rate roughly in half: consolidating cards into long same-suit runs is
 * the whole skill of the game, and a linear reward does not distinguish one run
 * of eight from eight loose pairs.
 */
export const SEARCH_WEIGHTS_BY_DIFFICULTY: Record<Difficulty, SearchWeights> = {
  1: {
    foundations: 1000,
    faceDown: 3,
    buried: 2,
    suitPairs: 0,
    suitGroupsQuad: 2,
    junctions: 0,
    hardBreaks: 4,
    emptyColumns: 20,
    tailRun: 0.5,
  },
  2: {
    foundations: 1000,
    faceDown: 3,
    buried: 2,
    suitPairs: 0,
    suitGroupsQuad: 5,
    junctions: 5,
    hardBreaks: 4,
    emptyColumns: 20,
    tailRun: 0.5,
  },
  4: {
    foundations: 1000,
    faceDown: 3,
    buried: 2,
    suitPairs: 0,
    suitGroupsQuad: 8,
    junctions: 8,
    hardBreaks: 4,
    emptyColumns: 20,
    tailRun: 0.5,
  },
}

/** Face-up suffix of a column (everything from the first face-up card to the tail). */
function faceUpSuffix(column: readonly Card[]): readonly Card[] {
  let start = column.length
  for (let i = 0; i < column.length; i++) {
    if (column[i]!.faceUp) {
      start = i
      break
    }
  }
  return column.slice(start)
}

/**
 * Structural features of one column's face-up cards:
 * - suitGroups: sum of g*(g-1)/2 over maximal same-suit descending groups
 * - junctions: adjacent pairs that descend by one but differ in suit
 * - hardBreaks: adjacent pairs that do not descend by one
 */
export function columnStructure(column: readonly Card[]): {
  suitGroups: number
  junctions: number
  hardBreaks: number
} {
  const up = faceUpSuffix(column)
  if (up.length === 0) return { suitGroups: 0, junctions: 0, hardBreaks: 0 }

  let suitGroups = 0
  let junctions = 0
  let hardBreaks = 0
  let groupLen = 1

  for (let i = 1; i < up.length; i++) {
    const upper = up[i - 1]!
    const lower = up[i]!
    const descends = upper.rank === lower.rank + 1
    if (!descends) {
      suitGroups += (groupLen * (groupLen - 1)) / 2
      groupLen = 1
      hardBreaks += 1
      continue
    }
    if (upper.suit !== lower.suit) {
      suitGroups += (groupLen * (groupLen - 1)) / 2
      groupLen = 1
      junctions += 1
      continue
    }
    groupLen += 1
  }
  suitGroups += (groupLen * (groupLen - 1)) / 2

  return { suitGroups, junctions, hardBreaks }
}

export function heuristic(state: GameState): number {
  const w = HEURISTIC_WEIGHTS_BY_DIFFICULTY[state.difficulty]
  let faceDown = 0
  let buried = 0
  let suitGroups = 0
  let junctions = 0
  let hardBreaks = 0
  let empty = 0
  let tailRun = 0

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
    const structure = columnStructure(column)
    suitGroups += structure.suitGroups
    junctions += structure.junctions
    hardBreaks += structure.hardBreaks
    tailRun += movableRunLength(column)
  }

  return (
    w.foundations * state.foundations.length -
    w.faceDown * faceDown -
    w.buriedBlockers * buried +
    w.suitGroups * suitGroups -
    w.junctions * junctions -
    w.hardBreaks * hardBreaks +
    w.emptyColumns * empty +
    w.tailRun * tailRun
  )
}
