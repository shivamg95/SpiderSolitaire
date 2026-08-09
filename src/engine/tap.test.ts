import { describe, expect, it } from 'vitest'
import { rankTapDestinations, stagedState } from './game'
import { applyMove } from './moves'
import { parseBoard } from './testing/ascii'
import type { Difficulty, GameHandle, GameState, Move } from './types'
import { DEFAULT_GAME_SETTINGS } from './types'

/** Kings park in the untouched columns so fixtures carry no stray empty ones. */
function kingFiller(from: number, difficulty: Difficulty): string {
  const suits = difficulty === 1 ? ['S'] : ['S', 'H', 'D', 'C']
  return Array.from(
    { length: 10 - from },
    (_, i) => `c${from + i}: [0] ${suits[i % suits.length]}K`,
  ).join('\n')
}

function handleFor(state: GameState): GameHandle {
  return {
    seed: 1,
    difficulty: state.difficulty,
    moveLog: [],
    redoLog: [],
    state,
    settings: DEFAULT_GAME_SETTINGS,
  }
}

function destinations(moves: readonly Move[]): number[] {
  return moves.flatMap((m) => (m.kind === 'moveRun' ? [m.to] : []))
}

/** An ace that can either finish a K→2 pile or sit on a loose deuce. */
const completionBoard = parseBoard(`
  difficulty: 1
  c0: [0] SA
  c1: [0] SK SQ SJ S10 S9 S8 S7 S6 S5 S4 S3 S2
  c2: [0] S2
  ${kingFiller(3, 1)}
  stock: 50
  found: 0
`)

describe('rankTapDestinations', () => {
  it('puts a completed set ahead of an equally legal same-suit landing', () => {
    const ranked = rankTapDestinations(completionBoard, 0, 1)
    expect(destinations(ranked)).toEqual([1, 2])
  })

  it('prefers same suit, then covering a card, then spending an empty column', () => {
    const board = parseBoard(`
      difficulty: 4
      c0: [1] H8
      c1: [0] S9
      c2: [0] H9
      c3: -
      ${kingFiller(4, 4)}
      stock: 50
      found: 0
    `)
    expect(destinations(rankTapDestinations(board, 0, 1))).toEqual([2, 1, 3])
  })

  it('ranks trading one empty column for another last', () => {
    const board = parseBoard(`
      difficulty: 4
      c0: [0] S6
      c1: -
      c2: [0] H7
      ${kingFiller(3, 4)}
      stock: 50
      found: 0
    `)
    expect(destinations(rankTapDestinations(board, 0, 1))).toEqual([2, 1])
  })

  it('merges into the longer of two same-suit builds', () => {
    const board = parseBoard(`
      difficulty: 1
      c0: [1] S5
      c1: [0] S8 S7 S6
      c2: [0] S6
      ${kingFiller(3, 1)}
      stock: 50
      found: 0
    `)
    expect(destinations(rankTapDestinations(board, 0, 1))).toEqual([1, 2])
  })
})

describe('stagedState', () => {
  const move = { kind: 'moveRun', from: 0, to: 1, count: 1 } as const

  it('leaves the completed run on its column so the travel can be seen', () => {
    const staged = stagedState(handleFor(completionBoard), move)
    expect(staged).not.toBeNull()
    expect(staged?.columns[1]).toHaveLength(13)
    expect(staged?.foundations).toHaveLength(0)

    const collected = applyMove(completionBoard, move)
    expect(collected.ok).toBe(true)
    if (!collected.ok) return
    expect(collected.state.columns[1]).toHaveLength(0)
    expect(collected.state.foundations).toHaveLength(1)
  })

  it('stages nothing for a move that collects nothing', () => {
    expect(stagedState(handleFor(completionBoard), { ...move, to: 2 })).toBeNull()
    expect(stagedState(handleFor(completionBoard), { kind: 'dealStock' })).toBeNull()
  })
})
