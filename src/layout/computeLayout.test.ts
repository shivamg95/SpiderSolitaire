import { describe, expect, it } from 'vitest'
import { createGame } from '@/engine/game'
import { computeLayout, computeBoardMetrics } from './computeLayout'

describe('computeLayout', () => {
  it('fits cards within viewport bounds for common sizes', () => {
    const state = createGame(42, 1).state
    for (const viewport of [
      { width: 1024, height: 768 },
      { width: 1366, height: 1024 },
      { width: 768, height: 1024 },
    ]) {
      const metrics = computeBoardMetrics(viewport)
      expect(metrics.columnXs).toHaveLength(10)
      const layout = computeLayout(state, viewport)
      for (const [, p] of layout) {
        expect(p.x).toBeGreaterThanOrEqual(0)
        expect(p.y).toBeGreaterThanOrEqual(0)
        expect(p.x + metrics.cardWidth).toBeLessThanOrEqual(viewport.width + 1)
      }
    }
  })
})
