import type { Difficulty } from '@/engine/types'
import { SOLVE_PROFILES } from './solve'
import { verifySeed } from './verify'

export interface MinedSeedResult {
  readonly difficulty: Difficulty
  readonly seeds: readonly { seed: number; nodes: number }[]
  readonly attempts: number
  /** Where to resume from on the next slice, so work is never repeated. */
  readonly nextSeed: number
}

/**
 * Look for seeds this device can prove winnable, within a time slice.
 *
 * Same contract as the offline generator: a seed is only returned once its
 * solution has been replayed through the real engine to a won state. The point
 * of mining at runtime is to keep the supply of fresh verified deals ahead of
 * the player, so the shipped pool never has to start repeating.
 */
export function mineSeeds(
  difficulty: Difficulty,
  budgetMs: number,
  limit: number,
  startSeed?: number,
): MinedSeedResult {
  const started = Date.now()
  const seeds: { seed: number; nodes: number }[] = []
  let seed = startSeed ?? (Math.random() * 0xffffffff) >>> 0
  let attempts = 0

  while (seeds.length < limit) {
    const remaining = budgetMs - (Date.now() - started)
    if (remaining <= 100) break

    attempts += 1
    const outcome = verifySeed(seed, difficulty, {
      ...SOLVE_PROFILES.MINE,
      maxMs: Math.min(SOLVE_PROFILES.MINE.maxMs, remaining),
    })
    if (outcome.winnable) seeds.push({ seed, nodes: outcome.nodes })
    seed = (seed + 1) >>> 0
  }

  return { difficulty, seeds, attempts, nextSeed: seed }
}
