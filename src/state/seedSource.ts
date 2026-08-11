import type { Difficulty } from '@/engine/types'
import type { PooledSeed, StarRating } from '@/solver/seedPool'
import { poolSize, pooledSeedAt, starsForSeed } from '@/solver/seedPool'
import type { MinedSeed, VerifiedSeedStore } from './persist'
import {
  emptyVerifiedSeedStore,
  loadVerifiedSeeds,
  MINED_SEED_CAP,
  saveVerifiedSeeds,
} from './persist'

/**
 * Where the next guaranteed-winnable deal comes from.
 *
 * The bundled pool is a static import, so the common path is synchronous and a
 * new game still appears instantly — no spinner, no worker round trip. Seeds
 * mined on this device are spent first because they are the scarce resource;
 * the bundled pool is always there to fall back on.
 */

let store: VerifiedSeedStore = emptyVerifiedSeedStore()
let hydrated = false
let flushTimer: ReturnType<typeof setTimeout> | null = null

/** Load persisted seeds. Safe to call more than once; only the first hydrates. */
export async function primeSeedSource(): Promise<void> {
  if (hydrated) return
  store = await loadVerifiedSeeds()
  hydrated = true
}

function scheduleFlush(): void {
  if (flushTimer !== null) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    // Failing to persist costs variety in which deals come up next, never the
    // winnable guarantee, so private browsing or a full quota stays silent.
    void saveVerifiedSeeds(store).catch(() => undefined)
  }, 500)
}

function usedSet(difficulty: Difficulty): Set<number> {
  return new Set(store.used[difficulty])
}

function markUsed(difficulty: Difficulty, seed: number): void {
  const used = [...store.used[difficulty], seed]
  store = { ...store, used: { ...store.used, [difficulty]: used } }
  scheduleFlush()
}

/**
 * Mined seeds stay in the list after being dealt, only flagged as used. Keeping
 * them is what lets `starsFor` still rate the current deal after a reload, and
 * eviction at the cap prefers used entries anyway.
 */
function takeMined(difficulty: Difficulty): MinedSeed | null {
  const used = usedSet(difficulty)
  return store.mined[difficulty].find((entry) => !used.has(entry.seed)) ?? null
}

/** Locally mined seeds have no pool quantile, so rate them against the pool's. */
function starsForMined(nodes: number): StarRating {
  if (nodes < 20_000) return 1
  if (nodes < 100_000) return 2
  if (nodes < 400_000) return 3
  if (nodes < 1_200_000) return 4
  return 5
}

/**
 * The next verified seed, or null when nothing is available (which only happens
 * when the bundled pool is empty for this difficulty).
 */
export function nextVerifiedSeed(difficulty: Difficulty): PooledSeed | null {
  const mined = takeMined(difficulty)
  if (mined) {
    markUsed(difficulty, mined.seed)
    return {
      seed: mined.seed,
      difficulty,
      stars: starsForMined(mined.nodes),
    }
  }

  const size = poolSize(difficulty)
  if (size === 0) return null

  const used = usedSet(difficulty)
  const unused: number[] = []
  for (let i = 0; i < size; i++) {
    if (!used.has(pooledSeedAt(difficulty, i)!.seed)) unused.push(i)
  }

  if (unused.length === 0) {
    // Every shipped deal has been played. Start the rotation over rather than
    // falling back to an unverified shuffle.
    store = { ...store, used: { ...store.used, [difficulty]: [] } }
    scheduleFlush()
    const first = pooledSeedAt(difficulty, Math.floor(Math.random() * size))!
    markUsed(difficulty, first.seed)
    return first
  }

  const pick = unused[Math.floor(Math.random() * unused.length)]!
  const seed = pooledSeedAt(difficulty, pick)!
  markUsed(difficulty, seed.seed)
  return seed
}

/** Record freshly mined seeds, ignoring duplicates and respecting the cap. */
export function addMinedSeeds(difficulty: Difficulty, seeds: readonly MinedSeed[]): void {
  if (seeds.length === 0) return
  const existing = store.mined[difficulty]
  const known = new Set(existing.map((entry) => entry.seed))
  const merged = [...existing]
  for (const entry of seeds) {
    if (known.has(entry.seed)) continue
    known.add(entry.seed)
    merged.push(entry)
  }

  let trimmed = merged
  if (trimmed.length > MINED_SEED_CAP) {
    // Evict already-played seeds first; they cost storage without offering a
    // fresh deal, and only their star rating is worth anything.
    const used = usedSet(difficulty)
    const unused = trimmed.filter((entry) => !used.has(entry.seed))
    const spent = trimmed.filter((entry) => used.has(entry.seed))
    trimmed = [...unused, ...spent].slice(0, MINED_SEED_CAP)
  }

  store = { ...store, mined: { ...store.mined, [difficulty]: trimmed } }
  scheduleFlush()
}

/** Mined seeds not yet dealt — what the miner tops up towards its cap. */
export function unminedHeadroom(difficulty: Difficulty): number {
  const used = usedSet(difficulty)
  const unused = store.mined[difficulty].filter((e) => !used.has(e.seed)).length
  return Math.max(0, MINED_SEED_CAP - unused)
}

/** How many verified deals remain before the rotation restarts. */
export function unusedSeedCount(difficulty: Difficulty): number {
  const used = usedSet(difficulty)
  let unused = 0
  for (let i = 0; i < poolSize(difficulty); i++) {
    if (!used.has(pooledSeedAt(difficulty, i)!.seed)) unused += 1
  }
  return unused + store.mined[difficulty].filter((e) => !used.has(e.seed)).length
}

/**
 * Rating for an arbitrary seed. Shared deals and seeds from a URL are not in the
 * pool, so this returns null for them and the UI shows no badge.
 */
export function starsFor(difficulty: Difficulty, seed: number): StarRating | null {
  const mined = store.mined[difficulty].find((entry) => entry.seed === seed)
  if (mined) return starsForMined(mined.nodes)
  return starsForSeed(difficulty, seed)
}

/** Test helper: reset in-memory state without touching IndexedDB. */
export function __resetSeedSourceForTests(next?: VerifiedSeedStore): void {
  if (flushTimer !== null) clearTimeout(flushTimer)
  flushTimer = null
  store = next ?? emptyVerifiedSeedStore()
  hydrated = false
}
