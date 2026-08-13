import { create } from 'zustand'
import { MOVE_MS, RUN_STAGGER_MAX_MS, RUN_STAGGER_MS } from '@/animation/springs'
import { resolveMotionPreset } from '@/animation/useMotionPreset'
import {
  attemptMove as engineAttempt,
  canDeal,
  columnMovableLength,
  createGame,
  fold,
  gameWon,
  hintableMoves,
  movedCardIds,
  rankTapDestinations,
  redo as engineRedo,
  remainingDeals,
  restartDeal as engineRestart,
  stagedState,
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
import { applyMove } from '@/engine/moves'
import type { RankedHint, SolverCall } from '@/solver/client'
import type { LastWinnableResult } from '@/solver/rescue'
import { hintForMove, rankedHints, SYNC_HINT_BUDGET } from '@/solver/search'
import { pauseSeedMiner, resumeSeedMiner } from './miner'
import { nextVerifiedSeed } from './seedSource'
import { useSettingsStore } from './settingsStore'
import { getSolverClient } from './solverClient'
import { useUiStore } from './uiStore'

/** Breathing room between a run landing and the sweep starting. */
const COLLECT_GAP_MS = 60

let hintGeneration = 0

function invalidatePendingHints(): void {
  hintGeneration += 1
}

function syncRankedHints(handle: GameHandle): RankedHint[] {
  const candidates = hintableMoves(handle.state, handle.settings)
  return rankedHints(handle.state, 3, handle.settings, candidates, SYNC_HINT_BUDGET)
}

function movesEqual(a: Move, b: Move): boolean {
  if (a.kind === 'dealStock' && b.kind === 'dealStock') return true
  if (a.kind === 'moveRun' && b.kind === 'moveRun') {
    return a.from === b.from && a.to === b.to && a.count === b.count
  }
  return false
}

function clearRescueContinuation(): void {
  useUiStore.getState().setRescueContinuation([])
}

function randomSeed(): number {
  return (Math.random() * 0xffffffff) >>> 0
}

/**
 * Pick the seed for a new deal.
 *
 * With `winnableOnly` on this comes from the verified pool, which is a static
 * import, so the deal is still dealt synchronously — there is no loading state
 * to design around. Only a difficulty with an empty pool falls through to an
 * unverified shuffle.
 */
function seedForNewGame(difficulty: Difficulty): number {
  if (!useSettingsStore.getState().winnableOnly) return randomSeed()
  return nextVerifiedSeed(difficulty)?.seed ?? randomSeed()
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
  invalidatePendingHints()
  useUiStore.getState().stopHintPlayback()
}

/** How long the travelling cards need before the completed set is swept away. */
function collectDelayMs(travellingCount: number): number {
  const reduced = resolveMotionPreset(useSettingsStore.getState().reducedMotion).reduced
  if (reduced) return 120
  const stagger = Math.min(
    Math.max(0, travellingCount - 1) * RUN_STAGGER_MS,
    RUN_STAGGER_MAX_MS,
  )
  return MOVE_MS + stagger + COLLECT_GAP_MS
}

export interface GameStoreState {
  readonly handle: GameHandle
  readonly undoCount: number
  readonly startedAt: number
  /** Hints requested this deal (for stats / clean-hints achievement). */
  readonly hintsUsed: number
  /** Cards whose board position changed in the most recent transition. */
  readonly movingIds: readonly CardId[]
  /** Bumped on every transition so the view can restart flight effects. */
  readonly moveSeq: number
  /** True while a completed set is waiting to sweep to its foundation. */
  readonly collecting: boolean
  newGame: (opts?: { seed?: number; difficulty?: Difficulty }) => void
  attemptMove: (move: Move) => boolean
  tapMove: (from: ColumnIndex, count: number) => boolean
  dealStock: () => boolean
  undo: () => void
  redo: () => void
  restartDeal: () => void
  /** Starts async hint playback; cancels an in-flight hint when called again. */
  requestHint: () => void
  /** Truncate the move log to `index`. Discarded moves are not redoable. */
  rewindTo: (index: number) => void
  /** Find the latest still-winnable position and offer a rewind to it. */
  findRescue: () => void
  cancelRescue: () => void
  canUndo: () => boolean
  canRedo: () => boolean
  canDealStock: () => boolean
  isWon: () => boolean
  dealsLeft: () => number
  movableLength: (column: number) => number
}

export const useGameStore = create<GameStoreState>((set, get) => {
  let collectTimer: number | null = null
  let rescueSearch: SolverCall<LastWinnableResult> | null = null
  let rescueGeneration = 0

  function cancelCollect(): void {
    if (collectTimer === null) return
    window.clearTimeout(collectTimer)
    collectTimer = null
  }

  function publish(
    handle: GameHandle,
    movingIds: readonly CardId[],
    undoCount: number,
    collecting: boolean,
  ): void {
    set({
      handle: withScore(handle, undoCount),
      undoCount,
      movingIds,
      moveSeq: get().moveSeq + 1,
      collecting,
    })
    if (!collecting && gameWon(handle)) {
      useUiStore.getState().openPanelById('win')
    }
  }

  /**
   * Publish a transition, split in two when the move completes a K→A set: the
   * run flies to its column first, then the finished set sweeps to the
   * foundation as its own transition. Without the split both journeys start on
   * the same frame and the arriving card is never seen landing.
   */
  function commit(
    prev: GameHandle,
    next: GameHandle,
    move: Move | null,
    undoCount: number,
  ): void {
    cancelCollect()
    useUiStore.getState().clearSelection()
    clearHints()

    const staged =
      move !== null && typeof window !== 'undefined' ? stagedState(prev, move) : null
    if (staged === null) {
      publish(next, movedCardIds(prev.state, next.state), undoCount, false)
      return
    }

    const travelling = movedCardIds(prev.state, staged)
    publish({ ...next, state: staged }, travelling, undoCount, true)
    collectTimer = window.setTimeout(() => {
      collectTimer = null
      publish(next, movedCardIds(staged, next.state), get().undoCount, false)
    }, collectDelayMs(travelling.length))
  }

  function playContinuationHint(): boolean {
    const ui = useUiStore.getState()
    const { handle } = get()
    const next = ui.rescueContinuation[0]
    if (!next) return false
    if (!applyMove(handle.state, next, handle.settings).ok) {
      ui.setRescueContinuation([])
      return false
    }
    set({ hintsUsed: get().hintsUsed + 1 })
    ui.startHintPlayback([hintForMove(handle.state, next, handle.settings)])
    return true
  }

  return {
    handle: createGame(1, 1, DEFAULT_GAME_SETTINGS),
    undoCount: 0,
    hintsUsed: 0,
    startedAt: Date.now(),
    movingIds: [],
    moveSeq: 0,
    collecting: false,

    newGame: (opts = {}) => {
      const difficulty = opts.difficulty ?? useSettingsStore.getState().difficulty
      const seed = opts.seed ?? seedForNewGame(difficulty)
      const handle = createGame(seed, difficulty, settingsFromStore())
      cancelCollect()
      useUiStore.getState().clearSelection()
      clearHints()
      clearRescueContinuation()
      set({
        handle: withScore(handle, 0),
        undoCount: 0,
        hintsUsed: 0,
        startedAt: Date.now(),
        movingIds: [],
        moveSeq: get().moveSeq + 1,
        collecting: false,
      })
    },

    attemptMove: (move) => {
      const { handle, undoCount, collecting } = get()
      if (collecting) return false
      const next = engineAttempt(handle, move)
      if (next === handle) return false
      const head = useUiStore.getState().rescueContinuation[0]
      const followed = head !== undefined && movesEqual(head, move)
      commit(handle, next, move, undoCount)
      const ui = useUiStore.getState()
      if (followed) {
        ui.setRescueContinuation(ui.rescueContinuation.slice(1))
      } else {
        ui.setRescueContinuation([])
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
      const { handle, undoCount, collecting } = get()
      if (collecting) return
      const next = engineUndo(handle)
      if (next === handle) return
      clearRescueContinuation()
      commit(handle, next, null, undoCount + 1)
    },

    redo: () => {
      const { handle, undoCount, collecting } = get()
      if (collecting) return
      const move = handle.redoLog[0] ?? null
      const next = engineRedo(handle)
      if (next === handle) return
      clearRescueContinuation()
      commit(handle, next, move, undoCount)
    },

    restartDeal: () => {
      const { handle } = get()
      const next = engineRestart(handle)
      cancelCollect()
      useUiStore.getState().clearSelection()
      clearHints()
      clearRescueContinuation()
      set({
        handle: withScore({ ...next, settings: settingsFromStore() }, 0),
        undoCount: 0,
        hintsUsed: 0,
        startedAt: Date.now(),
        movingIds: [],
        moveSeq: get().moveSeq + 1,
        collecting: false,
      })
    },

    requestHint: () => {
      const ui = useUiStore.getState()
      if (ui.hintPlaying) {
        ui.stopHintPlayback()
        invalidatePendingHints()
        return
      }
      if (playContinuationHint()) return

      const { handle } = get()
      const gen = ++hintGeneration
      const applyHints = (ranked: RankedHint[]) => {
        if (gen !== hintGeneration) return
        if (ranked.length > 0) {
          set({ hintsUsed: get().hintsUsed + 1 })
        }
        ui.startHintPlayback(ranked)
      }

      void (async () => {
        try {
          const ranked = await getSolverClient().hint(handle.state, 3, handle.settings)
          applyHints(ranked)
        } catch {
          if (gen !== hintGeneration) return
          applyHints(syncRankedHints(handle))
        }
      })()
    },

    rewindTo: (index) => {
      const { handle, undoCount } = get()
      const target = Math.max(0, Math.min(index, handle.moveLog.length))
      if (target === handle.moveLog.length) return

      const moveLog = handle.moveLog.slice(0, target)
      const discarded = handle.moveLog.slice(target)
      const next: GameHandle = {
        ...handle,
        moveLog,
        redoLog: [],
        state: fold(handle.seed, handle.difficulty, moveLog, handle.settings, handle),
      }

      const ui = useUiStore.getState()
      ui.setRescuePlan(null)
      ui.closePanel()
      commit(handle, next, null, undoCount + discarded.length)
      playContinuationHint()
    },

    findRescue: () => {
      const { handle } = get()
      const ui = useUiStore.getState()

      rescueSearch?.cancel()
      pauseSeedMiner()
      ui.setRescueSearching(true)
      ui.setRescuePlan(null)
      ui.setRescueContinuation([])
      const generation = ++rescueGeneration

      const call = getSolverClient().lastWinnable(
        handle.seed,
        handle.difficulty,
        handle.moveLog,
        handle.settings,
      )
      rescueSearch = call

      void call.promise
        .then(({ index, continuation }) => {
          if (generation !== rescueGeneration) return
          const current = get().handle
          const next = useUiStore.getState()
          next.setRescuePlan({
            index,
            movesBack: current.moveLog.length - index,
            continuation,
          })
          next.setRescueContinuation(continuation)
        })
        .catch(() => {
          if (generation !== rescueGeneration) return
          const current = get().handle
          useUiStore.getState().setRescuePlan({
            index: 0,
            movesBack: current.moveLog.length,
            continuation: [],
          })
        })
        .finally(() => {
          resumeSeedMiner()
          if (generation !== rescueGeneration) return
          rescueSearch = null
          useUiStore.getState().setRescueSearching(false)
        })
    },

    cancelRescue: () => {
      rescueGeneration += 1
      rescueSearch?.cancel()
      rescueSearch = null
      const ui = useUiStore.getState()
      ui.setRescueSearching(false)
      ui.setRescuePlan(null)
    },

    canUndo: () => !get().collecting && get().handle.moveLog.length > 0,
    canRedo: () => !get().collecting && get().handle.redoLog.length > 0,
    canDealStock: () => !get().collecting && canDeal(get().handle),
    isWon: () => gameWon(get().handle),
    dealsLeft: () => remainingDeals(get().handle.state),
    movableLength: (column) => columnMovableLength(get().handle.state, column),
  }
})

/** Boot a fresh deal once settings are available (call from App mount). */
export function bootstrapGame(): void {
  useGameStore.getState().newGame()
}
