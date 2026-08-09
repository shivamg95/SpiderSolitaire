import type { Card, ColumnIndex, GameSettings, GameState, Move } from './types'
import { DEFAULT_GAME_SETTINGS, FOUNDATION_TARGET } from './types'

export function isRun(cards: readonly Card[]): boolean {
  if (cards.length === 0) return false
  for (const card of cards) {
    if (!card.faceUp) return false
  }
  const first = cards[0]!
  for (let i = 1; i < cards.length; i++) {
    const prev = cards[i - 1]!
    const curr = cards[i]!
    if (curr.suit !== first.suit) return false
    if (curr.rank !== prev.rank - 1) return false
  }
  return true
}

export function movableRunLength(column: readonly Card[]): number {
  if (column.length === 0) return 0
  let length = 1
  for (let i = column.length - 1; i > 0; i--) {
    const lower = column[i]!
    const upper = column[i - 1]!
    if (!upper.faceUp || !lower.faceUp) break
    if (upper.suit !== lower.suit) break
    if (upper.rank !== lower.rank + 1) break
    length += 1
  }
  return length
}

/**
 * Face-up cards above the movable same-suit suffix — visible but not pickable.
 * The break card is the face-up card immediately above that suffix (if any).
 */
export function lockedFaceUpRunVisual(column: readonly Card[]): {
  lockedIds: readonly Card['id'][]
  breakId: Card['id'] | null
} {
  const movable = movableRunLength(column)
  if (column.length === 0 || movable >= column.length) {
    return { lockedIds: [], breakId: null }
  }

  const lockedEnd = column.length - movable
  const lockedIds: Card['id'][] = []
  for (let i = 0; i < lockedEnd; i++) {
    const card = column[i]!
    if (card.faceUp) lockedIds.push(card.id)
  }

  const breakCard = column[lockedEnd - 1]
  const breakId = breakCard?.faceUp ? breakCard.id : null
  return { lockedIds, breakId }
}

export function canPlace(run: readonly Card[], destColumn: readonly Card[]): boolean {
  if (run.length === 0 || !isRun(run)) return false
  if (destColumn.length === 0) return true
  const destTop = destColumn[destColumn.length - 1]!
  const runHead = run[0]!
  if (!destTop.faceUp) return false
  return destTop.rank === runHead.rank + 1
}

export function canDealStock(
  state: GameState,
  settings: GameSettings = DEFAULT_GAME_SETTINGS,
): boolean {
  if (state.stock.length === 0) return false
  if (settings.allowDealWithEmptyColumn) return true
  return state.columns.every((col) => col.length > 0)
}

export function isWon(state: GameState): boolean {
  return state.foundations.length === FOUNDATION_TARGET
}

export function isDeadEnd(
  state: GameState,
  settings: GameSettings = DEFAULT_GAME_SETTINGS,
): boolean {
  if (isWon(state)) return false
  return legalMoves(state, settings).length === 0
}

export function legalMoves(
  state: GameState,
  settings: GameSettings = DEFAULT_GAME_SETTINGS,
): Move[] {
  const moves: Move[] = []

  for (let from = 0; from < state.columns.length; from++) {
    const column = state.columns[from]
    if (!column || column.length === 0) continue
    const max = movableRunLength(column)
    for (let count = 1; count <= max; count++) {
      const run = column.slice(column.length - count)
      for (let to = 0; to < state.columns.length; to++) {
        if (to === from) continue
        const dest = state.columns[to]
        if (!dest) continue
        if (canPlace(run, dest)) {
          moves.push({
            kind: 'moveRun',
            from: from as ColumnIndex,
            to: to as ColumnIndex,
            count,
          })
        }
      }
    }
  }

  if (canDealStock(state, settings)) {
    moves.push({ kind: 'dealStock' })
  }

  return moves
}

/** Complete same-suit K→A run at the tail, if present. */
export function completedRunAtTail(column: readonly Card[]): readonly Card[] | null {
  if (column.length < 13) return null
  const run = column.slice(column.length - 13)
  const head = run[0]
  if (head?.rank !== 13) return null
  if (!isRun(run)) return null
  return run
}
