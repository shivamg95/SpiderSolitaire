import { describe, expect, it } from 'vitest'
import type { Difficulty } from '@/engine/types'
import {
  DIFFICULTIES,
  poolSize,
  pooledSeedAt,
  pooledSeeds,
  starsForSeed,
} from './seedPool'
import { SEED_POOL } from './seedPool.generated'
import { SOLVE_PROFILES } from './solve'
import { verifySeed } from './verify'

/**
 * How many seeds per difficulty this test re-solves. `npm run seeds:verify`
 * checks the whole pool across a pool of processes; sampling here means a
 * regression in the solver or the deal still surfaces in CI without adding
 * minutes to every test run.
 */
const SAMPLE_SIZE = 4

describe('shipped seed pool', () => {
  it('has a pool for every difficulty with matching star digits', () => {
    for (const difficulty of DIFFICULTIES) {
      const table = SEED_POOL.pools[difficulty]
      expect(table.stars).toHaveLength(table.seeds.length)
      expect(table.stars).toMatch(/^[1-5]*$/)
    }
  })

  it('contains no duplicate seeds', () => {
    for (const difficulty of DIFFICULTIES) {
      const seeds = SEED_POOL.pools[difficulty].seeds
      expect(new Set(seeds).size).toBe(seeds.length)
    }
  })

  it('exposes seeds through the accessor helpers', () => {
    for (const difficulty of DIFFICULTIES) {
      const size = poolSize(difficulty)
      if (size === 0) continue
      const first = pooledSeedAt(difficulty, 0)
      expect(first).not.toBeNull()
      expect(first!.difficulty).toBe(difficulty)
      expect(starsForSeed(difficulty, first!.seed)).toBe(first!.stars)
      expect(pooledSeeds(difficulty)).toHaveLength(size)
      expect(pooledSeedAt(difficulty, size)).toBeNull()
    }
  })

  it('does not claim a rating for a seed outside the pool', () => {
    expect(starsForSeed(4, -1)).toBeNull()
  })

  /**
   * The test that backs the promise. Every seed we ship must still solve, and the
   * solution must replay through the real engine to a won state — not merely be
   * reported as solved by the solver that produced it.
   */
  it.each(DIFFICULTIES)(
    're-proves a sample of %i-suit seeds winnable',
    (difficulty) => {
      const seeds = SEED_POOL.pools[difficulty as Difficulty].seeds
      if (seeds.length === 0) return

      const step = Math.max(1, Math.floor(seeds.length / SAMPLE_SIZE))
      const sample: number[] = []
      for (let i = 0; i < seeds.length && sample.length < SAMPLE_SIZE; i += step) {
        sample.push(seeds[i]!)
      }

      for (const seed of sample) {
        const outcome = verifySeed(seed, difficulty as Difficulty, {
          ...SOLVE_PROFILES.VERIFY,
          maxMs: 40_000,
        })
        expect(outcome.winnable, `${difficulty}-suit seed ${seed}`).toBe(true)
      }
    },
    180_000,
  )
})
