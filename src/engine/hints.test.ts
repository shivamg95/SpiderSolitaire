import { describe, expect, it } from 'vitest'
import {
  breaksExistingBuild,
  classifyMove,
  createGame,
  hintableMoves,
  isProductiveMove,
  movedCardIds,
} from './game'
import { applyMove } from './moves'
import { parseBoard } from './testing/ascii'

/** Kings fill the spare columns so fixtures have no empty-column noise. */
const FILLER = `
  c3: [0] SK
  c4: [0] SK
  c5: [0] HK
  c6: [0] HK
  c7: [0] DK
  c8: [0] DK
  c9: [0] CK
`

describe('hint filtering', () => {
  const board = parseBoard(`
    difficulty: 4
    c0: [0] S9 S8
    c1: [0] H9
    c2: [0] S10
    ${FILLER}
    stock: 0
    found: 0
  `)

  it('detects a run already sitting on its same-suit parent', () => {
    expect(
      breaksExistingBuild(board, { kind: 'moveRun', from: 0, to: 1, count: 1 }),
    ).toBe(true)
    expect(
      breaksExistingBuild(board, { kind: 'moveRun', from: 0, to: 2, count: 2 }),
    ).toBe(false)
    expect(breaksExistingBuild(board, { kind: 'dealStock' })).toBe(false)
  })

  it('keeps build-breaking moves out of the hint queue when alternatives exist', () => {
    const hints = hintableMoves(board)
    expect(hints).not.toContainEqual({ kind: 'moveRun', from: 0, to: 1, count: 1 })
    expect(hints).toContainEqual({ kind: 'moveRun', from: 0, to: 2, count: 2 })
    expect(hints).toContainEqual({ kind: 'moveRun', from: 1, to: 2, count: 1 })
  })

  it('keeps same-suit joins and still admits cross-suit unloads as lower-tier options', () => {
    const shuffleBoard = parseBoard(`
      difficulty: 4
      c0: [0] S10 H5
      c1: [0] S6
      c2: [0] H6
      ${FILLER}
      stock: 0
      found: 0
    `)
    const ontoOffSuit = { kind: 'moveRun', from: 0, to: 1, count: 1 } as const
    const ontoSameSuit = { kind: 'moveRun', from: 0, to: 2, count: 1 } as const

    expect(classifyMove(shuffleBoard, ontoOffSuit)).toBe('crossSuitUnload')
    expect(classifyMove(shuffleBoard, ontoSameSuit)).toBe('suitMerge')
    expect(isProductiveMove(shuffleBoard, ontoSameSuit)).toBe(true)
    const hints = hintableMoves(shuffleBoard)
    expect(hints).toContainEqual(ontoSameSuit)
    expect(hints).toContainEqual(ontoOffSuit)
    // Same-suit ranks ahead of cross-suit in the ordered candidate list.
    const sameIdx = hints.findIndex(
      (m) => m.kind === 'moveRun' && m.from === 0 && m.to === 2 && m.count === 1,
    )
    const crossIdx = hints.findIndex(
      (m) => m.kind === 'moveRun' && m.from === 0 && m.to === 1 && m.count === 1,
    )
    expect(sameIdx).toBeGreaterThanOrEqual(0)
    expect(crossIdx).toBeGreaterThanOrEqual(0)
    expect(sameIdx).toBeLessThan(crossIdx)
  })

  it('falls back to cross-suit unloads rather than leaving the player without a hint', () => {
    const deadishBoard = parseBoard(`
      difficulty: 4
      c0: [0] S10 H5
      c1: [0] S6
      c2: [0] D6
      ${FILLER}
      stock: 0
      found: 0
    `)
    expect(hintableMoves(deadishBoard)).toHaveLength(2)
    expect(
      classifyMove(deadishBoard, { kind: 'moveRun', from: 0, to: 1, count: 1 }),
    ).toBe('crossSuitUnload')
  })

  it('treats relocating a whole column into an empty one as pointless', () => {
    const parkBoard = parseBoard(`
      difficulty: 4
      c0: [0] S6
      c1: -
      c9: [0] CK
      stock: 0
      found: 0
    `)
    expect(
      isProductiveMove(parkBoard, { kind: 'moveRun', from: 0, to: 1, count: 1 }),
    ).toBe(false)
  })

  it('classifies same-suit joins and rejects dumping a partial run into empty', () => {
    const board4 = parseBoard(`
      difficulty: 4
      c0: [0] H2 S10 S9 S8
      c1: [0] H3 S7
      c2: -
      c3: [0] HK
      c4: [0] HK
      c5: [0] DK
      c6: [0] DK
      c7: [0] CK
      c8: [0] CK
      c9: [0] SK
      stock: 0
      found: 0
    `)
    expect(classifyMove(board4, { kind: 'moveRun', from: 1, to: 0, count: 1 })).toBe(
      'suitMerge',
    )
    // Peeling one card off a same-suit build into empty dismantles the build.
    expect(classifyMove(board4, { kind: 'moveRun', from: 0, to: 2, count: 1 })).toBe(
      'breakBuild',
    )
    // Full movable run into empty is spendEmpty.
    expect(classifyMove(board4, { kind: 'moveRun', from: 0, to: 2, count: 3 })).toBe(
      'spendEmpty',
    )
    // Whole-column relocate into empty is shuffle.
    const lone = parseBoard(`
      difficulty: 4
      c0: [0] S6
      c1: -
      c9: [0] CK
      stock: 0
      found: 0
    `)
    expect(classifyMove(lone, { kind: 'moveRun', from: 0, to: 1, count: 1 })).toBe(
      'shuffle',
    )
  })

  it('admits build-breaks only when they are the sole survivors', () => {
    // Only legal move is peeling S9 off S10 onto H10 — a build break.
    const onlyBreak = parseBoard(`
      difficulty: 4
      c0: [0] S10 S9
      c1: [0] H10
      c2: [0] SK
      c3: [0] HK
      c4: [0] DK
      c5: [0] DK
      c6: [0] CK
      c7: [0] CK
      c8: [0] SK
      c9: [0] HK
      stock: 0
      found: 0
    `)
    const hints = hintableMoves(onlyBreak)
    expect(hints).toEqual([{ kind: 'moveRun', from: 0, to: 1, count: 1 }])
    expect(classifyMove(onlyBreak, hints[0]!)).toBe('breakBuild')
  })
})

describe('movedCardIds', () => {
  it('reports the travelling run in destination order', () => {
    const before = parseBoard(`
      difficulty: 4
      c0: [1] S8 S7
      c1: [0] S9
      c9: [0] CK
      stock: 0
      found: 0
    `)
    const expected = before.columns[0]!.slice(1).map((c) => c.id)
    const result = applyMove(before, { kind: 'moveRun', from: 0, to: 1, count: 2 })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(movedCardIds(before, result.state)).toEqual(expected)
  })

  it('reports every dealt card and ignores a flip in place', () => {
    const game = createGame(3, 1)
    const result = applyMove(game.state, { kind: 'dealStock' })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(movedCardIds(game.state, result.state)).toHaveLength(10)
    expect(movedCardIds(game.state, game.state)).toEqual([])
  })
})
