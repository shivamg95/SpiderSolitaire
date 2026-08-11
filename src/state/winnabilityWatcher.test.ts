import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Difficulty, GameSettings, Move } from '@/engine/types'
import type { SolverCall } from '@/solver/client'
import type { WinnabilityReport } from '@/solver/rescue'
import { useGameStore } from './gameStore'
import { __resetSeedSourceForTests } from './seedSource'
import { useSettingsStore } from './settingsStore'
import { useUiStore } from './uiStore'
import { startWinnabilityWatcher, stopWinnabilityWatcher } from './winnabilityWatcher'

const DIFFICULTY: Difficulty = 1

interface Ask {
  readonly moveLog: readonly Move[]
  settle: (report: WinnabilityReport) => void
  fail: (error: Error) => void
  cancelled: boolean
}

let asks: Ask[] = []

vi.mock('./solverClient', () => ({
  getSolverClient: () => ({
    winnability: (
      _seed: number,
      _difficulty: Difficulty,
      moveLog: readonly Move[],
      _settings?: GameSettings,
    ): SolverCall<WinnabilityReport> => {
      const ask: Ask = {
        moveLog,
        settle: () => undefined,
        fail: () => undefined,
        cancelled: false,
      }
      ask.settle = () => undefined
      const promise = new Promise<WinnabilityReport>((resolve, reject) => {
        ask.settle = resolve
        ask.fail = reject
      })
      asks.push(ask)
      return {
        promise,
        cancel: () => {
          ask.cancelled = true
          ask.fail(new Error('cancelled'))
        },
      }
    },
  }),
  disposeSolverClient: () => undefined,
}))

/** Let the watcher's promise callbacks run. */
async function flush(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
}

beforeEach(() => {
  vi.useFakeTimers()
  asks = []
  __resetSeedSourceForTests()
  useSettingsStore.setState({ safetyNet: true, winnableOnly: true })
  useUiStore.setState({ winnability: 'idle', warningDismissed: false })
  useGameStore.getState().newGame({ difficulty: DIFFICULTY })
})

afterEach(() => {
  stopWinnabilityWatcher()
  vi.useRealTimers()
})

describe('winnability watcher', () => {
  it('waits for a pause in play before asking', async () => {
    startWinnabilityWatcher()
    expect(asks).toHaveLength(0)

    vi.advanceTimersByTime(599)
    expect(asks).toHaveLength(0)

    vi.advanceTimersByTime(1)
    expect(asks).toHaveLength(1)
    expect(useUiStore.getState().winnability).toBe('checking')

    asks[0]!.settle({ verdict: 'lost', nodes: 10, deadEnd: false })
    await flush()
    expect(useUiStore.getState().winnability).toBe('lost')
  })

  it('asks once for a burst of moves, about the final position', () => {
    startWinnabilityWatcher()
    for (let i = 0; i < 3; i++) {
      useGameStore.getState().dealStock()
      vi.advanceTimersByTime(100)
    }
    vi.advanceTimersByTime(600)

    expect(asks).toHaveLength(1)
    expect(asks[0]!.moveLog).toHaveLength(3)
  })

  it('abandons a check the moment the position changes', () => {
    startWinnabilityWatcher()
    vi.advanceTimersByTime(600)
    expect(asks).toHaveLength(1)

    useGameStore.getState().dealStock()
    expect(asks[0]!.cancelled).toBe(true)

    vi.advanceTimersByTime(600)
    expect(asks).toHaveLength(2)
  })

  it('never lets a failed check look like bad news', async () => {
    startWinnabilityWatcher()
    vi.advanceTimersByTime(600)
    asks[0]!.fail(new Error('worker died'))
    await flush()
    expect(useUiStore.getState().winnability).toBe('unknown')
  })

  it('does nothing at all when the safety net is off', () => {
    useSettingsStore.setState({ safetyNet: false })
    startWinnabilityWatcher()
    vi.advanceTimersByTime(5_000)
    expect(asks).toHaveLength(0)
    expect(useUiStore.getState().winnability).toBe('idle')
  })
})
