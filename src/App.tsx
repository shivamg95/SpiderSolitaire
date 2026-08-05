import { useEffect } from 'react'
import { Board } from '@/components/board/Board'
import { SettingsPanel } from '@/components/panels/SettingsPanel'
import { ShareDealPanel } from '@/components/panels/ShareDealPanel'
import { WinPanel } from '@/components/panels/WinPanel'
import { parseDealFromSearch } from '@/features/share/dealUrl'
import { useGameStore } from '@/state/gameStore'
import { hydrateThemeFromSettings, useSettingsStore } from '@/state/settingsStore'
import '@/theme/tokens.css'

export default function App() {
  useEffect(() => {
    hydrateThemeFromSettings()
    const shared = parseDealFromSearch(window.location.search)
    if (shared) {
      useSettingsStore.getState().setDifficulty(shared.difficulty)
      useGameStore.getState().newGame({
        seed: shared.seed,
        difficulty: shared.difficulty,
      })
    } else {
      useGameStore.getState().newGame()
    }
  }, [])

  return (
    <>
      <Board />
      <SettingsPanel />
      <ShareDealPanel />
      <WinPanel />
    </>
  )
}
