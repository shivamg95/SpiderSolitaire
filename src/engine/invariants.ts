import { copiesPerSuit, suitsForDifficulty } from './cards'
import type { Card, GameState } from './types'

export class InvariantError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvariantError'
  }
}

function cardKey(card: Card): string {
  return card.id
}

export function assertInvariants(state: GameState): void {
  const suits = suitsForDifficulty(state.difficulty)
  const copies = copiesPerSuit(state.difficulty)
  const expectedIds = new Set<string>()
  for (const suit of suits) {
    for (let copy = 0; copy < copies; copy++) {
      for (let rank = 1; rank <= 13; rank++) {
        expectedIds.add(`${suit}${rank}#${copy}`)
      }
    }
  }

  const seen = new Set<string>()
  const visit = (cards: readonly Card[], context: string) => {
    for (const card of cards) {
      if (seen.has(cardKey(card))) {
        throw new InvariantError(`duplicate card ${card.id} in ${context}`)
      }
      seen.add(cardKey(card))
      if (!expectedIds.has(card.id)) {
        throw new InvariantError(`unexpected card ${card.id} in ${context}`)
      }
    }
  }

  if (state.columns.length !== 10) {
    throw new InvariantError(`expected 10 columns, got ${state.columns.length}`)
  }

  for (let i = 0; i < state.columns.length; i++) {
    const column = state.columns[i]
    if (!column) throw new InvariantError(`missing column ${i}`)
    visit(column, `column ${i}`)

    let seenFaceUp = false
    for (const card of column) {
      if (card.faceUp) seenFaceUp = true
      else if (seenFaceUp) {
        throw new InvariantError(`face-down above face-up in column ${i}`)
      }
    }
    if (column.length > 0) {
      const tail = column[column.length - 1]
      if (!tail?.faceUp) {
        throw new InvariantError(`column ${i} tail must be face-up`)
      }
    }
  }

  const stockCards = state.stock.length * 10
  if (![0, 10, 20, 30, 40, 50].includes(stockCards)) {
    throw new InvariantError(`invalid stock length ${stockCards}`)
  }
  for (let i = 0; i < state.stock.length; i++) {
    const batch = state.stock[i]
    if (!batch?.length || batch.length !== 10) {
      throw new InvariantError(`stock batch ${i} must have 10 cards`)
    }
    visit(batch, `stock ${i}`)
  }

  for (let i = 0; i < state.foundations.length; i++) {
    const foundation = state.foundations[i]
    if (foundation?.length !== 13) {
      throw new InvariantError(`foundation ${i} must be a complete 13-card run`)
    }
    const head = foundation[0]
    if (head?.rank !== 13) {
      throw new InvariantError(`foundation ${i} must start with King`)
    }
    for (let j = 1; j < foundation.length; j++) {
      const prev = foundation[j - 1]
      const curr = foundation[j]
      if (!prev || !curr) throw new InvariantError(`foundation ${i} gap`)
      if (curr.suit !== head.suit || curr.rank !== prev.rank - 1) {
        throw new InvariantError(`foundation ${i} is not a same-suit K→A run`)
      }
    }
    visit(foundation, `foundation ${i}`)
  }

  if (seen.size !== 104) {
    throw new InvariantError(`expected 104 cards, saw ${seen.size}`)
  }
}
