import { describe, expect, it } from 'vitest'
import {
  breaksExistingBuild,
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

  it('keeps build-breaking moves out of the hint queue', () => {
    const hints = hintableMoves(board)
    expect(hints).not.toContainEqual({ kind: 'moveRun', from: 0, to: 1, count: 1 })
    expect(hints).toContainEqual({ kind: 'moveRun', from: 0, to: 2, count: 2 })
    expect(hints).toContainEqual({ kind: 'moveRun', from: 1, to: 2, count: 1 })
  })

  it('drops shuffles that achieve nothing but keeps same-suit joins', () => {
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

    expect(isProductiveMove(shuffleBoard, ontoOffSuit)).toBe(false)
    expect(isProductiveMove(shuffleBoard, ontoSameSuit)).toBe(true)
    expect(hintableMoves(shuffleBoard)).toEqual([ontoSameSuit])
  })

  it('falls back rather than leaving the player without a hint', () => {
    const deadishBoard = parseBoard(`
      difficulty: 4
      c0: [0] S10 H5
      c1: [0] S6
      c2: [0] D6
      ${FILLER}
      stock: 0
      found: 0
    `)
    // Both moves are unproductive, so the unfiltered tier is offered instead.
    expect(hintableMoves(deadishBoard)).toHaveLength(2)
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
