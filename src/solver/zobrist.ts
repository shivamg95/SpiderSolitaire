import type { Card, GameState } from '@/engine/types'
import { COLUMN_COUNT } from '@/engine/types'

/** Incremental 64-bit hash via two 32-bit halves. */
export interface ZobristHash {
  readonly hi: number
  readonly lo: number
}

let table: Uint32Array | null = null

function ensureTable(): Uint32Array {
  if (table) return table
  // Deterministic seed for reproducibility
  let seed = 0xc0ffee11
  const next = () => {
    seed = (seed + 0x6d2b79f5) >>> 0
    let r = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return (r ^ (r >>> 14)) >>> 0
  }
  // slots: per card id hash pair × positions approx
  table = new Uint32Array(4096)
  for (let i = 0; i < table.length; i++) table[i] = next()
  return table
}

function cardIndex(card: Card): number {
  const suit = card.suit === 'S' ? 0 : card.suit === 'H' ? 1 : card.suit === 'D' ? 2 : 3
  const face = card.faceUp ? 1 : 0
  return (suit * 13 + (card.rank - 1)) * 2 + face
}

export function hashState(state: GameState): ZobristHash {
  const t = ensureTable()
  let hi = 0
  let lo = 0
  for (let col = 0; col < COLUMN_COUNT; col++) {
    const column = state.columns[col] ?? []
    for (let i = 0; i < column.length; i++) {
      const card = column[i]!
      const base = (cardIndex(card) * 17 + col * 3 + i) % (t.length / 2)
      hi ^= t[base * 2]!
      lo ^= t[base * 2 + 1]!
    }
  }
  hi ^= state.foundations.length * 0x9e3779b9
  lo ^= state.stock.length * 0x85ebca6b
  return { hi: hi >>> 0, lo: lo >>> 0 }
}

export function hashKey(h: ZobristHash): string {
  return `${h.hi.toString(16)}:${h.lo.toString(16)}`
}
