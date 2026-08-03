import { create } from 'zustand'
import {
  attemptMove as engineAttempt,
  canDeal,
  columnMovableLength,
  createGame,
  gameWon,
  hintableMoves,
  rankTapDestinations,
  redo as engineRedo,
  remainingDeals,
  restartDeal as engineRestart,
  undo as engineUndo,
} from '@/engine/game'
import { scoreFromState } from '@/engine/scoring'
import type {
  ColumnIndex,
  Difficulty,
  GameHandle,
  GameSettings,
  Move,
} from '@/engine/types'
import { DEFAULT_GAME_SETTINGS } from '@/engine/types'
import { useSettingsStore } from './settingsStore'
import { useUiStore } from './uiStore'

function randomSeed(): number {
  return (Math.random() * 0xffffffff) >>> 0
}

function settingsFromStore(): GameSettings {
  const s = useSettingsStore.getState()
  return {
    allowDealWithEmptyColumn: s.allowDealWithEmptyColumn,
    undoPenalty: s.undoPenalty,
  }
}

function withScore(handle: GameHandle, undoCount: number): GameHandle {
  const score = scoreFromState(handle.state, undoCount, handle.settings.undoPenalty)
  if (score === handle.state.score) return handle
  return {
    ...handle,
    state: { ...handle.state, score },
  }
}

export interface GameStoreState {
  readonly handle: GameHandle
  readonly undoCount: number
  readonly startedAt: number
  newGame: (opts?: { seed?: number; difficulty?: Difficulty }) => void
  attemptMove: (move: Move) => boolean
  tapMove: (from: ColumnIndex, count: number) => boolean
  dealStock: () => boolean
  undo: () => void
  redo: () => void
  restartDeal: () => void
  requestHint: () => Move | null
  canUndo: () => boolean
  canRedo: () => boolean
  canDealStock: () => boolean
  isWon: () => boolean
  dealsLeft: () => number
  movableLength: (column: number) => number
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  handle: createGame(1, 1, DEFAULT_GAME_SETTINGS),
  undoCount: 0,
  startedAt: Date.now(),

  newGame: (opts = {}) => {
    const difficulty = opts.difficulty ?? useSettingsStore.getState().difficulty
    const seed = opts.seed ?? randomSeed()
    const handle = createGame(seed, difficulty, settingsFromStore())
    useUiStore.getState().clearSelection()
    useUiStore.getState().setHintMove(null)
    set({
      handle: withScore(handle, 0),
      undoCount: 0,
      startedAt: Date.now(),
    })
  },

  attemptMove: (move) => {
    const { handle } = get()
    const next = engineAttempt(handle, move)
    if (next === handle) return false
    useUiStore.getState().clearSelection()
    useUiStore.getState().setHintMove(null)
    set({ handle: withScore(next, get().undoCount) })
    if (gameWon(next)) {
      useUiStore.getState().openPanelById('win')
    }
    return true
  },

  tapMove: (from, count) => {
    const { handle } = get()
    const ranked = rankTapDestinations(handle.state, from, count)
    const best = ranked[0]
    if (!best) return false
    return get().attemptMove(best)
  },

  dealStock: () => {
    return get().attemptMove({ kind: 'dealStock' })
  },

  undo: () => {
    const { handle, undoCount } = get()
    const next = engineUndo(handle)
    if (next === handle) return
    const nextUndo = undoCount + 1
    useUiStore.getState().clearSelection()
    useUiStore.getState().setHintMove(null)
    set({ handle: withScore(next, nextUndo), undoCount: nextUndo })
  },

  redo: () => {
    const { handle, undoCount } = get()
    const next = engineRedo(handle)
    if (next === handle) return
    useUiStore.getState().clearSelection()
    useUiStore.getState().setHintMove(null)
    set({ handle: withScore(next, undoCount) })
  },

  restartDeal: () => {
    const { handle } = get()
    const next = engineRestart(handle)
    useUiStore.getState().clearSelection()
    useUiStore.getState().setHintMove(null)
    set({
      handle: withScore({ ...next, settings: settingsFromStore() }, 0),
      undoCount: 0,
      startedAt: Date.now(),
    })
  },

  requestHint: () => {
    const { handle } = get()
    const moves = hintableMoves(handle.state, handle.settings)
    const move = moves.find((m) => m.kind === 'moveRun') ?? moves[0] ?? null
    useUiStore.getState().setHintMove(move)
    return move
  },

  canUndo: () => get().handle.moveLog.length > 0,
  canRedo: () => get().handle.redoLog.length > 0,
  canDealStock: () => canDeal(get().handle),
  isWon: () => gameWon(get().handle),
  dealsLeft: () => remainingDeals(get().handle.state),
  movableLength: (column) => columnMovableLength(get().handle.state, column),
}))

/** Boot a fresh deal once settings are available (call from App mount). */
export function bootstrapGame(): void {
  useGameStore.getState().newGame()
}
