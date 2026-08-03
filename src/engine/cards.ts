import {
  type Card,
  type CardId,
  type Difficulty,
  type Rank,
  RANKS,
  type Suit,
  SUITS,
} from './types'

export function makeCardId(suit: Suit, rank: Rank, copy: number): CardId {
  return `${suit}${rank}#${copy}` as CardId
}

export function parseCardId(id: CardId): { suit: Suit; rank: Rank; copy: number } {
  const match = /^([SHDC])(\d+)#(\d+)$/.exec(id)
  if (!match) {
    throw new Error(`Invalid CardId: ${id}`)
  }
  const suit = match[1] as Suit
  const rank = Number(match[2]) as Rank
  const copy = Number(match[3])
  return { suit, rank, copy }
}

export function makeCard(suit: Suit, rank: Rank, copy: number, faceUp: boolean): Card {
  return {
    id: makeCardId(suit, rank, copy),
    suit,
    rank,
    faceUp,
  }
}

export function withFace(card: Card, faceUp: boolean): Card {
  if (card.faceUp === faceUp) return card
  return { ...card, faceUp }
}

/** Copies per suit for each difficulty. Total cards always 104. */
export function copiesPerSuit(difficulty: Difficulty): number {
  switch (difficulty) {
    case 1:
      return 8
    case 2:
      return 4
    case 4:
      return 2
  }
}

export function suitsForDifficulty(difficulty: Difficulty): readonly Suit[] {
  switch (difficulty) {
    case 1:
      return ['S']
    case 2:
      return ['S', 'H']
    case 4:
      return SUITS
  }
}

export function buildDeck(difficulty: Difficulty): Card[] {
  const suits = suitsForDifficulty(difficulty)
  const copies = copiesPerSuit(difficulty)
  const deck: Card[] = []
  for (const suit of suits) {
    for (let copy = 0; copy < copies; copy++) {
      for (const rank of RANKS) {
        deck.push(makeCard(suit, rank, copy, false))
      }
    }
  }
  return deck
}

export function rankLabel(rank: Rank): string {
  switch (rank) {
    case 1:
      return 'A'
    case 11:
      return 'J'
    case 12:
      return 'Q'
    case 13:
      return 'K'
    default:
      return String(rank)
  }
}

export function parseRankLabel(label: string): Rank {
  switch (label.toUpperCase()) {
    case 'A':
      return 1
    case 'J':
      return 11
    case 'Q':
      return 12
    case 'K':
      return 13
    default: {
      const n = Number(label)
      if (!Number.isInteger(n) || n < 1 || n > 13) {
        throw new Error(`Invalid rank label: ${label}`)
      }
      return n as Rank
    }
  }
}

export function formatCardToken(card: Pick<Card, 'suit' | 'rank'>): string {
  return `${card.suit}${rankLabel(card.rank)}`
}
