import { describe, expect, it } from 'vitest'
import { cardsFromTokens } from './testing/ascii'
import {
  canPlace,
  completedRunAtTail,
  isDeadEnd,
  isRun,
  isWon,
  legalMoves,
  movableRunLength,
} from './rules'
import { parseBoard } from './testing/ascii'
import type { Card, Rank, Suit } from './types'
import { DEFAULT_GAME_SETTINGS } from './types'
import { makeCard } from './cards'
import { applyMove } from './moves'
import { assertInvariants } from './invariants'

function card(suit: Suit, rank: Rank, faceUp = true, copy = 0): Card {
  return makeCard(suit, rank, copy, faceUp)
}

describe('isRun', () => {
  it('accepts same-suit descending face-up runs', () => {
    expect(isRun(cardsFromTokens(['SK', 'SQ', 'SJ']))).toBe(true)
    expect(isRun(cardsFromTokens(['S5']))).toBe(true)
  })

  it('rejects empty, face-down, suit breaks, and rank breaks', () => {
    expect(isRun([])).toBe(false)
    expect(isRun([card('S', 5, false)])).toBe(false)
    expect(isRun(cardsFromTokens(['SK', 'HQ', 'SJ']))).toBe(false)
    expect(isRun(cardsFromTokens(['SK', 'SJ']))).toBe(false)
  })
})

describe('movableRunLength', () => {
  it('counts the tail run only', () => {
    const column = [card('S', 9, false), ...cardsFromTokens(['S8', 'S7', 'S6'])]
    expect(movableRunLength(column)).toBe(3)
    expect(movableRunLength([])).toBe(0)
  })
})

describe('canPlace exhaustive', () => {
  const suits: Suit[] = ['S', 'H', 'D', 'C']
  const ranks = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] as Rank[]

  it('covers all 13×13×4×4 rank/suit combinations', () => {
    for (const destSuit of suits) {
      for (const destRank of ranks) {
        for (const runSuit of suits) {
          for (const runRank of ranks) {
            const dest = [card(destSuit, destRank)]
            const run = [card(runSuit, runRank)]
            const expected = destRank === runRank + 1
            expect(canPlace(run, dest)).toBe(expected)
          }
        }
      }
    }
    expect(canPlace([card('S', 5)], [])).toBe(true)
    expect(canPlace([], [])).toBe(false)
    expect(canPlace([card('S', 5, false)], [])).toBe(false)
  })
})

describe('legalMoves fixtures', () => {
  it('finds builds onto any suit and empty columns', () => {
    const state = parseBoard(`
      difficulty: 1
      c0: [0] S7
      c1: [0] S6
      c2: -
      stock: 0
      found: 0
    `)
    const moves = legalMoves(state)
    expect(moves.some((m) => m.kind === 'moveRun' && m.from === 1 && m.to === 0)).toBe(
      true,
    )
    expect(moves.some((m) => m.kind === 'moveRun' && m.from === 0 && m.to === 2)).toBe(
      true,
    )
  })

  it('deals with an empty column unless the setting forbids it', () => {
    const state = parseBoard(`
      difficulty: 1
      c0: -
      c1: [0] S5
      stock: 10
      found: 0
    `)
    expect(legalMoves(state).some((m) => m.kind === 'dealStock')).toBe(true)
    expect(
      legalMoves(state, { allowDealWithEmptyColumn: false, undoPenalty: true }).some(
        (m) => m.kind === 'dealStock',
      ),
    ).toBe(false)
  })

  it('detects dead ends and wins', () => {
    const dead = {
      difficulty: 1 as const,
      columns: Array.from({ length: 10 }, (_, i) => [makeCard('S', 5, i % 8, true)]),
      stock: [] as Card[][],
      foundations: [] as Card[][],
      moveCount: 0,
      score: 500,
    }
    expect(legalMoves(dead).length).toBe(0)
    expect(isDeadEnd(dead)).toBe(true)

    const won = parseBoard(`
      difficulty: 1
      stock: 0
      found: 8
    `)
    expect(isWon(won)).toBe(true)
    expect(isDeadEnd(won)).toBe(false)
  })
})

describe('applyMove effects', () => {
  it('auto-flips and removes a completed foundation run', () => {
    const state = parseBoard(`
      difficulty: 1
      c0: [1] SK SQ SJ S10 S9 S8 S7 S6 S5 S4 S3 S2
      c1: [0] SA
      stock: 0
      found: 0
    `)
    const result = applyMove(state, { kind: 'moveRun', from: 1, to: 0, count: 1 })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.effects.some((e) => e.kind === 'foundation')).toBe(true)
    expect(result.effects.some((e) => e.kind === 'flip')).toBe(true)
    expect(result.state.foundations).toHaveLength(1)
    assertInvariants(result.state)
  })

  it('rejects illegal placements and empty-column deals', () => {
    const state = parseBoard(`
      difficulty: 1
      c0: [0] S5
      c1: [0] S7
      c2: -
      stock: 10
      found: 0
    `)
    expect(applyMove(state, { kind: 'moveRun', from: 0, to: 1, count: 1 }).ok).toBe(false)
    expect(
      applyMove(
        state,
        { kind: 'dealStock' },
        { ...DEFAULT_GAME_SETTINGS, allowDealWithEmptyColumn: false },
      ).ok,
    ).toBe(false)
    expect(applyMove(state, { kind: 'moveRun', from: 0, to: 0, count: 1 }).ok).toBe(false)
  })

  it('deals stock when all columns are filled', () => {
    const state = parseBoard(`
      difficulty: 1
      c0: [0] SA
      c1: [0] S2
      c2: [0] S3
      c3: [0] S4
      c4: [0] S5
      c5: [0] S6
      c6: [0] S7
      c7: [0] S8
      c8: [0] S9
      c9: [0] S10
      stock: 10
      found: 0
    `)
    const result = applyMove(state, { kind: 'dealStock' })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.effects.some((e) => e.kind === 'deal')).toBe(true)
    expect(result.state.stock).toHaveLength(0)
    assertInvariants(result.state)
  })
})

describe('completedRunAtTail', () => {
  it('detects K→A tails only', () => {
    const run = cardsFromTokens([
      'SK',
      'SQ',
      'SJ',
      'S10',
      'S9',
      'S8',
      'S7',
      'S6',
      'S5',
      'S4',
      'S3',
      'S2',
      'SA',
    ])
    expect(completedRunAtTail(run)?.length).toBe(13)
    expect(completedRunAtTail(run.slice(1))).toBeNull()
  })
})
