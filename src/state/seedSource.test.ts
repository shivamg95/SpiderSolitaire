import { beforeEach, describe, expect, it } from 'vitest'
import type { Difficulty } from '@/engine/types'
import { poolSize, pooledSeeds } from '@/solver/seedPool'
import { emptyVerifiedSeedStore, MINED_SEED_CAP } from './persist'
import {
  __resetSeedSourceForTests,
  addMinedSeeds,
  nextVerifiedSeed,
  starsFor,
  unminedHeadroom,
  unusedSeedCount,
} from './seedSource'

const DIFFICULTY: Difficulty = 4

beforeEach(() => {
  __resetSeedSourceForTests()
})

describe('nextVerifiedSeed', () => {
  it('draws from the bundled pool', () => {
    const pooled = new Set(pooledSeeds(DIFFICULTY).map((s) => s.seed))
    if (pooled.size === 0) return

    const drawn = nextVerifiedSeed(DIFFICULTY)
    expect(drawn).not.toBeNull()
    expect(pooled.has(drawn!.seed)).toBe(true)
    expect(drawn!.stars).toBeGreaterThanOrEqual(1)
    expect(drawn!.stars).toBeLessThanOrEqual(5)
  })

  it('never repeats a deal until the pool is exhausted', () => {
    const size = poolSize(DIFFICULTY)
    if (size === 0) return

    const seen = new Set<number>()
    for (let i = 0; i < size; i++) {
      const drawn = nextVerifiedSeed(DIFFICULTY)
      expect(drawn).not.toBeNull()
      expect(seen.has(drawn!.seed)).toBe(false)
      seen.add(drawn!.seed)
    }
    expect(seen.size).toBe(size)
  })

  /**
   * Running out of fresh deals must restart the rotation, not fall back to an
   * unverified shuffle — the whole point is that the player never meets one.
   */
  it('restarts the rotation instead of dealing something unverified', () => {
    const size = poolSize(DIFFICULTY)
    if (size === 0) return

    const pooled = new Set(pooledSeeds(DIFFICULTY).map((s) => s.seed))
    for (let i = 0; i < size; i++) nextVerifiedSeed(DIFFICULTY)
    expect(unusedSeedCount(DIFFICULTY)).toBe(0)

    const wrapped = nextVerifiedSeed(DIFFICULTY)
    expect(wrapped).not.toBeNull()
    expect(pooled.has(wrapped!.seed)).toBe(true)
    expect(unusedSeedCount(DIFFICULTY)).toBe(size - 1)
  })

  it('spends locally mined seeds before the bundled pool', () => {
    const pooled = new Set(pooledSeeds(DIFFICULTY).map((s) => s.seed))
    addMinedSeeds(DIFFICULTY, [{ seed: 999_001, nodes: 50_000 }])

    const drawn = nextVerifiedSeed(DIFFICULTY)
    expect(drawn?.seed).toBe(999_001)
    expect(pooled.has(999_001)).toBe(false)

    // Once spent, the next draw moves on to the bundled pool.
    const next = nextVerifiedSeed(DIFFICULTY)
    expect(next?.seed).not.toBe(999_001)
  })

  it('returns null for a difficulty with nothing available', () => {
    __resetSeedSourceForTests({
      ...emptyVerifiedSeedStore(),
      used: { 1: [], 2: [], 4: [] },
    })
    if (poolSize(1) > 0) return
    expect(nextVerifiedSeed(1)).toBeNull()
  })
})

describe('mined seeds', () => {
  it('rates a mined seed by how hard it was to solve', () => {
    addMinedSeeds(DIFFICULTY, [
      { seed: 900_001, nodes: 1_000 },
      { seed: 900_002, nodes: 2_000_000 },
    ])
    expect(starsFor(DIFFICULTY, 900_001)).toBe(1)
    expect(starsFor(DIFFICULTY, 900_002)).toBe(5)
  })

  it('keeps rating a mined seed after it has been dealt', () => {
    addMinedSeeds(DIFFICULTY, [{ seed: 900_003, nodes: 500_000 }])
    const drawn = nextVerifiedSeed(DIFFICULTY)
    expect(drawn?.seed).toBe(900_003)
    // Still rateable, so the badge survives a reload of a game in progress.
    expect(starsFor(DIFFICULTY, 900_003)).toBe(drawn?.stars)
  })

  it('ignores duplicates', () => {
    addMinedSeeds(DIFFICULTY, [{ seed: 900_004, nodes: 10 }])
    const before = unminedHeadroom(DIFFICULTY)
    addMinedSeeds(DIFFICULTY, [{ seed: 900_004, nodes: 10 }])
    expect(unminedHeadroom(DIFFICULTY)).toBe(before)
  })

  it('stops the miner once the cap is reached', () => {
    expect(unminedHeadroom(DIFFICULTY)).toBe(MINED_SEED_CAP)
    addMinedSeeds(
      DIFFICULTY,
      Array.from({ length: MINED_SEED_CAP + 40 }, (_, i) => ({
        seed: 800_000 + i,
        nodes: 1_000,
      })),
    )
    expect(unminedHeadroom(DIFFICULTY)).toBe(0)
  })

  it('has no rating for a seed it has never seen', () => {
    expect(starsFor(DIFFICULTY, 123_456_789)).toBeNull()
  })
})
