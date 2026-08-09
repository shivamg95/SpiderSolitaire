import { create } from 'zustand'
import type { CardId, ColumnIndex, Move } from '@/engine/types'

export type PanelId = 'menu' | 'settings' | 'win' | 'share' | null

export interface SelectedRun {
  readonly column: ColumnIndex
  readonly count: number
  readonly cardIds: readonly CardId[]
}

export interface UiState {
  readonly openPanel: PanelId
  readonly hintMove: Move | null
  readonly hintQueue: readonly Move[]
  readonly hintIndex: number
  readonly hintPlaying: boolean
  readonly selectedRun: SelectedRun | null
  openPanelById: (panel: PanelId) => void
  closePanel: () => void
  setHintMove: (move: Move | null) => void
  startHintPlayback: (moves: readonly Move[]) => void
  advanceHint: () => void
  stopHintPlayback: () => void
  setSelectedRun: (run: SelectedRun | null) => void
  clearSelection: () => void
}

export const useUiStore = create<UiState>((set, get) => ({
  openPanel: null,
  hintMove: null,
  hintQueue: [],
  hintIndex: 0,
  hintPlaying: false,
  selectedRun: null,
  openPanelById: (openPanel) => {
    set({ openPanel })
  },
  closePanel: () => {
    set({ openPanel: null })
  },
  setHintMove: (hintMove) => {
    set({ hintMove })
  },
  startHintPlayback: (moves) => {
    if (moves.length === 0) {
      set({
        hintQueue: [],
        hintIndex: 0,
        hintPlaying: false,
        hintMove: null,
      })
      return
    }
    set({
      hintQueue: [...moves],
      hintIndex: 0,
      hintPlaying: true,
      hintMove: moves[0] ?? null,
    })
  },
  advanceHint: () => {
    const { hintQueue, hintIndex, hintPlaying } = get()
    if (!hintPlaying || hintQueue.length === 0) return
    const next = (hintIndex + 1) % hintQueue.length
    set({
      hintIndex: next,
      hintMove: hintQueue[next] ?? null,
    })
  },
  stopHintPlayback: () => {
    set({
      hintQueue: [],
      hintIndex: 0,
      hintPlaying: false,
      hintMove: null,
    })
  },
  setSelectedRun: (selectedRun) => {
    set({ selectedRun })
  },
  clearSelection: () => {
    set({ selectedRun: null })
  },
}))
