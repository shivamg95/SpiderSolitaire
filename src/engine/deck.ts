import type { Card, GameMode, Rank, Suit } from '../types'
import { SUITS, TABLEAU_COLUMNS } from '../types'

let cardIdCounter = 0

function generateCardId(): string {
  return `card-${++cardIdCounter}-${Date.now()}`
}

export function resetCardIdCounter(): void {
  cardIdCounter = 0
}

function getSuitsForMode(mode: GameMode): Suit[] {
  switch (mode) {
    case 'easy':
      return [SUITS[0]] // spades
    case 'medium':
      return [SUITS[0], SUITS[1]] // spades, hearts
    case 'hard':
      return [...SUITS] // all 4 suits
  }
}

function getSetsPerSuit(mode: GameMode): number {
  switch (mode) {
    case 'easy':
      return 8 // 8 sets of 13 spades = 104
    case 'medium':
      return 4 // 4 sets of 13 per suit × 2 suits = 104
    case 'hard':
      return 2 // 2 sets of 13 per suit × 4 suits = 104
  }
}

export function createDeck(mode: GameMode): Card[] {
  const suits = getSuitsForMode(mode)
  const setsPerSuit = getSetsPerSuit(mode)
  const deck: Card[] = []

  for (const suit of suits) {
    for (let set = 0; set < setsPerSuit; set++) {
      for (let rank = 1; rank <= 13; rank++) {
        deck.push({
          id: generateCardId(),
          suit,
          rank: rank as Rank,
          faceUp: false,
        })
      }
    }
  }

  return deck
}

export function shuffle(deck: Card[]): Card[] {
  const shuffled = [...deck]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export interface DealResult {
  columns: Card[][]
  stock: Card[]
  foundations: number
}

export function dealGame(deck: Card[]): DealResult {
  const columns: Card[][] = Array.from({ length: TABLEAU_COLUMNS }, () => [])
  let cardIndex = 0

  // First 4 columns get 6 cards, last 6 get 5 cards
  const columnSizes = [
    6, 6, 6, 6, // 4 columns of 6
    5, 5, 5, 5, 5, 5, // 6 columns of 5
  ]

  for (let col = 0; col < TABLEAU_COLUMNS; col++) {
    for (let i = 0; i < columnSizes[col]; i++) {
      const card = { ...deck[cardIndex] }
      card.faceUp = i === columnSizes[col] - 1 // last card face up
      columns[col].push(card)
      cardIndex++
    }
  }

  const stock = deck.slice(cardIndex)

  return { columns, stock, foundations: 0 }
}

export function dealFromStock(
  stock: Card[],
  columns: Card[][]
): { stock: Card[]; columns: Card[][] } {
  if (stock.length < TABLEAU_COLUMNS) {
    return { stock, columns }
  }

  const newStock = [...stock]
  const newColumns = columns.map((col) => [...col])

  for (let col = 0; col < TABLEAU_COLUMNS; col++) {
    const card = { ...newStock.shift()! }
    card.faceUp = true
    newColumns[col].push(card)
  }

  return { stock: newStock, columns: newColumns }
}
