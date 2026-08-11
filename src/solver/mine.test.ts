import { describe, expect, it } from 'vitest'
import { mineSeeds } from './mine'
import { SOLVE_PROFILES } from './solve'
import { verifySeed } from './verify'

describe('mineSeeds', () => {
  it('holds mined seeds to the same standard as the shipped pool', () => {
    const result = mineSeeds(1, 8_000, 2, 1)
    expect(result.difficulty).toBe(1)
    expect(result.seeds.length).toBeGreaterThan(0)

    for (const { seed, nodes } of result.seeds) {
      expect(nodes).toBeGreaterThan(0)
      // Independently re-solved and replayed to a won state, which is the only
      // thing that makes a mined seed as trustworthy as a generated one.
      expect(verifySeed(seed, 1, SOLVE_PROFILES.VERIFY).winnable).toBe(true)
    }
  })

  it('stops at the limit it was given', () => {
    const result = mineSeeds(1, 8_000, 1, 1)
    expect(result.seeds).toHaveLength(1)
  })

  it('resumes past everything it tried, so no slice repeats work', () => {
    const result = mineSeeds(1, 4_000, 1, 500)
    expect(result.attempts).toBeGreaterThan(0)
    expect(result.nextSeed).toBe(500 + result.attempts)
  })

  it('does nothing with a budget too small to solve anything', () => {
    const result = mineSeeds(4, 50, 5, 7)
    expect(result.seeds).toEqual([])
    expect(result.attempts).toBe(0)
    expect(result.nextSeed).toBe(7)
  })
})
