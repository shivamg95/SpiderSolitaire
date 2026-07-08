export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs'

export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13

export interface Card {
  id: string
  suit: Suit
  rank: Rank
  faceUp: boolean
}

export type GameMode = 'easy' | 'medium' | 'hard'

export type GameStatus = 'idle' | 'playing' | 'won' | 'lost'

export interface GameSnapshot {
  columns: Card[][]
  stock: Card[]
  foundations: number
  moves: number
}

export interface GameState {
  columns: Card[][]
  stock: Card[]
  foundations: number
  moves: number
  gameMode: GameMode
  gameStatus: GameStatus
  startTime: number | null
  undoStack: GameSnapshot[]
  redoStack: GameSnapshot[]
}

export interface Move {
  fromColumn: number | 'stock'
  toColumn: number
  cardCount: number
}

export const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs']

export const RANK_NAMES: Record<Rank, string> = {
  1: 'A',
  11: 'J',
  12: 'Q',
  13: 'K',
} as Record<Rank, string>

export function getRankName(rank: Rank): string {
  return RANK_NAMES[rank] ?? String(rank)
}

export const SUIT_SYMBOLS: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
}

export const TABLEAU_COLUMNS = 10
export const DECK_SIZE = 104
export const STOCK_DEAL_SIZE = 10
export const MAX_FOUNDATIONS = 8
