import type { Card, GameState } from '@/engine/types'
import { COLUMN_COUNT } from '@/engine/types'
import { cardByte, COLLEN_OFF, FOUND_OFF, STOCK_DEALT_OFF, toCompact } from './compact'

/** Incremental 64-bit hash via two 32-bit halves. */
export interface ZobristHash {
  readonly hi: number
  readonly lo: number
}

const CARD_BYTES = 128
const MAX_POSITION = 104
const TABLE_ENTRIES = CARD_BYTES * MAX_POSITION

let table: Uint32Array | null = null

/**
 * Random pairs indexed by `(cardByte, positionInColumn)`.
 *
 * Note what is deliberately absent: the column index. Column order is not part
 * of a Spider position — a board is the same board however its ten piles are
 * arranged — so hashing per column and then combining the columns
 * commutatively folds all 10! orderings onto one key. That is the property the
 * old string `canonicalKey` bought by sorting column signatures, kept here
 * without building a string per node.
 */
function ensureTable(): Uint32Array {
  if (table) return table
  let seed = 0xc0ffee11
  const next = (): number => {
    seed = (seed + 0x6d2b79f5) >>> 0
    let r = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return (r ^ (r >>> 14)) >>> 0
  }
  const built = new Uint32Array(TABLE_ENTRIES * 2)
  for (let i = 0; i < built.length; i++) built[i] = next()
  table = built
  return built
}

/** Avalanche so that column hashes can be summed without clustering. */
function mix32(value: number): number {
  let x = value >>> 0
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b)
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35)
  return (x ^ (x >>> 16)) >>> 0
}

/** Order-independent hash of a compact board. */
export function hashCompact(buf: Uint8Array): ZobristHash {
  const t = ensureTable()
  let hi = 0
  let lo = 0
  let start = 0

  for (let col = 0; col < COLUMN_COUNT; col++) {
    const len = buf[COLLEN_OFF + col]!
    let colHi = 0x9e3779b9
    let colLo = 0x85ebca6b
    for (let i = 0; i < len; i++) {
      const base = (buf[start + i]! * MAX_POSITION + i) * 2
      colHi ^= t[base]!
      colLo ^= t[base + 1]!
    }
    // Summing the mixed column hashes keeps the combine commutative while
    // avoiding the cancellation XOR would produce for two identical columns.
    hi = (hi + mix32(colHi)) >>> 0
    lo = (lo + mix32(colLo ^ len)) >>> 0
    start += len
  }

  hi = mix32(hi ^ Math.imul(buf[FOUND_OFF]! + 1, 0x27d4eb2f))
  lo = mix32(lo ^ Math.imul(buf[STOCK_DEALT_OFF]! + 1, 0x165667b1))

  return { hi, lo }
}

/**
 * A 53-bit transposition key, the widest integer a `Float64Array` slot holds
 * exactly. Two independent 32-bit halves feed it, so at the few million nodes a
 * search visits the odds of a collision are on the order of 1 in 10,000.
 */
export function compactKey(buf: Uint8Array): number {
  const { hi, lo } = hashCompact(buf)
  return hi * 2097152 + (lo >>> 11)
}

export function hashState(state: GameState): ZobristHash {
  const { buf } = toCompact(state)
  return hashCompact(buf)
}

export function hashKey(h: ZobristHash): string {
  return `${h.hi.toString(16)}:${h.lo.toString(16)}`
}

/** Hash a single card the way the table indexes it; exported for tests. */
export function cardSlot(card: Card, position: number): number {
  return (cardByte(card.suit, card.rank, card.faceUp) * MAX_POSITION + position) * 2
}
