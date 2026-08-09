import { create } from 'zustand'
import {
  attemptMove as engineAttempt,
  canDeal,
  columnMovableLength,
  createGame,
  gameWon,
  hintableMoves,
  movedCardIds,
  rankTapDestinations,
  redo as engineRedo,
  remainingDeals,
  restartDeal as engineRestart,
  undo as engineUndo,
} from '@/engine/game'
import { scoreFromState } from '@/engine/scoring'
import type {
  CardId,
  ColumnIndex,
  Difficulty,
  GameHandle,
  GameSettings,
  Move,
} from '@/engine/types'
import { DEFAULT_GAME_SETTINGS } from '@/engine/types'
import { rankedHints } from '@/solver/search'
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

function clearHints(): void {
  useUiStore.getState().stopHintPlayback()
}

export interface GameStoreState {
  readonly handle: GameHandle
  readonly undoCount: number
  readonly startedAt: number
  /** Cards whose board position changed in the most recent transition. */
  readonly movingIds: readonly CardId[]
  /** Bumped on every transition so the view can restart flight effects. */
  readonly moveSeq: number
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
  movingIds: [],
  moveSeq: 0,

  newGame: (opts = {}) => {
    const difficulty = opts.difficulty ?? useSettingsStore.getState().difficulty
    const seed = opts.seed ?? randomSeed()
    const handle = createGame(seed, difficulty, settingsFromStore())
    useUiStore.getState().clearSelection()
    clearHints()
    set({
      handle: withScore(handle, 0),
      undoCount: 0,
      startedAt: Date.now(),
      movingIds: [],
      moveSeq: get().moveSeq + 1,
    })
  },

  attemptMove: (move) => {
    const { handle } = get()
    const next = engineAttempt(handle, move)
    if (next === handle) return false
    useUiStore.getState().clearSelection()
    clearHints()
    set({
      handle: withScore(next, get().undoCount),
      movingIds: movedCardIds(handle.state, next.state),
      moveSeq: get().moveSeq + 1,
    })
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
    clearHints()
    set({
      handle: withScore(next, nextUndo),
      undoCount: nextUndo,
      movingIds: movedCardIds(handle.state, next.state),
      moveSeq: get().moveSeq + 1,
    })
  },

  redo: () => {
    const { handle, undoCount } = get()
    const next = engineRedo(handle)
    if (next === handle) return
    useUiStore.getState().clearSelection()
    clearHints()
    set({
      handle: withScore(next, undoCount),
      movingIds: movedCardIds(handle.state, next.state),
      moveSeq: get().moveSeq + 1,
    })
  },

  restartDeal: () => {
    const { handle } = get()
    const next = engineRestart(handle)
    useUiStore.getState().clearSelection()
    clearHints()
    set({
      handle: withScore({ ...next, settings: settingsFromStore() }, 0),
      undoCount: 0,
      startedAt: Date.now(),
      movingIds: [],
      moveSeq: get().moveSeq + 1,
    })
  },

  requestHint: () => {
    const ui = useUiStore.getState()
    if (ui.hintPlaying) {
      ui.stopHintPlayback()
      return null
    }
    const { handle } = get()
    const candidates = hintableMoves(handle.state, handle.settings)
    const ranked = rankedHints(
      handle.state,
      Math.max(1, candidates.length),
      handle.settings,
      candidates,
    )
    const moves = ranked.map((r) => r.move)
    ui.startHintPlayback(moves)
    return moves[0] ?? null
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
