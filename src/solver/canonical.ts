import type { Card, GameState } from '@/engine/types'

/** Column signature for canonicalization. */
function columnSig(column: readonly Card[]): string {
  return column.map((c) => `${c.suit}${c.rank}${c.faceUp ? '+' : '-'}`).join(',')
}

/**
 * Transposition key for the hint search: columns sorted, so two positions that
 * differ only in which column a pile sits in share a key.
 *
 * Suits are *not* folded together, even though 1- and 2-suit decks have
 * interchangeable copies of a card. Hints are shallow, so the extra collapsing
 * would not pay for itself here; the full-game solver keys on `compactKey` in
 * zobrist.ts instead, which is both cheaper and finer-grained.
 */
export function canonicalKey(state: GameState): string {
  const cols = state.columns.map(columnSig).slice().sort()
  const stock = state.stock
    .map((b) => b.map((c) => `${c.suit}${c.rank}`).join(','))
    .join('|')
  const found = state.foundations.length
  return `d${state.difficulty}|f${found}|${cols.join(';')}|s${stock}`
}
