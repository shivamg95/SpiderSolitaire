import type { Difficulty } from '@/engine/types'
import { addMinedSeeds, unminedHeadroom } from './seedSource'
import { useSettingsStore } from './settingsStore'
import { getSolverClient } from './solverClient'

/**
 * Background top-up of the verified-seed supply.
 *
 * Runs in idle time on the long-job worker, so it never competes with a hint,
 * and stands down whenever the tab is hidden or the supply is already full. The
 * player should never notice it — the only visible effect is that the pool of
 * fresh guaranteed-winnable deals keeps growing while they play.
 */

const SLICE_MS = 2_000
const SEEDS_PER_SLICE = 3
const IDLE_GAP_MS = 20_000

let running = false
let timer: ReturnType<typeof setTimeout> | null = null
let active: { cancel: () => void } | null = null
const resumeFrom = new Map<Difficulty, number>()

function schedule(delayMs: number): void {
  if (!running) return
  if (timer !== null) clearTimeout(timer)
  timer = setTimeout(() => {
    timer = null
    void slice()
  }, delayMs)
}

function requestIdle(run: () => void): void {
  const idle = (globalThis as { requestIdleCallback?: (cb: () => void) => void })
    .requestIdleCallback
  if (idle) idle(run)
  else run()
}

async function slice(): Promise<void> {
  if (!running) return
  if (typeof document !== 'undefined' && document.hidden) {
    schedule(IDLE_GAP_MS)
    return
  }

  const { difficulty, winnableOnly } = useSettingsStore.getState()
  if (!winnableOnly || unminedHeadroom(difficulty) === 0) {
    schedule(IDLE_GAP_MS)
    return
  }

  try {
    const call = getSolverClient().mine(
      difficulty,
      SLICE_MS,
      SEEDS_PER_SLICE,
      resumeFrom.get(difficulty),
    )
    active = call
    const result = await call.promise
    active = null
    if (!running) return
    resumeFrom.set(difficulty, result.nextSeed)
    addMinedSeeds(difficulty, result.seeds)
  } catch {
    // A terminated or failed worker is not worth retrying hard; back off and let
    // the next idle window try again.
    active = null
    schedule(IDLE_GAP_MS)
    return
  }

  schedule(IDLE_GAP_MS)
}

export function startSeedMiner(): void {
  if (running) return
  running = true
  requestIdle(() => {
    schedule(IDLE_GAP_MS)
  })
}

export function stopSeedMiner(): void {
  running = false
  if (timer !== null) clearTimeout(timer)
  timer = null
  active?.cancel()
  active = null
}
