export type Suit = 'S' | 'H' | 'D' | 'C'
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13
export type CardId = string & { readonly __brand: 'CardId' }
export type Difficulty = 1 | 2 | 4
export type ColumnIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

export interface Card {
  readonly id: CardId
  readonly suit: Suit
  readonly rank: Rank
  readonly faceUp: boolean
}

export type Move =
  | {
      readonly kind: 'moveRun'
      readonly from: ColumnIndex
      readonly to: ColumnIndex
      readonly count: number
    }
  | { readonly kind: 'dealStock' }

export interface GameSettings {
  readonly allowDealWithEmptyColumn: boolean
  readonly undoPenalty: boolean
}

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  allowDealWithEmptyColumn: true,
  undoPenalty: true,
}

export interface GameState {
  readonly difficulty: Difficulty
  readonly columns: readonly (readonly Card[])[]
  readonly stock: readonly (readonly Card[])[]
  readonly foundations: readonly (readonly Card[])[]
  readonly moveCount: number
  readonly score: number
}

export type Effect =
  | {
      readonly kind: 'moved'
      readonly from: ColumnIndex
      readonly to: ColumnIndex
      readonly cardIds: readonly CardId[]
    }
  | { readonly kind: 'flip'; readonly column: ColumnIndex; readonly cardId: CardId }
  | {
      readonly kind: 'foundation'
      readonly column: ColumnIndex
      readonly cardIds: readonly CardId[]
      readonly foundationIndex: number
    }
  | { readonly kind: 'deal'; readonly cardIds: readonly CardId[] }
  | { readonly kind: 'win' }

export type IllegalMoveReason =
  | 'not_movable_run'
  | 'cannot_place'
  | 'empty_column_blocks_deal'
  | 'stock_empty'
  | 'same_column'
  | 'invalid_count'

export type MoveResult =
  | { readonly ok: true; readonly state: GameState; readonly effects: readonly Effect[] }
  | { readonly ok: false; readonly reason: IllegalMoveReason }

export interface GameHandle {
  readonly seed: number
  readonly difficulty: Difficulty
  readonly moveLog: readonly Move[]
  readonly redoLog: readonly Move[]
  readonly state: GameState
  readonly settings: GameSettings
}

export const SUITS: readonly Suit[] = ['S', 'H', 'D', 'C']
export const RANKS: readonly Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]
export const COLUMN_COUNT = 10
export const FOUNDATION_TARGET = 8
export const INITIAL_SCORE = 500
export const FOUNDATION_BONUS = 100
export const SNAPSHOT_EVERY = 25
