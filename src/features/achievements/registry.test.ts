import { describe, expect, it } from 'vitest'
import { unlockedAchievements, ACHIEVEMENTS } from './registry'
import { computeStats } from '@/features/stats/computeStats'
import type { GameResult } from '@/features/stats/computeStats'

const win: GameResult = {
  seed: 1,
  difficulty: 1,
  won: true,
  moves: 80,
  elapsedMs: 100_000,
  score: 700,
  foundations: 8,
  hintsUsed: 0,
  undosUsed: 0,
  stockDealsUsed: 1,
  at: 1,
}

describe('achievements', () => {
  it('unlocks first win and clean play', () => {
    const stats = computeStats([win])
    const ids = unlockedAchievements(win, stats, [win], new Set())
    expect(ids).toContain('first-win')
    expect(ids).toContain('clean-hints')
    expect(ids).toContain('clean-undos')
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(10)
  })
})
