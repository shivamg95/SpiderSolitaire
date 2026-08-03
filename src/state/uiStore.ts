import { create } from 'zustand'
import type { CardId, ColumnIndex, Move } from '@/engine/types'

export type PanelId = 'menu' | 'settings' | 'win' | null

export interface SelectedRun {
  readonly column: ColumnIndex
  readonly count: number
  readonly cardIds: readonly CardId[]
}

export interface UiState {
  readonly openPanel: PanelId
  readonly hintMove: Move | null
  readonly selectedRun: SelectedRun | null
  openPanelById: (panel: PanelId) => void
  closePanel: () => void
  setHintMove: (move: Move | null) => void
  setSelectedRun: (run: SelectedRun | null) => void
  clearSelection: () => void
}

export const useUiStore = create<UiState>((set) => ({
  openPanel: null,
  hintMove: null,
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
  setSelectedRun: (selectedRun) => {
    set({ selectedRun })
  },
  clearSelection: () => {
    set({ selectedRun: null })
  },
}))
