import type { Difficulty } from '@/engine/types'
import { SEED_POOL } from './seedPool.generated'

export type StarRating = 1 | 2 | 3 | 4 | 5

export interface PooledSeed {
  readonly seed: number
  readonly difficulty: Difficulty
  readonly stars: StarRating
}

/**
 * Per-difficulty seed lists, with one star digit per seed.
 *
 * Only the seed and its rating ship. The winning line is deliberately left out:
 * it is a couple of hundred moves per seed, which would grow the asset roughly
 * a hundredfold, and it only wins from move zero — useless the moment the player
 * makes a different move, which is exactly when they need help. Mid-game rescue
 * searches from wherever the player actually is instead.
 */
export interface SeedPoolTable {
  readonly seeds: readonly number[]
  /** One digit per entry in `seeds`, '1'..'5'. */
  readonly stars: string
}

export interface SeedPoolData {
  readonly version: number
  readonly generatedAt: string
  /** Solver budget in ms each seed was proven winnable within. */
  readonly budgetMs: number
  readonly pools: Record<Difficulty, SeedPoolTable>
}

export const DIFFICULTIES: readonly Difficulty[] = [1, 2, 4]

function starAt(table: SeedPoolTable, index: number): StarRating {
  const digit = Number(table.stars[index] ?? '3')
  if (digit >= 1 && digit <= 5) return digit as StarRating
  return 3
}

export function poolSize(difficulty: Difficulty): number {
  return SEED_POOL.pools[difficulty].seeds.length
}

export function pooledSeedAt(difficulty: Difficulty, index: number): PooledSeed | null {
  const table = SEED_POOL.pools[difficulty]
  const seed = table.seeds[index]
  if (seed === undefined) return null
  return { seed, difficulty, stars: starAt(table, index) }
}

/** Every shipped seed for a difficulty, in pool order. */
export function pooledSeeds(difficulty: Difficulty): PooledSeed[] {
  const table = SEED_POOL.pools[difficulty]
  return table.seeds.map((seed, index) => ({
    seed,
    difficulty,
    stars: starAt(table, index),
  }))
}

/** Rating for a seed if it came from the shipped pool, else null. */
export function starsForSeed(difficulty: Difficulty, seed: number): StarRating | null {
  const table = SEED_POOL.pools[difficulty]
  const index = table.seeds.indexOf(seed)
  return index === -1 ? null : starAt(table, index)
}

export { SEED_POOL }
