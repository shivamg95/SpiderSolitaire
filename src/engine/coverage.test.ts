import { describe, expect, it } from 'vitest'
import { formatCardToken, parseRankLabel, withFace, makeCard } from './cards'
import { deal } from './deal'
import {
  attemptMove,
  canDeal,
  columnMovableLength,
  createGame,
  exposesFaceDown,
  fold,
  gameWon,
  hintableMoves,
  rankTapDestinations,
  remainingDeals,
  undo,
  redo,
} from './game'
import { assertInvariants } from './invariants'
import { applyMove } from './moves'
import { shuffle } from './rng'
import {
  canDealStock,
  canPlace,
  completedRunAtTail,
  isRun,
  legalMoves,
  movableRunLength,
} from './rules'
import { parseBoard, printBoard, cardsFromTokens } from './testing/ascii'
import type { Card, GameState } from './types'

describe('cards edge cases', () => {
  it('parseRankLabel accepts and rejects', () => {
    expect(parseRankLabel('a')).toBe(1)
    expect(parseRankLabel('10')).toBe(10)
    expect(() => parseRankLabel('0')).toThrow(/Invalid rank/)
    expect(() => parseRankLabel('14')).toThrow(/Invalid rank/)
    expect(() => parseRankLabel('X')).toThrow(/Invalid rank/)
  })

  it('withFace is stable when unchanged', () => {
    const c = makeCard('S', 1, 0, true)
    expect(withFace(c, true)).toBe(c)
    expect(withFace(c, false).faceUp).toBe(false)
  })

  it('formatCardToken works', () => {
    expect(formatCardToken({ suit: 'S', rank: 1 })).toBe('SA')
    expect(formatCardToken({ suit: 'H', rank: 12 })).toBe('HQ')
  })
})

describe('rng edge', () => {
  it('shuffle handles identity rng', () => {
    expect(shuffle([1, 2, 3], () => 0)).toEqual([2, 3, 1])
  })
})

describe('deal / fold edges', () => {
  it('fold throws on illegal move in log', () => {
    expect(() => fold(1, 1, [{ kind: 'moveRun', from: 0, to: 0, count: 1 }])).toThrow(
      /illegal move/,
    )
  })

  it('attemptMove no-ops on illegal', () => {
    const g = createGame(1, 1)
    expect(attemptMove(g, { kind: 'moveRun', from: 0, to: 0, count: 1 })).toBe(g)
  })

  it('undo/redo no-op at boundaries', () => {
    const g = createGame(1, 1)
    expect(undo(g)).toBe(g)
    expect(redo(g)).toBe(g)
  })

  it('selectors cover deal/hints/exposes/tap ranks', () => {
    const g = createGame(2, 1)
    expect(remainingDeals(g.state)).toBe(5)
    expect(hintableMoves(g.state).length).toBeGreaterThan(0)
    expect(gameWon(g)).toBe(false)
    expect(canDeal(g)).toBe(true)
    expect(columnMovableLength(g.state, 0)).toBeGreaterThan(0)
    expect(columnMovableLength(g.state, 99)).toBe(0)

    const moves = legalMoves(g.state).filter((m) => m.kind === 'moveRun')
    const move = moves[0]
    expect(move).toBeDefined()
    if (!move || move.kind !== 'moveRun') return
    void exposesFaceDown(g.state, move)
    void exposesFaceDown(g.state, { kind: 'dealStock' })
    expect(rankTapDestinations(g.state, move.from, move.count).length).toBeGreaterThan(0)

    // empty-column and same-suit ranking branches
    const board = parseBoard(`
      difficulty: 2
      c0: [1] S8 S7
      c1: [0] S9
      c2: -
      c3: [0] H9
      stock: 0
      found: 0
    `)
    const taps = rankTapDestinations(board, 0, 2)
    expect(taps.length).toBeGreaterThan(1)
    expect(taps[0]?.kind).toBe('moveRun')
    expect(exposesFaceDown(board, { kind: 'moveRun', from: 0, to: 1, count: 2 })).toBe(
      true,
    )
    expect(exposesFaceDown(board, { kind: 'moveRun', from: 0, to: 1, count: 99 })).toBe(
      false,
    )
    expect(
      exposesFaceDown(board, { kind: 'moveRun', from: 99 as never, to: 1, count: 1 }),
    ).toBe(false)
  })
})

