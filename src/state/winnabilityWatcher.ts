import type { GameHandle } from '@/engine/types'
import type { SolverCall } from '@/solver/client'
import type { WinnabilityReport } from '@/solver/rescue'
import { useGameStore } from './gameStore'
import { useSettingsStore } from './settingsStore'
import { getSolverClient } from './solverClient'
import { useUiStore } from './uiStore'

/**
 * Watches for the moment a player's own move kills a winnable deal.
 *
 * A winnable deal is only half of "never stuck": most 4-suit deals can be ruined
 * within a handful of moves, and a player who has just done that has no way to
 * know. The check runs on the long-job worker after a pause in play, so it never
 * competes with the board's own responsiveness, and it is cancelled and
 * restarted whenever the position changes again.
 */

/** Long enough that a burst of quick moves triggers one check, not ten. */
const DEBOUNCE_MS = 600

let timer: ReturnType<typeof setTimeout> | null = null
let inFlight: SolverCall<WinnabilityReport> | null = null
let generation = 0
let lastKey = ''
let unsubscribe: (() => void) | null = null

function keyOf(handle: GameHandle): string {
  return `${handle.seed}:${handle.difficulty}:${handle.moveLog.length}`
}

function cancelPending(): void {
  if (timer !== null) clearTimeout(timer)
  timer = null
  inFlight?.cancel()
  inFlight = null
  generation += 1
}

function runCheck(handle: GameHandle): void {
  const mine = ++generation
  const ui = useUiStore.getState()
  ui.setWinnability('checking')

  const call = getSolverClient().winnability(
    handle.seed,
    handle.difficulty,
    handle.moveLog,
    handle.settings,
  )
  inFlight = call

  void call.promise
    .then((report) => {
      if (mine !== generation) return
      inFlight = null
      useUiStore.getState().setWinnability(report.verdict)
    })
    .catch(() => {
      if (mine !== generation) return
      inFlight = null
      // A cancelled or failed check tells us nothing, and "nothing" must never
      // look like bad news.
      useUiStore.getState().setWinnability('unknown')
    })
}

function onGameChanged(): void {
  const { handle, collecting } = useGameStore.getState()
  const key = keyOf(handle)
  if (key === lastKey) return
  lastKey = key

  cancelPending()

  if (!useSettingsStore.getState().safetyNet) {
    useUiStore.getState().setWinnability('idle')
    return
  }
  // Mid-animation the board is between two positions; wait for it to settle.
  if (collecting) return
  if (handle.state.foundations.length === 8) {
    useUiStore.getState().setWinnability('winnable')
    return
  }

  timer = setTimeout(() => {
    timer = null
    runCheck(useGameStore.getState().handle)
  }, DEBOUNCE_MS)
}

export function startWinnabilityWatcher(): void {
  if (unsubscribe) return
  lastKey = ''
  unsubscribe = useGameStore.subscribe(onGameChanged)
  onGameChanged()
}

export function stopWinnabilityWatcher(): void {
  cancelPending()
  unsubscribe?.()
  unsubscribe = null
  lastKey = ''
}
