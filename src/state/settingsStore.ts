import { create } from 'zustand'
import type { Difficulty, GameSettings } from '@/engine/types'
import { DEFAULT_THEME, applyTheme, isThemeId, type ThemeId } from '@/theme/themes'

export interface SettingsState {
  readonly difficulty: Difficulty
  readonly theme: ThemeId
  readonly allowDealWithEmptyColumn: boolean
  readonly undoPenalty: boolean
  readonly reducedMotion: boolean
  readonly soundMuted: boolean
  setDifficulty: (d: Difficulty) => void
  setTheme: (t: ThemeId) => void
  setAllowDealWithEmptyColumn: (v: boolean) => void
  setUndoPenalty: (v: boolean) => void
  setReducedMotion: (v: boolean) => void
  setSoundMuted: (v: boolean) => void
  toggleMute: () => void
  toGameSettings: () => GameSettings
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  difficulty: 1,
  theme: DEFAULT_THEME,
  allowDealWithEmptyColumn: false,
  undoPenalty: true,
  reducedMotion: false,
  soundMuted: false,
  setDifficulty: (difficulty) => {
    set({ difficulty })
  },
  setTheme: (theme) => {
    applyTheme(theme)
    set({ theme })
  },
  setAllowDealWithEmptyColumn: (allowDealWithEmptyColumn) => {
    set({ allowDealWithEmptyColumn })
  },
  setUndoPenalty: (undoPenalty) => {
    set({ undoPenalty })
  },
  setReducedMotion: (reducedMotion) => {
    set({ reducedMotion })
  },
  setSoundMuted: (soundMuted) => {
    set({ soundMuted })
  },
  toggleMute: () => {
    set({ soundMuted: !get().soundMuted })
  },
  toGameSettings: () => ({
    allowDealWithEmptyColumn: get().allowDealWithEmptyColumn,
    undoPenalty: get().undoPenalty,
  }),
}))

export function hydrateThemeFromSettings(): void {
  const theme = useSettingsStore.getState().theme
  if (isThemeId(theme)) applyTheme(theme)
}