describe('rules edges', () => {
  it('covers face-down dest and broken run branches', () => {
    expect(canPlace([makeCard('S', 5, 0, true)], [makeCard('S', 6, 0, false)])).toBe(
      false,
    )
    expect(movableRunLength([makeCard('S', 5, 0, false)])).toBe(1)
    expect(movableRunLength([makeCard('S', 6, 0, true), makeCard('H', 5, 0, true)])).toBe(
      1,
    )
    expect(movableRunLength([makeCard('S', 7, 0, true), makeCard('S', 5, 0, true)])).toBe(
      1,
    )
    expect(completedRunAtTail(cardsFromTokens(['SQ', 'SJ']))).toBeNull()
    expect(isRun([makeCard('S', 5, 0, true), makeCard('S', 4, 0, false)])).toBe(false)
  })

  it('canDealStock respects empty stock', () => {
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
      stock: 0
      found: 0
    `)
    expect(canDealStock(state)).toBe(false)
  })
})

describe('moves rejection paths', () => {
  it('rejects invalid counts and non-runs', () => {
    const state = parseBoard(`
      difficulty: 1
      c0: [0] SK S9
      c1: [0] S10
      stock: 0
      found: 0
    `)
    expect(applyMove(state, { kind: 'moveRun', from: 0, to: 1, count: 2 }).ok).toBe(false)
    expect(applyMove(state, { kind: 'moveRun', from: 0, to: 1, count: 99 }).ok).toBe(
      false,
    )
    expect(applyMove(state, { kind: 'moveRun', from: 0, to: 1, count: 0 }).ok).toBe(false)
    expect(applyMove(state, { kind: 'dealStock' }).ok).toBe(false)
    expect(
      applyMove(
        { ...state, stock: [[makeCard('S', 1, 0, true)]] as never },
        { kind: 'dealStock' },
        { allowDealWithEmptyColumn: true, undoPenalty: true },
      ).ok,
    ).toBe(false)
  })

  it('flips nothing when foundation clears a column', () => {
    const state = parseBoard(`
      difficulty: 1
      c0: [0] SK SQ SJ S10 S9 S8 S7 S6 S5 S4 S3 S2
      c1: [0] SA
      stock: 0
      found: 0
    `)
    const result = applyMove(state, { kind: 'moveRun', from: 1, to: 0, count: 1 })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.columns[0]).toHaveLength(0)
  })

  it('emits win on eighth foundation', () => {
    const state = parseBoard(`
      difficulty: 1
      c0: [0] SK SQ SJ S10 S9 S8 S7 S6 S5 S4 S3 S2
      c1: [0] SA
      stock: 0
      found: 7
    `)
    const result = applyMove(state, { kind: 'moveRun', from: 1, to: 0, count: 1 })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.effects.some((e) => e.kind === 'win')).toBe(true)
    expect(result.state.foundations).toHaveLength(8)
  })
})

describe('invariants', () => {
  it('throws on broken boards', () => {
    const good = deal(1, 1)
    expect(() => assertInvariants(good)).not.toThrow()

    const tooFewCols = { ...good, columns: good.columns.slice(0, 9) }
    expect(() => assertInvariants(tooFewCols)).toThrow(/expected 10 columns/)

    const missingCol = {
      ...good,
      columns: good.columns.map((c, i) => (i === 3 ? undefined : c)),
    }
    expect(() => assertInvariants(missingCol as never)).toThrow(/missing column/)

    const dup = structuredClone(good) as GameState
    const c0 = dup.columns[0] as Card[]
    if (c0[0] && c0[1]) c0[1] = { ...c0[0] }
    expect(() => assertInvariants(dup)).toThrow(/duplicate/)

    const unexpected = structuredClone(good) as GameState
    const u0 = unexpected.columns[0] as Card[]
    if (u0[0]) u0[0] = { ...u0[0], id: 'X1#0' as never, suit: 'S', rank: 1 }
    expect(() => assertInvariants(unexpected)).toThrow(/unexpected/)

    const badTail = structuredClone(good) as GameState
    const col = badTail.columns[0] as Card[]
    col[col.length - 1] = { ...col[col.length - 1]!, faceUp: false }
    expect(() => assertInvariants(badTail)).toThrow(/tail must be face-up/)

    const faceOrder = structuredClone(good) as GameState
    const fcol = faceOrder.columns[0] as Card[]
    fcol[0] = { ...fcol[0]!, faceUp: true }
    fcol[1] = { ...fcol[1]!, faceUp: false }
    expect(() => assertInvariants(faceOrder)).toThrow(/face-down above face-up/)

    const badStockLen = {
      ...good,
      stock: [...good.stock, good.stock[0]!],
    }
    expect(() => assertInvariants(badStockLen)).toThrow(/invalid stock length/)

    const badBatch = {
      ...good,
      stock: [[makeCard('S', 1, 0, true)], ...good.stock.slice(1)],
    }
    expect(() => assertInvariants(badBatch as never)).toThrow(/stock batch/)

    const shortFound = {
      ...parseBoard(`difficulty: 1\nstock: 0\nfound: 1`),
      foundations: [cardsFromTokens(['SK', 'SQ'])],
    }
    expect(() => assertInvariants(shortFound as never)).toThrow(/complete 13-card/)

    const badKing = {
      ...parseBoard(`difficulty: 1\nstock: 0\nfound: 1`),
      foundations: [
        cardsFromTokens([
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
          'SK',
        ]),
      ],
    }
    expect(() => assertInvariants(badKing as never)).toThrow(/start with King/)

    const brokenRun = parseBoard(`difficulty: 1\nstock: 0\nfound: 1`)
    const fr = brokenRun.foundations[0]!.slice() as Card[]
    fr[2] = { ...fr[2]!, rank: 9 }
    expect(() => assertInvariants({ ...brokenRun, foundations: [fr] })).toThrow(
      /same-suit/,
    )

    const missingCard = structuredClone(good) as GameState
    const shortCol = missingCard.columns[0] as Card[]
    const faceDownIdx = shortCol.findIndex((c) => !c.faceUp)
    if (faceDownIdx >= 0) shortCol.splice(faceDownIdx, 1)
    else shortCol.shift()
    expect(() => assertInvariants(missingCard)).toThrow(/expected 104/)
  })
})

describe('ascii edges', () => {
  it('rejects bad lines and tokens', () => {
    expect(() => parseBoard('nope: 1')).toThrow(/unrecognized/)
    expect(() => parseBoard('c0: [0] X5')).toThrow()
    expect(() => parseBoard('stock: 15')).toThrow(/multiple of 10/)
    expect(() =>
      parseBoard(`
        difficulty: 1
        found: 8
        stock: 50
      `),
    ).toThrow(/not enough cards for stock/)
    expect(() =>
      parseBoard(`
        difficulty: 1
        found: 9
        stock: 0
      `),
    ).toThrow(/cannot build foundation/)
    expect(printBoard(deal(1, 1))).toContain('c0:')
    expect(cardsFromTokens(['SA'])[0]?.rank).toBe(1)
  })

  it('prints empty columns', () => {
    const state = parseBoard(`
      difficulty: 1
      c0: -
      stock: 0
      found: 0
    `)
    expect(printBoard(state)).toContain('c1: -')
    // all-empty + leftovers path fills c0
    expect(state.columns[0]?.length).toBeGreaterThan(0)
  })
})
