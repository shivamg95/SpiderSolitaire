import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { createGame } from '@/engine/game'
import { parseBoard } from '@/engine/testing/ascii'
import { applyMove } from '@/engine/moves'
import { legalMoves } from '@/engine/rules'
import type { Difficulty, GameState, Move } from '@/engine/types'
import { DEFAULT_GAME_SETTINGS } from '@/engine/types'
import {
  applyCompactMove,
  compactColumns,
  compactHeuristic,
  compactLegalMoves,
  COMPACT_SIZE,
  isCompactWon,
  decodeMoveCode,
  MAX_LEGAL_MOVES,
  toCompact,
} from './compact'
import { compactKey } from './zobrist'

const STRICT = { ...DEFAULT_GAME_SETTINGS, allowDealWithEmptyColumn: false }

function moveKey(move: Move): string {
  return move.kind === 'dealStock' ? 'deal' : `${move.from}>${move.to}x${move.count}`
}

/**
 * `compactLegalMoves` folds interchangeable empty columns down to one, so the
 * engine's list is compared after the same fold.
 */
function engineMoveKeys(state: GameState, settings = DEFAULT_GAME_SETTINGS): string[] {
  const firstEmpty = state.columns.findIndex((c) => c.length === 0)
  return legalMoves(state, settings)
    .filter(
      (m) =>
        m.kind === 'dealStock' || state.columns[m.to]!.length > 0 || m.to === firstEmpty,
    )
    .map(moveKey)
    .sort()
}

/** The board as the engine sees it, in the same token form as compactColumns. */
function engineColumns(state: GameState): string[][] {
  return state.columns.map((col) =>
    col.map((c) => `${c.suit}${c.rank}${c.faceUp ? '+' : '-'}`),
  )
}

describe('compact board encoding', () => {
  it('round-trips a fresh deal for every difficulty', () => {
    for (const difficulty of [1, 2, 4] as const) {
      const { state } = createGame(7, difficulty)
      const { buf, deal } = toCompact(state)
      expect(compactColumns(buf)).toEqual(engineColumns(state))
      expect(deal.batches).toBe(5)
      expect(deal.stock).toHaveLength(50)
    }
  })

  it('generates the same legal moves as the engine', () => {
    for (const difficulty of [1, 2, 4] as const) {
      const { state } = createGame(11, difficulty)
      const { buf, deal } = toCompact(state)
      const out = new Uint16Array(MAX_LEGAL_MOVES)
      const n = compactLegalMoves(buf, deal, true, out)
      const compact = Array.from(out.subarray(0, n), (c) => moveKey(decodeMoveCode(c)))
      expect(compact.sort()).toEqual(engineMoveKeys(state))
    }
  })

  it('honours allowDealWithEmptyColumn', () => {
    const { state } = createGame(3, 1)
    const { buf, deal } = toCompact(state)
    const out = new Uint16Array(MAX_LEGAL_MOVES)
    // A fresh deal has no empty column, so the strict rule changes nothing.
    expect(compactLegalMoves(buf, deal, false, out)).toBe(
      compactLegalMoves(buf, deal, true, out),
    )

    const emptied = new Uint8Array(buf)
    emptied[104] = 0
    expect(
      Array.from(out.subarray(0, compactLegalMoves(emptied, deal, false, out))).includes(
        0,
      ),
    ).toBe(false)
    expect(
      Array.from(out.subarray(0, compactLegalMoves(emptied, deal, true, out))).includes(
        0,
      ),
    ).toBe(true)
  })

  /**
   * The one test that really matters: drive a long random playout through the
   * engine and the byte encoding in lockstep. Any divergence in flips, set
   * collection, or stock dealing shows up as a heuristic or move-list mismatch.
   */
  it('stays in lockstep with the engine over random playouts', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100_000 }),
        fc.constantFrom<Difficulty>(1, 2, 4),
        fc.array(fc.integer({ min: 0, max: 999 }), { minLength: 60, maxLength: 60 }),
        (seed, difficulty, picks) => {
          let state = createGame(seed, difficulty).state
          const { buf: initial, deal } = toCompact(state)
          let buf = initial
          const scratch = new Uint8Array(COMPACT_SIZE)
          const out = new Uint16Array(MAX_LEGAL_MOVES)

          for (const pick of picks) {
            const n = compactLegalMoves(buf, deal, false, out)
            expect(
              Array.from(out.subarray(0, n), (c) => moveKey(decodeMoveCode(c))).sort(),
            ).toEqual(engineMoveKeys(state, STRICT))
            if (n === 0) break

            const code = out[pick % n]!
            const move = decodeMoveCode(code)

            const result = applyMove(state, move, STRICT)
            expect(result.ok).toBe(true)
            if (!result.ok) return
            state = result.state

            applyCompactMove(buf, scratch, code, deal)
            buf = new Uint8Array(scratch)

            expect(compactColumns(buf)).toEqual(engineColumns(state))
            expect(buf[115]).toBe(state.foundations.length)
            expect(isCompactWon(buf)).toBe(state.foundations.length === 8)
          }
        },
      ),
      { numRuns: 40 },
    )
  })

  /**
   * Regression guard for the bug that made the first search unable to win
   * 4-suit deals: with the hint weights, the 78-pair same-suit group scored
   * higher than the foundation it turns into, so completing a set looked like a
   * loss and the search learned to avoid it.
   */
  it('scores completing a set above holding the run', () => {
    for (const difficulty of [1, 2, 4] as const) {
      const ready = parseBoard(`
        difficulty: ${difficulty}
        c0: [0] SK SQ SJ S10 S9 S8 S7 S6 S5 S4 S3 S2
        c1: [0] SA
        stock: 0
        found: 0
      `)
      const { buf, deal } = toCompact(ready)
      const after = new Uint8Array(COMPACT_SIZE)
      const out = new Uint16Array(MAX_LEGAL_MOVES)
      const n = compactLegalMoves(buf, deal, true, out)
      const collecting = Array.from(out.subarray(0, n)).find((code) => {
        applyCompactMove(buf, after, code, deal)
        return after[115] === 1
      })

      expect(collecting).toBeDefined()
      applyCompactMove(buf, after, collecting!, deal)
      expect(compactHeuristic(after, difficulty)).toBeGreaterThan(
        compactHeuristic(buf, difficulty),
      )
    }
  })

  it('hashes boards independently of column order', () => {
    const { state } = createGame(21, 2)
    const { buf } = toCompact(state)

    const swapped = new Uint8Array(buf)
    const len0 = buf[104]!
    const len1 = buf[105]!
    swapped.set(buf.subarray(len0, len0 + len1), 0)
    swapped.set(buf.subarray(0, len0), len1)
    swapped[104] = len1
    swapped[105] = len0

    expect(compactKey(swapped)).toBe(compactKey(buf))
  })

  it('gives different keys to genuinely different boards', () => {
    const keys = new Set<number>()
    for (let seed = 0; seed < 400; seed++) {
      keys.add(compactKey(toCompact(createGame(seed, 4).state).buf))
    }
    expect(keys.size).toBe(400)
  })
})
