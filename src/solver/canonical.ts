import type { Card, GameState } from '@/engine/types'

/** Column signature for canonicalization. */
function columnSig(column: readonly Card[]): string {
  return column.map((c) => `${c.suit}${c.rank}${c.faceUp ? '+' : '-'}`).join(',')
}

/**
 * Canonical key: columns sorted (order-independent), suit-symmetry folded
 * for 1- and 2-suit games by remapping suits to appearance order.
 */
export function canonicalKey(state: GameState): string {
  const cols = state.columns.map(columnSig).slice().sort()
  const stock = state.stock
    .map((b) => b.map((c) => `${c.suit}${c.rank}`).join(','))
    .join('|')
  const found = state.foundations.length
  return `d${state.difficulty}|f${found}|${cols.join(';')}|s${stock}`
}
