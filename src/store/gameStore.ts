import { create } from 'zustand'
import type { GameMode, GameSnapshot, GameState, Move } from '../types'
import { MAX_FOUNDATIONS, TABLEAU_COLUMNS } from '../types'
import { createDeck, dealFromStock, dealGame, resetCardIdCounter, shuffle } from '../engine/deck'
import {
  canAutoComplete,
  executeMove,
  isMovableRun,
  isValidMove,
  removeCompleteSequences,
  suggestMove,
} from '../engine/rules'

const STORAGE_KEY = 'spider-solitaire-save'

interface GameActions {
  newGame: (mode: GameMode) => void
  moveCard: (fromColumn: number, toColumn: number, cardCount: number) => boolean
  dealStock: () => boolean
  undo: () => void
  redo: () => void
  hasUndo: () => boolean
  hasRedo: () => boolean
  hint: () => Move | null
  autoComplete: () => number
  loadGame: () => boolean
  resign: () => void
}

type GameStore = GameState & GameActions

function snapshot(state: GameState): GameSnapshot {
  return {
    columns: state.columns.map((col) =>
      col.map((c) => ({ ...c }))
    ),
    stock: state.stock.map((c) => ({ ...c })),
    foundations: state.foundations,
    moves: state.moves,
  }
}

function restoreSnapshot(snap: GameSnapshot): Pick<GameState, 'columns' | 'stock' | 'foundations' | 'moves'> {
  return {
    columns: snap.columns.map((col) =>
      col.map((c) => ({ ...c }))
    ),
    stock: snap.stock.map((c) => ({ ...c })),
    foundations: snap.foundations,
    moves: snap.moves,
  }
}

function saveToStorage(state: GameState): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        columns: state.columns,
        stock: state.stock,
        foundations: state.foundations,
        moves: state.moves,
        gameMode: state.gameMode,
        gameStatus: state.gameStatus,
        startTime: state.startTime,
        undoStack: state.undoStack,
        redoStack: state.redoStack,
      })
    )
  } catch {
    // Storage full or unavailable
  }
}

export const useGameStore = create<GameStore>((set, get) => ({
  columns: [],
  stock: [],
  foundations: 0,
  moves: 0,
  gameMode: 'easy',
  gameStatus: 'idle',
  startTime: null,
  undoStack: [],
  redoStack: [],

  newGame: (mode: GameMode) => {
    resetCardIdCounter()
    const deck = createDeck(mode)
    const shuffled = shuffle(deck)
    const { columns, stock } = dealGame(shuffled)

    set({
      columns,
      stock,
      foundations: 0,
      moves: 0,
      gameMode: mode,
      gameStatus: 'playing',
      startTime: Date.now(),
      undoStack: [],
      redoStack: [],
    })

    const state = get()
    saveToStorage(state)
  },

  moveCard: (fromColumn: number, toColumn: number, cardCount: number) => {
    const state = get()
    if (state.gameStatus !== 'playing') return false

    const sourceCol = state.columns[fromColumn]
    if (!sourceCol || sourceCol.length === 0) return false
    if (cardCount <= 0 || cardCount > sourceCol.length) return false

    const startIndex = sourceCol.length - cardCount

    if (!isValidMove(state.columns, fromColumn, toColumn, startIndex)) return false
    if (!isMovableRun(sourceCol, startIndex)) return false

    const undoSnap = snapshot(state)
    let newColumns = executeMove(state.columns, { fromColumn, toColumn, cardCount })
    let newMoves = state.moves + 1

    const { columns: cleaned, removed } = removeCompleteSequences(newColumns)
    newColumns = cleaned
    const newFoundations = state.foundations + removed

    let newStatus: GameState['gameStatus'] = state.gameStatus
    if (newFoundations >= MAX_FOUNDATIONS) {
      newStatus = 'won'
    }

    const updatedState: Partial<GameState> = {
      columns: newColumns,
      foundations: newFoundations,
      moves: newMoves,
      gameStatus: newStatus,
      undoStack: [...state.undoStack, undoSnap],
      redoStack: [], // Clear redo on new move
    }

    set(updatedState)
    saveToStorage(get() as GameState)
    return true
  },

  dealStock: () => {
    const state = get()
    if (state.gameStatus !== 'playing') return false

    if (state.stock.length < TABLEAU_COLUMNS) return false

    // Check all columns have at least one card (stock deal rule)
    for (let i = 0; i < TABLEAU_COLUMNS; i++) {
      if (state.columns[i].length === 0) return false
    }

    const undoSnap = snapshot(state)
    const { stock, columns } = dealFromStock(state.stock, state.columns)

    const updatedState: Partial<GameState> = {
      columns,
      stock,
      moves: state.moves + 1,
      undoStack: [...state.undoStack, undoSnap],
      redoStack: [],
    }

    set(updatedState)
    saveToStorage(get() as GameState)
    return true
  },

  undo: () => {
    const state = get()
    if (state.undoStack.length === 0) return

    const redoSnap = snapshot(state)
    const prevSnap = state.undoStack[state.undoStack.length - 1]
    const restored = restoreSnapshot(prevSnap)

    set({
      ...restored,
      undoStack: state.undoStack.slice(0, -1),
      redoStack: [...state.redoStack, redoSnap],
    })

    saveToStorage(get() as GameState)
  },

  redo: () => {
    const state = get()
    if (state.redoStack.length === 0) return

    const undoSnap = snapshot(state)
    const nextSnap = state.redoStack[state.redoStack.length - 1]
    const restored = restoreSnapshot(nextSnap)

    set({
      ...restored,
      undoStack: [...state.undoStack, undoSnap],
      redoStack: state.redoStack.slice(0, -1),
    })

    saveToStorage(get() as GameState)
  },

  hasUndo: () => {
    return get().undoStack.length > 0
  },

  hasRedo: () => {
    return get().redoStack.length > 0
  },

  hint: () => {
    const state = get()
    if (state.gameStatus !== 'playing') return null
    return suggestMove(state.columns)
  },

  autoComplete: () => {
    const state = get()
    if (!canAutoComplete(state.columns, state.stock)) return 0

    let currentColumns = state.columns.map(col => [...col])
    let currentFoundations = state.foundations
    let totalRemoved = 0

    while (currentFoundations < MAX_FOUNDATIONS) {
      const { columns: cleaned, removed } = removeCompleteSequences(currentColumns)
      if (removed === 0) break
      currentColumns = cleaned
      currentFoundations += removed
      totalRemoved += removed
    }

    set({
      columns: currentColumns,
      foundations: currentFoundations,
      moves: state.moves + 1,
      gameStatus: currentFoundations >= MAX_FOUNDATIONS ? 'won' : state.gameStatus,
    })

    saveToStorage(get() as GameState)
    return totalRemoved
  },

  loadGame: () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (!saved) return false

      const data = JSON.parse(saved)
      if (!data.columns || !data.stock || data.gameStatus !== 'playing') return false

      set({
        columns: data.columns,
        stock: data.stock,
        foundations: data.foundations ?? 0,
        moves: data.moves ?? 0,
        gameMode: data.gameMode ?? 'easy',
        gameStatus: data.gameStatus,
        startTime: data.startTime ?? Date.now(),
        undoStack: data.undoStack ?? [],
        redoStack: data.redoStack ?? [],
      })

      return true
    } catch {
      return false
    }
  },

  resign: () => {
    const state = get()
    if (state.gameStatus !== 'playing') return

    set({ gameStatus: 'lost' })
    saveToStorage(get() as GameState)
  },
}))
