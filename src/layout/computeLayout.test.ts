import { describe, expect, it } from 'vitest'
import { createGame } from '@/engine/game'
import type { Card, GameState } from '@/engine/types'
import { computeLayout, computeBoardMetrics } from './computeLayout'
import { COLUMN_COUNT, MAX_GAP_RATIO, MIN_GAP_RATIO, RAIL_CARD_SCALE } from './constants'

function makeTallColumn(count: number): Card[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `tall-${i}` as Card['id'],
    suit: 'S' as const,
    rank: ((i % 13) + 1) as Card['rank'],
    faceUp: true,
  }))
}

describe('computeBoardMetrics', () => {
  it('uses a right rail and puts columns at the top on wide viewports', () => {
    const metrics = computeBoardMetrics({ width: 1280, height: 800 })
    expect(metrics.layoutMode).toBe('rail')
    expect(metrics.columnsY).toBeLessThan(20)
    expect(metrics.railX).toBeGreaterThan(metrics.columnXs[COLUMN_COUNT - 1]!)
    expect(metrics.stockY + metrics.railCardHeight).toBeLessThanOrEqual(
      metrics.boardHeight + 1,
    )
    expect(metrics.foundationYs).toHaveLength(8)
  })

  it('switches to a bottom bar on narrow viewports', () => {
    const metrics = computeBoardMetrics({ width: 400, height: 800 })
    expect(metrics.layoutMode).toBe('bottom')
    expect(metrics.railY).toBeGreaterThan(metrics.columnsY)
  })

  it('grows cards on wide screens and keeps gaps proportional to card width', () => {
    const metrics = computeBoardMetrics({ width: 1920, height: 1080 })
    expect(metrics.cardWidth).toBeGreaterThan(96)
    const ratio = metrics.columnGap / metrics.cardWidth
    expect(ratio).toBeGreaterThanOrEqual(MIN_GAP_RATIO - 0.02)
    expect(ratio).toBeLessThanOrEqual(MAX_GAP_RATIO + 0.02)
  })
})

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
        expect(p.x).toBeGreaterThanOrEqual(-metrics.cardWidth)
        expect(p.y).toBeGreaterThanOrEqual(0)
        expect(p.x + metrics.cardWidth).toBeLessThanOrEqual(
          viewport.width + metrics.cardWidth,
        )
        expect(p.y + metrics.cardHeight * p.scale).toBeLessThanOrEqual(
          viewport.height + metrics.cardHeight,
        )
      }
      for (let col = 0; col < COLUMN_COUNT; col++) {
        const x = metrics.columnXs[col]!
        expect(x + metrics.cardWidth).toBeLessThanOrEqual(metrics.railX + 1)
      }
    }
  })

  it('compacts a tall column to fit within board height', () => {
    const base = createGame(7, 1).state
    const columns = base.columns.map((c, i) =>
      i === 0 ? makeTallColumn(30) : c,
    ) as GameState['columns']
    const state: GameState = { ...base, columns }
    const viewport = { width: 1024, height: 600 }
    const metrics = computeBoardMetrics(viewport)
    const layout = computeLayout(state, viewport)
    const available = metrics.boardHeight - metrics.columnsY - metrics.padY
    for (const card of columns[0]!) {
      const p = layout.get(card.id)!
      expect(p.y + metrics.cardHeight).toBeLessThanOrEqual(
        available + metrics.columnsY + 2,
      )
      expect(p.compressed).toBe(true)
    }
  })

  it('relaxes compaction when cards are removed', () => {
    const base = createGame(7, 1).state
    const tall = makeTallColumn(28)
    const short = tall.slice(0, 4)
    const viewport = { width: 1024, height: 600 }

    const tallState: GameState = {
      ...base,
      columns: base.columns.map((c, i) => (i === 0 ? tall : c)) as GameState['columns'],
    }
    const shortState: GameState = {
      ...base,
      columns: base.columns.map((c, i) => (i === 0 ? short : c)) as GameState['columns'],
    }

    const tallLayout = computeLayout(tallState, viewport)
    const shortLayout = computeLayout(shortState, viewport)

    const tallTop = tallLayout.get(tall[tall.length - 1]!.id)!
    const tallBottom = tallLayout.get(tall[0]!.id)!
    const tallSpan = tallTop.y - tallBottom.y

    const shortTop = shortLayout.get(short[short.length - 1]!.id)!
    const shortBottom = shortLayout.get(short[0]!.id)!
    const shortSpan = shortTop.y - shortBottom.y

    const tallStep = tallSpan / (tall.length - 1)
    const shortStep = shortSpan / (short.length - 1)
    expect(shortStep).toBeGreaterThan(tallStep)
    expect(shortLayout.get(short[0]!.id)!.compressed).toBe(false)
  })

  it('places foundation cards in the rail with downward offsets', () => {
    const base = createGame(1, 1).state
    const run = makeTallColumn(13)
    const state: GameState = {
      ...base,
      foundations: [
        run,
        makeTallColumn(13).map((c, i) => ({ ...c, id: `f2-${i}` as Card['id'] })),
      ],
    }
    const viewport = { width: 1280, height: 800 }
    const metrics = computeBoardMetrics(viewport)
    const layout = computeLayout(state, viewport)
    const first = layout.get(run[0]!.id)!
    const secondRun = state.foundations[1]![0]!
    const second = layout.get(secondRun.id)!
    expect(first.scale).toBe(RAIL_CARD_SCALE)
    expect(second.y).toBeGreaterThan(first.y)
    expect(first.x).toBeGreaterThan(metrics.columnXs[COLUMN_COUNT - 1]!)
  })
})
