import { printBoard } from '@/engine/testing/ascii'
import { decodeMoveLog } from '@/engine/serialize'
import type { Difficulty } from '@/engine/types'
import { useGameStore } from '@/state/gameStore'
import type { RescuePlan, WinnabilityState } from '@/state/uiStore'
import { useUiStore } from '@/state/uiStore'
import { stopWinnabilityWatcher } from '@/state/winnabilityWatcher'

/**
 * Deterministic hook for end-to-end runs (see docs/testing.md).
 *
 * Playwright can drive a real deal through the UI, but it cannot conjure a
 * position the solver has proven dead, and waiting on a real multi-second search
 * would make the suite slow and flaky. The bridge lets a test state the verdict
 * and then exercise the part e2e is actually for: that the warning, the panel and
 * the rewind behave on a real board.
 *
 * Installed only under `npm run build:e2e` (`--mode test`), so the production
 * bundle has no hook into the stores.
 */
export interface SpiderTestBridge {
  newGame: (seed: number, difficulty: Difficulty) => void
  /** Replay an encoded move log (`encodeMoveLog` format) onto the current deal. */
  play: (encoded: string) => number
  moveCount: () => number
  seed: () => number
  /** ASCII board, for asserting a rewind landed on the position it promised. */
  board: () => string
  setWinnability: (state: WinnabilityState) => void
  setRescuePlan: (plan: RescuePlan | null) => void
  /**
   * Stop the background winnability watcher, so a verdict set by the test is not
   * overwritten by a real search a moment later.
   */
  stopWatcher: () => void
}

function bridge(): SpiderTestBridge {
  return {
    newGame: (seed, difficulty) => {
      useGameStore.getState().newGame({ seed, difficulty })
    },
    play: (encoded) => {
      let applied = 0
      for (const move of decodeMoveLog(encoded)) {
        if (!useGameStore.getState().attemptMove(move)) break
        applied += 1
      }
      return applied
    },
    moveCount: () => useGameStore.getState().handle.moveLog.length,
    seed: () => useGameStore.getState().handle.seed,
    board: () => printBoard(useGameStore.getState().handle.state),
    setWinnability: (state) => {
      useUiStore.getState().setWinnability(state)
    },
    setRescuePlan: (plan) => {
      useUiStore.getState().setRescuePlan(plan)
    },
    stopWatcher: () => {
      stopWinnabilityWatcher()
    },
  }
}

/** Install `window.__spider` and replay any `?moves=` from the URL. */
export function installTestBridge(search: string): void {
  const api = bridge()
  ;(window as unknown as { __spider: SpiderTestBridge }).__spider = api

  const moves = new URLSearchParams(
    search.startsWith('?') ? search.slice(1) : search,
  ).get('moves')
  if (moves) api.play(moves)
}
