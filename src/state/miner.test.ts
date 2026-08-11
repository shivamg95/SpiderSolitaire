import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Difficulty } from '@/engine/types'
import type { MinedSeedResult } from '@/solver/mine'
import { startSeedMiner, stopSeedMiner } from './miner'
import { MINED_SEED_CAP } from './persist'
import { __resetSeedSourceForTests, unminedHeadroom } from './seedSource'
import { useSettingsStore } from './settingsStore'

const DIFFICULTY: Difficulty = 2

interface MineJob {
  readonly startSeed: number | undefined
  settle: (result: MinedSeedResult) => void
  fail: (error: Error) => void
  cancelled: boolean
}

let jobs: MineJob[] = []

vi.mock('./solverClient', () => ({
  getSolverClient: () => ({
    mine: (
      _difficulty: Difficulty,
      _budgetMs: number,
      _limit: number,
      startSeed?: number,
    ) => {
      const job: MineJob = {
        startSeed,
        settle: () => undefined,
        fail: () => undefined,
        cancelled: false,
      }
      const promise = new Promise<MinedSeedResult>((resolve, reject) => {
        job.settle = resolve
        job.fail = reject
      })
      jobs.push(job)
      return {
        promise,
        cancel: () => {
          job.cancelled = true
          job.fail(new Error('cancelled'))
        },
      }
    },
  }),
  disposeSolverClient: () => undefined,
}))

/** The miner awaits its worker, so let the microtask queue drain. */
async function settle(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

beforeEach(() => {
  vi.useFakeTimers()
  jobs = []
  __resetSeedSourceForTests()
  useSettingsStore.setState({ winnableOnly: true, difficulty: DIFFICULTY })
})

afterEach(() => {
  stopSeedMiner()
  vi.useRealTimers()
})

describe('seed miner', () => {
  it('waits for idle time before taking any', () => {
    startSeedMiner()
    expect(jobs).toHaveLength(0)

    vi.advanceTimersByTime(20_000)
    expect(jobs).toHaveLength(1)
  })

  it('banks what it mines and resumes from where it stopped', async () => {
    const before = unminedHeadroom(DIFFICULTY)
    startSeedMiner()
    vi.advanceTimersByTime(20_000)

    jobs[0]!.settle({
      difficulty: DIFFICULTY,
      seeds: [
        { seed: 11, nodes: 5_000 },
        { seed: 12, nodes: 90_000 },
      ],
      attempts: 4,
      nextSeed: 15,
    })
    await settle()

    expect(unminedHeadroom(DIFFICULTY)).toBe(before - 2)

    // The next slice picks up at nextSeed, so no seed is ever solved twice.
    vi.advanceTimersByTime(20_000)
    expect(jobs[1]?.startSeed).toBe(15)
  })

  it('stands down while the tab is hidden', () => {
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    startSeedMiner()
    vi.advanceTimersByTime(60_000)
    expect(jobs).toHaveLength(0)

    hidden.mockReturnValue(false)
    vi.advanceTimersByTime(20_000)
    expect(jobs).toHaveLength(1)
  })

  it('does not mine deals the player has asked not to be given', () => {
    useSettingsStore.setState({ winnableOnly: false })
    startSeedMiner()
    vi.advanceTimersByTime(60_000)
    expect(jobs).toHaveLength(0)
  })

  it('stops once the local supply is full', () => {
    __resetSeedSourceForTests({
      version: 1,
      mined: {
        1: [],
        2: Array.from({ length: MINED_SEED_CAP }, (_, i) => ({
          seed: 1_000 + i,
          nodes: 1_000,
        })),
        4: [],
      },
      used: { 1: [], 2: [], 4: [] },
    })
    expect(unminedHeadroom(DIFFICULTY)).toBe(0)

    startSeedMiner()
    vi.advanceTimersByTime(60_000)
    expect(jobs).toHaveLength(0)
  })

  it('backs off instead of hammering a failing worker', async () => {
    startSeedMiner()
    vi.advanceTimersByTime(20_000)
    jobs[0]!.fail(new Error('worker died'))
    await settle()

    expect(jobs).toHaveLength(1)
    vi.advanceTimersByTime(20_000)
    expect(jobs).toHaveLength(2)
  })

  it('drops its in-flight slice when stopped', async () => {
    startSeedMiner()
    vi.advanceTimersByTime(20_000)
    stopSeedMiner()
    await settle()

    expect(jobs[0]!.cancelled).toBe(true)
    vi.advanceTimersByTime(60_000)
    expect(jobs).toHaveLength(1)
  })
})
