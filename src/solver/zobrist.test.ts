import { describe, expect, it } from 'vitest'
import { createGame } from '@/engine/game'
import { mulberry32 } from '@/engine/rng'
import type { Difficulty } from '@/engine/types'
import {
  applyCompactMove,
  compactColumns,
  compactLegalMoves,
  COMPACT_SIZE,
  MAX_LEGAL_MOVES,
  toCompact,
} from './compact'
import { compactKey, hashCompact, hashState } from './zobrist'

/** Walk a deal at random, collecting every distinct board and its key. */
function playout(
  seed: number,
  difficulty: Difficulty,
  steps: number,
): { boards: Map<number, string>; visits: number } {
  const { state } = createGame(seed, difficulty)
  const { buf: initial, deal } = toCompact(state)
  let buf = initial
  const scratch = new Uint8Array(COMPACT_SIZE)
  const out = new Uint16Array(MAX_LEGAL_MOVES)
  const rng = mulberry32(seed ^ 0x1234)

  const boards = new Map<number, string>()
  let visits = 0

  for (let i = 0; i < steps; i++) {
    // Columns are interchangeable, and the key says so, so the signature has to
    // agree: sort the column dumps before comparing.
    const signature = compactColumns(buf)
      .map((col) => col.join(','))
      .sort()
      .join(';')
    const key = compactKey(buf)
    const existing = boards.get(key)
    if (existing === undefined) boards.set(key, signature)
    else expect(existing).toBe(signature)
    visits += 1

    const n = compactLegalMoves(buf, deal, true, out)
    if (n === 0) break
    applyCompactMove(buf, scratch, out[Math.floor(rng() * n)]!, deal)
    buf = new Uint8Array(scratch)
  }

  return { boards, visits }
}

describe('zobrist hashing', () => {
  /**
   * A collision would let the search discard a position it has never actually
   * seen, which is how a sound `unsolvable` verdict turns into a lie. This walks
   * a long way through all three difficulties and asserts that every board
   * sharing a key really is the same board.
   */
  it('assigns distinct keys to distinct boards across long playouts', () => {
    let distinct = 0
    for (const difficulty of [1, 2, 4] as const) {
      for (let seed = 1; seed <= 60; seed++) {
        const { boards } = playout(seed, difficulty, 600)
        distinct += boards.size
      }
    }
    // Random play dead-ends well before 600 moves, so the sample comes from
    // breadth across seeds rather than depth within one.
    expect(distinct).toBeGreaterThan(15_000)
  })

  it('is stable across repeated hashing of the same board', () => {
    const { buf } = toCompact(createGame(31, 4).state)
    const first = hashCompact(buf)
    const second = hashCompact(new Uint8Array(buf))
    expect(second).toEqual(first)
  })

  it('changes when a single card flips face up', () => {
    const { buf } = toCompact(createGame(31, 4).state)
    const before = compactKey(buf)
    const flipped = new Uint8Array(buf)
    flipped[0] = flipped[0]! ^ 64
    expect(compactKey(flipped)).not.toBe(before)
  })

  it('changes when two cards swap positions within a column', () => {
    const { buf } = toCompact(createGame(31, 4).state)
    const before = compactKey(buf)
    const swapped = new Uint8Array(buf)
    const a = swapped[0]!
    swapped[0] = swapped[1]!
    swapped[1] = a
    expect(a).not.toBe(swapped[0])
    expect(compactKey(swapped)).not.toBe(before)
  })

  it('separates boards that differ only in foundation or stock count', () => {
    const { buf } = toCompact(createGame(5, 2).state)
    const moreFoundations = new Uint8Array(buf)
    moreFoundations[115] = 1
    const moreDealt = new Uint8Array(buf)
    moreDealt[114] = 1

    const keys = new Set([
      compactKey(buf),
      compactKey(moreFoundations),
      compactKey(moreDealt),
    ])
    expect(keys.size).toBe(3)
  })

  it('hashes a GameState through the compact adapter', () => {
    const state = createGame(8, 1).state
    expect(hashState(state)).toEqual(hashCompact(toCompact(state).buf))
  })
})
