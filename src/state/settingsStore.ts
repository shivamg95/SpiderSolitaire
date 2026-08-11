import { create } from 'zustand'
import type { Difficulty, GameSettings } from '@/engine/types'
import {
  DEFAULT_APPEARANCE,
  DEFAULT_THEME,
  applyAppearance,
  applyTheme,
  isAppearanceId,
  isThemeId,
  watchSystemAppearance,
  type AppearanceId,
  type ThemeId,
} from '@/theme/themes'

export interface SettingsState {
  readonly difficulty: Difficulty
  readonly theme: ThemeId
  readonly appearance: AppearanceId
  readonly allowDealWithEmptyColumn: boolean
  readonly undoPenalty: boolean
  readonly reducedMotion: boolean
  readonly soundMuted: boolean
  /** Deal only from the pool of seeds proven winnable. */
  readonly winnableOnly: boolean
  /** Watch in the background for a move that makes the deal unwinnable. */
  readonly safetyNet: boolean
  setDifficulty: (d: Difficulty) => void
  setTheme: (t: ThemeId) => void
  setAppearance: (a: AppearanceId) => void
  setAllowDealWithEmptyColumn: (v: boolean) => void
  setUndoPenalty: (v: boolean) => void
  setReducedMotion: (v: boolean) => void
  setSoundMuted: (v: boolean) => void
  setWinnableOnly: (v: boolean) => void
  setSafetyNet: (v: boolean) => void
  toggleMute: () => void
  toGameSettings: () => GameSettings
}

let stopSystemWatch: (() => void) | null = null

function syncAppearanceWatch(appearance: AppearanceId): void {
  stopSystemWatch?.()
  stopSystemWatch = null
  applyAppearance(appearance)
  if (appearance === 'system') {
    stopSystemWatch = watchSystemAppearance(() => {
      applyAppearance('system')
    })
  }
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  difficulty: 1,
  theme: DEFAULT_THEME,
  appearance: DEFAULT_APPEARANCE,
  allowDealWithEmptyColumn: true,
  undoPenalty: true,
  reducedMotion: false,
  soundMuted: false,
  winnableOnly: true,
  safetyNet: true,
  setDifficulty: (difficulty) => {
    set({ difficulty })
  },
  setTheme: (theme) => {
    applyTheme(theme)
    set({ theme })
  },
  setAppearance: (appearance) => {
    syncAppearanceWatch(appearance)
    set({ appearance })
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
  setWinnableOnly: (winnableOnly) => {
    set({ winnableOnly })
  },
  setSafetyNet: (safetyNet) => {
    set({ safetyNet })
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
  const { theme, appearance } = useSettingsStore.getState()
  if (isThemeId(theme)) applyTheme(theme)
  if (isAppearanceId(appearance)) syncAppearanceWatch(appearance)
}
