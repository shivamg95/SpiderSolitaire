import { useEffect } from 'react'
import { Board } from '@/components/board/Board'
import { SettingsPanel } from '@/components/panels/SettingsPanel'
import { ShareDealPanel } from '@/components/panels/ShareDealPanel'
import { WinPanel } from '@/components/panels/WinPanel'
import { parseDealFromSearch } from '@/features/share/dealUrl'
import { startSeedMiner, stopSeedMiner } from '@/state/miner'
import { useGameStore } from '@/state/gameStore'
import { primeSeedSource } from '@/state/seedSource'
import { hydrateThemeFromSettings, useSettingsStore } from '@/state/settingsStore'
import {
  startWinnabilityWatcher,
  stopWinnabilityWatcher,
} from '@/state/winnabilityWatcher'
import '@/theme/tokens.css'
import { RescueBanner } from '@/components/chrome/RescueBanner'
import { RescuePanel } from '@/components/panels/RescuePanel'

export default function App() {
  useEffect(() => {
    hydrateThemeFromSettings()
    let cancelled = false

    // Hydrate which verified seeds have already been played before dealing, so
    // a reload does not hand back a deal the player has just finished.
    void (async () => {
      await primeSeedSource()
      if (cancelled) return

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

      // Deterministic hook for e2e. The condition is a build-time constant, so
      // this import is eliminated and the bridge never reaches production.
      if (import.meta.env.MODE === 'test') {
        const { installTestBridge } = await import('@/features/testing/bridge')
        installTestBridge(window.location.search)
      }

      startWinnabilityWatcher()
      startSeedMiner()
    })()

    return () => {
      cancelled = true
      stopWinnabilityWatcher()
      stopSeedMiner()
    }
  }, [])

  return (
    <>
      <Board />
      <RescueBanner />
      <RescuePanel />
      <SettingsPanel />
      <ShareDealPanel />
      <WinPanel />
    </>
  )
}
