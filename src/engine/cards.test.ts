import { describe, expect, it } from 'vitest'
import {
  buildDeck,
  copiesPerSuit,
  makeCardId,
  parseCardId,
  rankLabel,
  suitsForDifficulty,
} from './cards'
import { deal } from './deal'
import { assertInvariants } from './invariants'
import { mulberry32, shuffle } from './rng'

describe('deck composition', () => {
  it('builds 104 cards for each difficulty', () => {
    for (const d of [1, 2, 4] as const) {
      const deck = buildDeck(d)
      expect(deck).toHaveLength(104)
      expect(suitsForDifficulty(d)).toHaveLength(d === 1 ? 1 : d === 2 ? 2 : 4)
      expect(copiesPerSuit(d) * suitsForDifficulty(d).length * 13).toBe(104)
    }
  })

  it('parses and formats card ids', () => {
    const id = makeCardId('S', 13, 2)
    expect(parseCardId(id)).toEqual({ suit: 'S', rank: 13, copy: 2 })
    expect(rankLabel(1)).toBe('A')
    expect(rankLabel(11)).toBe('J')
    expect(rankLabel(12)).toBe('Q')
    expect(rankLabel(13)).toBe('K')
    expect(rankLabel(5)).toBe('5')
  })

  it('rejects invalid card ids', () => {
    expect(() => parseCardId('XX' as never)).toThrow(/Invalid CardId/)
  })
})

describe('rng golden vector', () => {
  it('mulberry32(42) first 10 values stay pinned', () => {
    const rng = mulberry32(42)
    const values = Array.from({ length: 10 }, () => rng())
    expect(values).toEqual([
      0.6011037519201636, 0.44829055899754167, 0.8524657934904099, 0.6697340414393693,
      0.17481389874592423, 0.5265925421845168, 0.2732279943302274, 0.6247446539346129,
      0.8654746483080089, 0.4723170551005751,
    ])
  })

  it('shuffle fisher-yates is pinned for seed 12345', () => {
    const rng = mulberry32(12345)
    expect(shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], rng)).toEqual([
      6, 4, 8, 0, 1, 7, 5, 3, 2, 9,
    ])
  })
})

describe('deal', () => {
  it('deals 54 cards with 44 face-down and stock of 5×10', () => {
    const state = deal(7, 1)
    expect(state.columns).toHaveLength(10)
    let total = 0
    let faceDown = 0
    for (let i = 0; i < 10; i++) {
      const col = state.columns[i] ?? []
      const expected = i < 4 ? 6 : 5
      expect(col).toHaveLength(expected)
      total += col.length
      faceDown += col.filter((c) => !c.faceUp).length
      expect(col[col.length - 1]?.faceUp).toBe(true)
    }
    expect(total).toBe(54)
    expect(faceDown).toBe(44)
    expect(state.stock).toHaveLength(5)
    expect(state.stock.every((b) => b.length === 10)).toBe(true)
    assertInvariants(state)
  })

  it('is deterministic for the same seed', () => {
    expect(deal(99, 2)).toEqual(deal(99, 2))
  })
})
