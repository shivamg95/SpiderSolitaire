import { describe, expect, it } from 'vitest'
import { classifyMove, hintableMoves } from '@/engine/game'
import { applyMove } from '@/engine/moves'
import { parseBoard } from '@/engine/testing/ascii'
import type { GameState, Move } from '@/engine/types'
import { columnStructure, heuristic } from './heuristics'
import { rankedHints, SYNC_HINT_BUDGET } from './search'

const FILLER = `
  c3: [0] SK
  c4: [0] SK
  c5: [0] HK
  c6: [0] HK
  c7: [0] DK
  c8: [0] DK
  c9: [0] CK
`

function applyHeuristicDelta(state: GameState, move: Move): number {
  const before = heuristic(state)
  const result = applyMove(state, move)
  if (!result.ok) return Number.NEGATIVE_INFINITY
  return heuristic(result.state) - before
}

describe('suit-aware heuristic', () => {
  it('scores same-suit merges better than cross-suit landings at 4-suit', () => {
    const before = parseBoard(`
      difficulty: 4
      c0: [0] S9 S8
      c1: [0] S10
      c2: [0] H10
      ${FILLER}
      stock: 0
      found: 0
    `)
    const merge = applyHeuristicDelta(before, {
      kind: 'moveRun',
      from: 0,
      to: 1,
      count: 2,
    })
    const cross = applyHeuristicDelta(before, {
      kind: 'moveRun',
      from: 0,
      to: 2,
      count: 2,
    })
    expect(merge).toBeGreaterThan(cross)
  })

  it('penalizes junctions in face-up structure', () => {
    const clean = parseBoard(`
      difficulty: 4
      c0: [0] S10 S9 S8
      ${FILLER}
      stock: 0
      found: 0
    `)
    const junction = parseBoard(`
      difficulty: 4
      c0: [0] S10 H9 H8
      ${FILLER}
      stock: 0
      found: 0
    `)
    expect(columnStructure(clean.columns[0]!).junctions).toBe(0)
    expect(columnStructure(junction.columns[0]!).junctions).toBe(1)
    expect(heuristic(clean)).toBeGreaterThan(heuristic(junction))
  })
})

describe('rankedHints', () => {
  it('returns at most three hints with tier and cardIds', () => {
    const state = parseBoard(`
      difficulty: 4
      c0: [0] S9 S8
      c1: [0] S10
      c2: [0] H10
      ${FILLER}
      stock: 0
      found: 0
    `)
    const hints = rankedHints(state, 3, undefined, undefined, SYNC_HINT_BUDGET)
    expect(hints.length).toBeGreaterThan(0)
    expect(hints.length).toBeLessThanOrEqual(3)
    expect(hints[0]?.tier).toBeTruthy()
    expect(hints[0]?.explanation.length).toBeGreaterThan(0)
    expect(hints[0]?.cardIds.length).toBeGreaterThan(0)
  })

  it('prefers a same-suit merge over a cross-suit unload at 4-suit', () => {
    // Source keeps a buried card so the merge is suitMerge, not emptyColumn.
    const state = parseBoard(`
      difficulty: 4
      c0: [0] H2 S9 S8
      c1: [0] S10
      c2: [0] H10
      ${FILLER}
      stock: 0
      found: 0
    `)
    expect(classifyMove(state, { kind: 'moveRun', from: 0, to: 1, count: 2 })).toBe(
      'suitMerge',
    )
    expect(classifyMove(state, { kind: 'moveRun', from: 0, to: 2, count: 2 })).toBe(
      'crossSuitUnload',
    )
    const hints = rankedHints(state, 3, undefined, hintableMoves(state), SYNC_HINT_BUDGET)
    expect(hints[0]?.move).toEqual({ kind: 'moveRun', from: 0, to: 1, count: 2 })
    expect(hints[0]?.tier).toBe('suitMerge')
  })

  it('prefers uncovering a face-down over a same-suit merge at 1-suit', () => {
    const uncoverBoard = parseBoard(`
      difficulty: 1
      c0: [1] S3
      c1: [0] S4
      c2: [0] S10 S9
      c3: [0] SA S8
      c4: [0] SK
      c5: [0] SK
      c6: [0] SK
      c7: [0] SK
      c8: [0] SK
      c9: [0] SK
      stock: 0
      found: 0
    `)
    expect(
      classifyMove(uncoverBoard, { kind: 'moveRun', from: 0, to: 1, count: 1 }),
    ).toBe('uncover')
    expect(
      classifyMove(uncoverBoard, { kind: 'moveRun', from: 3, to: 2, count: 1 }),
    ).toBe('suitMerge')
    const hints = rankedHints(
      uncoverBoard,
      3,
      undefined,
      hintableMoves(uncoverBoard),
      SYNC_HINT_BUDGET,
    )
    expect(hints[0]?.tier).toBe('uncover')
  })

  it('is stable: same board yields the same top hint (no column-index noise)', () => {
    const state = parseBoard(`
      difficulty: 4
      c0: [0] S5
      c1: [0] H6
      c2: [0] D6
      c3: [0] C6
      c4: [0] SK
      c5: [0] HK
      c6: [0] DK
      c7: [0] CK
      c8: [0] SK
      c9: [0] HK
      stock: 0
      found: 0
    `)
    const a = rankedHints(state, 3, undefined, hintableMoves(state), SYNC_HINT_BUDGET)
    const b = rankedHints(state, 3, undefined, hintableMoves(state), SYNC_HINT_BUDGET)
    expect(a.map((h) => h.move)).toEqual(b.map((h) => h.move))
  })

  it('finds a two-move setup that one-ply greedy would undervalue', () => {
    const state = parseBoard(`
      difficulty: 4
      c0: [0] S8 H7
      c1: [0] S7
      c2: -
      c3: [0] SK
      c4: [0] HK
      c5: [0] DK
      c6: [0] DK
      c7: [0] CK
      c8: [0] CK
      c9: [0] SK
      stock: 0
      found: 0
    `)
    const candidates = hintableMoves(state)
    const deep = rankedHints(state, 3, undefined, candidates)
    const topTiers = deep.map((h) => h.tier)
    expect(topTiers.some((t) => t === 'spendEmpty' || t === 'suitMerge')).toBe(true)
    if (deep[0]?.move.kind === 'moveRun') {
      expect(deep[0].move).not.toEqual({ kind: 'moveRun', from: 0, to: 1, count: 1 })
    }
  })
})
