import { describe, expect, it } from 'vitest'
import { seedForDate } from './seedForDate'

describe('seedForDate', () => {
  it('is deterministic and difficulty-separated', () => {
    expect(seedForDate('2026-08-03', 1)).toBe(seedForDate('2026-08-03', 1))
    expect(seedForDate('2026-08-03', 1)).not.toBe(seedForDate('2026-08-03', 4))
    expect(seedForDate('2026-08-03', 1)).not.toBe(seedForDate('2026-08-04', 1))
  })
})
