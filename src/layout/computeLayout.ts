import type { Card, CardId, GameState } from '@/engine/types'
import {
  BOARD_PAD_X,
  BOARD_PAD_Y,
  CARD_ASPECT,
  COLUMN_COUNT,
  COLUMN_GAP_RATIO,
  FACE_DOWN_FLOOR,
  FACE_DOWN_OVERLAP,
  FACE_UP_FLOOR,
  FACE_UP_OVERLAP,
  FOUNDATION_SLOTS,
  MAX_CARD_WIDTH,
  MIN_CARD_WIDTH,
  MIN_COLUMN_GAP,
  STOCK_ROW_HEIGHT_RATIO,
  TOP_BAR_HEIGHT,
} from './constants'

export interface ViewportSize {
  readonly width: number
  readonly height: number
  readonly safeTop?: number
  readonly safeRight?: number
  readonly safeBottom?: number
  readonly safeLeft?: number
}

export interface LayoutSettings {
  readonly padX?: number
  readonly padY?: number
  readonly topBarHeight?: number
}

export interface CardPlacement {
  readonly x: number
  readonly y: number
  readonly z: number
  readonly rotate: number
  readonly scale: number
  readonly faceUp: boolean
  readonly compressed: boolean
}

export interface BoardMetrics {
  readonly cardWidth: number
  readonly cardHeight: number
  readonly columnGap: number
  readonly padX: number
  readonly padY: number
  readonly topBarHeight: number
  readonly stockY: number
  readonly columnsY: number
  readonly columnWidth: number
  readonly columnXs: readonly number[]
  readonly foundationXs: readonly number[]
  readonly stockX: number
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

export function computeBoardMetrics(
  viewport: ViewportSize,
  settings: LayoutSettings = {},
): BoardMetrics {
  const safeLeft = viewport.safeLeft ?? 0
  const safeRight = viewport.safeRight ?? 0
  const safeTop = viewport.safeTop ?? 0
  const padX = settings.padX ?? BOARD_PAD_X
  const padY = settings.padY ?? BOARD_PAD_Y
  const topBarHeight = settings.topBarHeight ?? TOP_BAR_HEIGHT

  const innerW = Math.max(0, viewport.width - safeLeft - safeRight - 2 * padX)
  const gapGuess = Math.max(MIN_COLUMN_GAP, innerW * COLUMN_GAP_RATIO * 0.12)
  let columnWidth = (innerW - (COLUMN_COUNT - 1) * gapGuess) / COLUMN_COUNT
  columnWidth = clamp(columnWidth, MIN_CARD_WIDTH, MAX_CARD_WIDTH)

  const columnGap =
    COLUMN_COUNT > 1
      ? Math.max(
          MIN_COLUMN_GAP,
          (innerW - columnWidth * COLUMN_COUNT) / (COLUMN_COUNT - 1),
        )
      : 0

  // Recompute so columns exactly fill width without horizontal scroll.
  columnWidth = (innerW - (COLUMN_COUNT - 1) * columnGap) / COLUMN_COUNT
  columnWidth = clamp(columnWidth, MIN_CARD_WIDTH, MAX_CARD_WIDTH)

  const cardWidth = columnWidth
  const cardHeight = cardWidth / CARD_ASPECT

  const originX = safeLeft + padX
  const columnXs = Array.from({ length: COLUMN_COUNT }, (_, i) => {
    return originX + i * (cardWidth + columnGap)
  })

  const stockY = safeTop + topBarHeight + padY
  const columnsY = stockY + cardHeight * STOCK_ROW_HEIGHT_RATIO

  const foundationStart =
    originX + (COLUMN_COUNT - FOUNDATION_SLOTS) * (cardWidth + columnGap)
  const foundationXs = Array.from({ length: FOUNDATION_SLOTS }, (_, i) => {
    return foundationStart + i * (cardWidth + columnGap)
  })

  return {
    cardWidth,
    cardHeight,
    columnGap,
    padX,
    padY,
    topBarHeight,
    stockY,
    columnsY,
    columnWidth,
    columnXs,
    foundationXs,
    stockX: originX,
  }
}

function stackOffsets(
  cards: readonly Card[],
  cardHeight: number,
  availableHeight: number,
): { offsets: number[]; compressed: boolean } {
  if (cards.length === 0) return { offsets: [], compressed: false }

  const ideal: number[] = [0]
  for (let i = 1; i < cards.length; i++) {
    const prev = cards[i - 1]!
    const frac = prev.faceUp ? FACE_UP_OVERLAP : FACE_DOWN_OVERLAP
    ideal.push(ideal[i - 1]! + cardHeight * frac)
  }

  const stackSpan = ideal[ideal.length - 1]! + cardHeight
  if (stackSpan <= availableHeight || cards.length === 1) {
    return { offsets: ideal, compressed: false }
  }

  const floorOffsets: number[] = [0]
  for (let i = 1; i < cards.length; i++) {
    const prev = cards[i - 1]!
    const frac = prev.faceUp ? FACE_UP_FLOOR : FACE_DOWN_FLOOR
    floorOffsets.push(floorOffsets[i - 1]! + cardHeight * frac)
  }

  const floorSpan = floorOffsets[floorOffsets.length - 1]! + cardHeight
  if (floorSpan >= availableHeight) {
    // Rank-strip: pack to floor (or slightly under if still overflowing).
    const scale =
      availableHeight > cardHeight
        ? (availableHeight - cardHeight) / (floorSpan - cardHeight)
        : 0
    return {
      offsets: floorOffsets.map((o) => o * scale),
      compressed: true,
    }
  }

  // Interpolate between ideal and floor to fit.
  const idealExtra = stackSpan - cardHeight
  const floorExtra = floorSpan - cardHeight
  const targetExtra = availableHeight - cardHeight
  const t =
    idealExtra === floorExtra ? 0 : (idealExtra - targetExtra) / (idealExtra - floorExtra)
  const mix = clamp(t, 0, 1)

  return {
    offsets: ideal.map((o, i) => o + (floorOffsets[i]! - o) * mix),
    compressed: mix > 0.35,
  }
}

export function computeLayout(
  state: GameState,
  viewport: ViewportSize,
  settings: LayoutSettings = {},
): Map<CardId, CardPlacement> {
  const metrics = computeBoardMetrics(viewport, settings)
  const map = new Map<CardId, CardPlacement>()
  const safeBottom = viewport.safeBottom ?? 0
  const availableColumnHeight = Math.max(
    metrics.cardHeight,
    viewport.height - metrics.columnsY - safeBottom - metrics.padY,
  )

  // Columns
  for (let col = 0; col < state.columns.length; col++) {
    const cards = state.columns[col] ?? []
    const x = metrics.columnXs[col] ?? metrics.padX
    const { offsets, compressed } = stackOffsets(
      cards,
      metrics.cardHeight,
      availableColumnHeight,
    )
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i]!
      map.set(card.id, {
        x,
        y: metrics.columnsY + (offsets[i] ?? 0),
        z: col * 100 + i,
        rotate: 0,
        scale: 1,
        faceUp: card.faceUp,
        compressed,
      })
    }
  }

  // Stock piles (stacked slightly)
  const stockDeals = state.stock.length
  for (let d = 0; d < stockDeals; d++) {
    const deal = state.stock[d]!
    for (let i = 0; i < deal.length; i++) {
      const card = deal[i]!
      map.set(card.id, {
        x: metrics.stockX + d * 2,
        y: metrics.stockY + d * 1.5,
        z: 1000 + d * 10 + i,
        rotate: 0,
        scale: 1,
        faceUp: false,
        compressed: false,
      })
    }
  }

  // Foundations — show top card of each completed run
  for (let f = 0; f < state.foundations.length; f++) {
    const run = state.foundations[f] ?? []
    const fx = metrics.foundationXs[f] ?? metrics.stockX
    for (let i = 0; i < run.length; i++) {
      const card = run[i]!
      map.set(card.id, {
        x: fx,
        y: metrics.stockY,
        z: 2000 + f * 20 + i,
        rotate: 0,
        scale: 1,
        faceUp: true,
        compressed: false,
      })
    }
  }

  return map
}

export type { BoardMetrics as LayoutMetrics }
