import { create } from 'zustand'
import type { CardId, ColumnIndex, Move } from '@/engine/types'
import type { RankedHint } from '@/solver/client'

export type PanelId = 'menu' | 'settings' | 'win' | 'share' | 'rescue' | null

/**
 * State of the safety net for the current position. `idle` before any check has
 * run, `checking` while the worker is looking. Only `lost` is ever surfaced as a
 * warning — see the Winnability docs in solver/rescue.ts for why `unknown` must
 * stay silent.
 */
export type WinnabilityState = 'idle' | 'checking' | 'winnable' | 'unknown' | 'lost'

export interface RescuePlan {
  /** Move-log length to rewind to; 0 is the original deal. */
  readonly index: number
  readonly movesBack: number
  /** Winning line from that prefix; empty when even the deal could not be proven. */
  readonly continuation: readonly Move[]
}

export interface SelectedRun {
  readonly column: ColumnIndex
  readonly count: number
  readonly cardIds: readonly CardId[]
}

export interface UiState {
  readonly openPanel: PanelId
  readonly hintQueue: readonly RankedHint[]
  readonly hintIndex: number
  readonly hintPlaying: boolean
  readonly selectedRun: SelectedRun | null
  /** Derived from hintQueue[hintIndex]; null when not playing. */
  readonly hintMove: Move | null
  /** Explanation for the current hint, if any. */
  readonly hintExplanation: string | null
  readonly hintConfidence: RankedHint['confidence'] | null
  readonly winnability: WinnabilityState
  /** True once the player has dismissed the warning for this position. */
  readonly warningDismissed: boolean
  readonly rescueSearching: boolean
  readonly rescuePlan: RescuePlan | null
  /** Remaining proven winning moves; Hint follows these until the player deviates. */
  readonly rescueContinuation: readonly Move[]
  setWinnability: (state: WinnabilityState) => void
  dismissWarning: () => void
  setRescueSearching: (searching: boolean) => void
  setRescuePlan: (plan: RescuePlan | null) => void
  setRescueContinuation: (moves: readonly Move[]) => void
  openPanelById: (panel: PanelId) => void
  closePanel: () => void
  setHintMove: (move: Move | null) => void
  startHintPlayback: (hints: readonly RankedHint[]) => void
  advanceHint: () => void
  stopHintPlayback: () => void
  setSelectedRun: (run: SelectedRun | null) => void
  clearSelection: () => void
}

function hintFields(queue: readonly RankedHint[], index: number, playing: boolean) {
  if (!playing || queue.length === 0) {
    return {
      hintMove: null as Move | null,
      hintExplanation: null as string | null,
      hintConfidence: null as RankedHint['confidence'] | null,
    }
  }
  const entry = queue[index] ?? queue[0]
  return {
    hintMove: entry?.move ?? null,
    hintExplanation: entry?.explanation ?? null,
    hintConfidence: entry?.confidence ?? null,
  }
}

export const useUiStore = create<UiState>((set, get) => ({
  openPanel: null,
  hintQueue: [],
  hintIndex: 0,
  hintPlaying: false,
  hintMove: null,
  hintExplanation: null,
  hintConfidence: null,
  selectedRun: null,
  winnability: 'idle',
  warningDismissed: false,
  rescueSearching: false,
  rescuePlan: null,
  rescueContinuation: [],
  setWinnability: (winnability) => {
    // A fresh verdict is a fresh chance to warn, so a warning dismissed for the
    // previous position does not silence this one.
    const previous = get().winnability
    if (previous === winnability) return
    set({ winnability, warningDismissed: false })
  },
  dismissWarning: () => {
    set({ warningDismissed: true })
  },
  setRescueSearching: (rescueSearching) => {
    set({ rescueSearching })
  },
  setRescuePlan: (rescuePlan) => {
    set({ rescuePlan })
  },
  setRescueContinuation: (rescueContinuation) => {
    set({ rescueContinuation })
  },
  openPanelById: (openPanel) => {
    set({ openPanel })
  },
  closePanel: () => {
    set({ openPanel: null })
  },
  setHintMove: (hintMove) => {
    set({ hintMove })
  },
  startHintPlayback: (hints) => {
    if (hints.length === 0) {
      set({
        hintQueue: [],
        hintIndex: 0,
        hintPlaying: false,
        ...hintFields([], 0, false),
      })
      return
    }
    set({
      hintQueue: [...hints],
      hintIndex: 0,
      hintPlaying: true,
      ...hintFields(hints, 0, true),
    })
  },
  advanceHint: () => {
    const { hintQueue, hintIndex, hintPlaying } = get()
    if (!hintPlaying || hintQueue.length === 0) return
    const next = (hintIndex + 1) % hintQueue.length
    set({
      hintIndex: next,
      ...hintFields(hintQueue, next, true),
    })
  },
  stopHintPlayback: () => {
    set({
      hintQueue: [],
      hintIndex: 0,
      hintPlaying: false,
      ...hintFields([], 0, false),
    })
  },
  setSelectedRun: (selectedRun) => {
    set({ selectedRun })
  },
  clearSelection: () => {
    set({ selectedRun: null })
  },
}))
