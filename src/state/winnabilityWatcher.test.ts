import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { parseBoard } from '@/engine/testing/ascii'
import type { Difficulty, GameHandle, GameSettings, Move } from '@/engine/types'
import { DEFAULT_GAME_SETTINGS } from '@/engine/types'
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

  it('rechecks after a foundation collect settles', async () => {
    const state = parseBoard(`
    difficulty: 1
    c0: [1] SA
    c1: [0] SK SQ SJ S10 S9 S8 S7 S6 S5 S4 S3 S2
    c2: [0] SK
    c3: [0] SK
    c4: [0] SK
    c5: [0] SK
    c6: [0] SK
    c7: [0] SK
    c8: [0] SK
    stock: 50
    found: 0
  `)
    const handle: GameHandle = {
      seed: 1,
      difficulty: 1,
      moveLog: [],
      redoLog: [],
      state,
      settings: DEFAULT_GAME_SETTINGS,
    }
    useGameStore.setState({
      handle,
      undoCount: 0,
      movingIds: [],
      moveSeq: 0,
      collecting: false,
    })

    startWinnabilityWatcher()
    vi.advanceTimersByTime(600)
    expect(asks).toHaveLength(1)
    asks[0]!.settle({ verdict: 'winnable', nodes: 1, deadEnd: false })
    await flush()

    expect(useGameStore.getState().tapMove(0, 1)).toBe(true)
    expect(useGameStore.getState().collecting).toBe(true)
    vi.advanceTimersByTime(600)
    expect(asks).toHaveLength(1)

    vi.advanceTimersByTime(1000)
    expect(useGameStore.getState().collecting).toBe(false)
    vi.advanceTimersByTime(600)
    expect(asks).toHaveLength(2)
  })
})
