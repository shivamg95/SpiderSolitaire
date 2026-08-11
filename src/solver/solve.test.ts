import { describe, expect, it } from 'vitest'
import { createGame } from '@/engine/game'
import { isWon } from '@/engine/rules'
import { deadBoard, wonBoard } from '@/engine/testing/boards'
import type { Difficulty } from '@/engine/types'
import { SOLVE_PROFILES, solveDeal, type SolveBudget } from './solve'
import { replayWins, VERIFY_SETTINGS, verifySeed } from './verify'
import { SEED_POOL } from './seedPool.generated'

function budget(overrides: Partial<SolveBudget> = {}): SolveBudget {
  return { ...SOLVE_PROFILES.VERIFY, maxMs: 20_000, ...overrides }
}

/** A pooled seed for `difficulty`, or null before the pool is generated. */
function pooled(difficulty: Difficulty): number | null {
  return SEED_POOL.pools[difficulty].seeds[0] ?? null
}

describe('solveDeal', () => {
  /**
   * The suite never had a real full-game solve before this: the previous
   * "near-win" fixture was a single-move 1-suit puzzle. These are actual deals
   * from `createGame`, solved from move zero and replayed through the engine.
   */
  it.each([1, 2, 4] as const)('solves a real %i-suit deal end to end', (difficulty) => {
    const seed = pooled(difficulty)
    if (seed === null) return
    const outcome = verifySeed(seed, difficulty, budget())
    expect(outcome.winnable).toBe(true)
    expect(outcome.moveCount).toBeGreaterThan(20)
  })

  it('replays its own solution to a won state', () => {
    const seed = pooled(2)
    if (seed === null) return
    const { state } = createGame(seed, 2, VERIFY_SETTINGS)
    const result = solveDeal(state, budget(), VERIFY_SETTINGS)
    expect(result.status).toBe('solved')
    if (result.status !== 'solved') return
    expect(replayWins(state, result.moves, VERIFY_SETTINGS)).toBe(true)
  })

  it('recognises an already-won board without searching', () => {
    const won = wonBoard()
    expect(isWon(won)).toBe(true)
    const result = solveDeal(won, budget())
    expect(result.status).toBe('solved')
    if (result.status !== 'solved') return
    expect(result.moves).toHaveLength(0)
    expect(result.nodes).toBe(0)
  })

  /**
   * Aggressive pruning discards move tiers that could in principle be needed, so
   * it must never be allowed to claim a position is dead. The contract is that
   * only `prune: 'none'` can return `unsolvable`.
   */
  it('never reports unsolvable when pruning aggressively', () => {
    const dead = deadBoard()

    const pruned = solveDeal(dead, budget({ prune: 'aggressive', strategy: 'dfs' }))
    expect(pruned.status).toBe('unknown')

    const sound = solveDeal(
      dead,
      budget({ prune: 'none', strategy: 'bestFirst', maxNodes: 5_000, maxMs: 1_000 }),
    )
    expect(sound.status).toBe('unsolvable')
  })

  it('stops on the abort callback', () => {
    const { state } = createGame(9, 4)
    let checks = 0
    const result = solveDeal(
      state,
      budget({
        maxNodes: 5_000_000,
        maxMs: 30_000,
        shouldAbort: () => {
          checks += 1
          return checks > 2
        },
      }),
    )
    expect(result.status).toBe('unknown')
    if (result.status !== 'unknown') return
    expect(result.reason).toBe('aborted')
  })

  it('reports the node budget as the reason it gave up', () => {
    const { state } = createGame(4321, 4)
    const result = solveDeal(state, budget({ maxNodes: 500, maxMs: 30_000 }))
    if (result.status === 'solved') return
    expect(result.status).toBe('unknown')
    if (result.status !== 'unknown') return
    expect(result.reason).toBe('nodes')
  })

  it('bounds memory with the capacity ceiling', () => {
    const { state } = createGame(77, 4)
    const result = solveDeal(
      state,
      budget({
        strategy: 'bestFirst',
        prune: 'none',
        capacity: 400,
        maxNodes: 1_000_000,
        maxMs: 5_000,
      }),
    )
    if (result.status === 'solved') return
    expect(result.status).toBe('unknown')
    if (result.status !== 'unknown') return
    expect(result.reason).toBe('capacity')
  })
})
