import { describe, expect, it } from 'vitest'
import { computeStats } from './computeStats'

describe('computeStats', () => {
  it('aggregates wins streaks and averages', () => {
    const stats = computeStats([
      {
        seed: 1,
        difficulty: 1,
        won: true,
        moves: 100,
        elapsedMs: 60_000,
        score: 600,
        foundations: 8,
        hintsUsed: 0,
        undosUsed: 0,
        stockDealsUsed: 1,
        at: 3,
      },
      {
        seed: 2,
        difficulty: 1,
        won: true,
        moves: 120,
        elapsedMs: 90_000,
        score: 500,
        foundations: 8,
        hintsUsed: 1,
        undosUsed: 0,
        stockDealsUsed: 2,
        at: 2,
      },
      {
        seed: 3,
        difficulty: 2,
        won: false,
        moves: 40,
        elapsedMs: 30_000,
        score: 400,
        foundations: 1,
        hintsUsed: 2,
        undosUsed: 1,
        stockDealsUsed: 3,
        at: 1,
      },
    ])
    expect(stats.games).toBe(3)
    expect(stats.wins).toBe(2)
    expect(stats.currentStreak).toBe(2)
    expect(stats.longestStreak).toBe(2)
    expect(stats.bestTimeMs).toBe(60_000)
    expect(stats.avgMoves).toBe(110)
  })
})
