import type { Card, CardId, GameState } from '@/engine/types'
import {
  BOARD_PAD_X,
  BOARD_PAD_Y,
  CARD_ASPECT,
  COLUMN_COUNT,
  FACE_DOWN_FLOOR,
  FACE_DOWN_OVERLAP,
  FACE_UP_FLOOR,
  FACE_UP_OVERLAP,
  FOUNDATION_SLOTS,
  FOUNDATION_STEP_RATIO,
  MAX_CARD_HEIGHT_RATIO,
  MAX_CARD_WIDTH,
  MAX_GAP_RATIO,
  MIN_CARD_WIDTH,
  MIN_COLUMN_GAP,
  MIN_FOUNDATION_STEP,
  MIN_RAIL_WIDTH,
  MAX_RAIL_WIDTH,
  NARROW_LAYOUT_BREAKPOINT,
  RAIL_CARD_SCALE,
  RAIL_GAP,
  TARGET_GAP_RATIO,
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
}

export type LayoutMode = 'rail' | 'bottom'

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
  readonly boardHeight: number
  readonly boardWidth: number
  readonly columnsY: number
  readonly columnWidth: number
  readonly columnXs: readonly number[]
  readonly layoutMode: LayoutMode
  readonly railX: number
  readonly railY: number
  readonly railWidth: number
  readonly railHeight: number
  readonly railCardWidth: number
  readonly railCardHeight: number
  readonly foundationX: number
  readonly foundationYs: readonly number[]
  readonly foundationStep: number
  readonly stockX: number
  readonly stockY: number
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

/** Left edge so a scaled card (transform-origin: center top) visually starts at `visualX`. */
function scaledLeft(visualX: number, cardWidth: number, scale: number): number {
  return visualX - (cardWidth * (1 - scale)) / 2
}

export function computeBoardMetrics(
  viewport: ViewportSize,
  settings: LayoutSettings = {},
): BoardMetrics {
  const safeLeft = viewport.safeLeft ?? 0
  const safeRight = viewport.safeRight ?? 0
  const safeTop = viewport.safeTop ?? 0
  const safeBottom = viewport.safeBottom ?? 0
  const padX = settings.padX ?? BOARD_PAD_X
  const padY = settings.padY ?? BOARD_PAD_Y

  const boardWidth = Math.max(0, viewport.width)
  const boardHeight = Math.max(0, viewport.height)
  const layoutMode: LayoutMode = boardWidth < NARROW_LAYOUT_BREAKPOINT ? 'bottom' : 'rail'

  const innerW = Math.max(0, boardWidth - safeLeft - safeRight - 2 * padX)
  const innerH = Math.max(0, boardHeight - safeTop - safeBottom - 2 * padY)

  // First-pass card estimate to size the rail proportionally.
  const roughTableau = layoutMode === 'rail' ? innerW * 0.88 : innerW
  const roughW = clamp(
    roughTableau / (COLUMN_COUNT + (COLUMN_COUNT - 1) * TARGET_GAP_RATIO),
    MIN_CARD_WIDTH,
    MAX_CARD_WIDTH,
  )

  let railWidth: number
  let railHeight: number
  let tableauWidth: number
  let tableauHeight: number

  if (layoutMode === 'rail') {
    railWidth = clamp(roughW * RAIL_CARD_SCALE + 16, MIN_RAIL_WIDTH, MAX_RAIL_WIDTH)
    railHeight = innerH
    tableauWidth = Math.max(0, innerW - railWidth - RAIL_GAP)
    tableauHeight = innerH
  } else {
    railWidth = innerW
    railHeight = clamp((roughW / CARD_ASPECT) * RAIL_CARD_SCALE + padY * 2, 72, 140)
    tableauWidth = innerW
    tableauHeight = Math.max(0, innerH - railHeight - RAIL_GAP)
  }

  const gapFactor = COLUMN_COUNT + (COLUMN_COUNT - 1) * TARGET_GAP_RATIO
  let cardWidth = clamp(tableauWidth / gapFactor, MIN_CARD_WIDTH, MAX_CARD_WIDTH)
  let cardHeight = cardWidth / CARD_ASPECT
  const maxH = tableauHeight * MAX_CARD_HEIGHT_RATIO
  if (cardHeight > maxH && maxH > 0) {
    cardHeight = maxH
    cardWidth = clamp(cardHeight * CARD_ASPECT, MIN_CARD_WIDTH, MAX_CARD_WIDTH)
    cardHeight = cardWidth / CARD_ASPECT
  }

  let columnGap =
    COLUMN_COUNT > 1
      ? clamp(cardWidth * TARGET_GAP_RATIO, MIN_COLUMN_GAP, cardWidth * MAX_GAP_RATIO)
      : 0

  let packWidth = cardWidth * COLUMN_COUNT + columnGap * Math.max(0, COLUMN_COUNT - 1)
  if (packWidth > tableauWidth && COLUMN_COUNT > 1) {
    const maxGapBudget = Math.max(0, tableauWidth - MIN_CARD_WIDTH * COLUMN_COUNT)
    columnGap = clamp(
      maxGapBudget / (COLUMN_COUNT - 1),
      MIN_COLUMN_GAP,
      cardWidth * MAX_GAP_RATIO,
    )
    cardWidth = clamp(
      (tableauWidth - columnGap * (COLUMN_COUNT - 1)) / COLUMN_COUNT,
      MIN_CARD_WIDTH,
      MAX_CARD_WIDTH,
    )
    cardHeight = cardWidth / CARD_ASPECT
    columnGap = clamp(
      cardWidth * TARGET_GAP_RATIO,
      MIN_COLUMN_GAP,
      cardWidth * MAX_GAP_RATIO,
    )
    packWidth = cardWidth * COLUMN_COUNT + columnGap * (COLUMN_COUNT - 1)
    if (packWidth > tableauWidth) {
      columnGap = Math.max(
        MIN_COLUMN_GAP,
        (tableauWidth - cardWidth * COLUMN_COUNT) / (COLUMN_COUNT - 1),
      )
      packWidth = cardWidth * COLUMN_COUNT + columnGap * (COLUMN_COUNT - 1)
    }
  }

  // Sync rail to final card size (rail mode only).
  if (layoutMode === 'rail') {
    railWidth = clamp(cardWidth * RAIL_CARD_SCALE + 16, MIN_RAIL_WIDTH, MAX_RAIL_WIDTH)
    tableauWidth = Math.max(0, innerW - railWidth - RAIL_GAP)
    packWidth = cardWidth * COLUMN_COUNT + columnGap * Math.max(0, COLUMN_COUNT - 1)
    if (packWidth > tableauWidth && COLUMN_COUNT > 1) {
      cardWidth = clamp(
        (tableauWidth - columnGap * (COLUMN_COUNT - 1)) / COLUMN_COUNT,
        MIN_CARD_WIDTH,
        MAX_CARD_WIDTH,
      )
      cardHeight = cardWidth / CARD_ASPECT
      columnGap = clamp(
        cardWidth * TARGET_GAP_RATIO,
        MIN_COLUMN_GAP,
        cardWidth * MAX_GAP_RATIO,
      )
      packWidth = cardWidth * COLUMN_COUNT + columnGap * (COLUMN_COUNT - 1)
      if (packWidth > tableauWidth) {
        columnGap = Math.max(
          MIN_COLUMN_GAP,
          (tableauWidth - cardWidth * COLUMN_COUNT) / (COLUMN_COUNT - 1),
        )
        packWidth = cardWidth * COLUMN_COUNT + columnGap * (COLUMN_COUNT - 1)
      }
    }
  }

  const tableauOriginX = safeLeft + padX
  const originX = tableauOriginX + Math.max(0, (tableauWidth - packWidth) / 2)
  const columnsY = safeTop + padY
  const columnXs = Array.from({ length: COLUMN_COUNT }, (_, i) => {
    return originX + i * (cardWidth + columnGap)
  })

  const railCardWidth = cardWidth * RAIL_CARD_SCALE
  const railCardHeight = cardHeight * RAIL_CARD_SCALE
  const foundationStep = Math.max(MIN_FOUNDATION_STEP, cardHeight * FOUNDATION_STEP_RATIO)

  let railX: number
  let railY: number
  let foundationX: number
  let stockX: number
  let stockY: number
  let foundationYs: number[]

  if (layoutMode === 'rail') {
    railX = tableauOriginX + tableauWidth + RAIL_GAP
    railY = columnsY
    foundationX = railX + Math.max(0, (railWidth - railCardWidth) / 2)
    stockX = foundationX
    stockY = columnsY + tableauHeight - railCardHeight
    foundationYs = Array.from({ length: FOUNDATION_SLOTS }, (_, f) => {
      return columnsY + f * foundationStep
    })
  } else {
    railX = tableauOriginX
    railY = columnsY + tableauHeight + RAIL_GAP
    foundationX = railX
    stockX = railX + railWidth - railCardWidth
    stockY = railY + Math.max(0, (railHeight - railCardHeight) / 2)
    foundationYs = Array.from({ length: FOUNDATION_SLOTS }, (_, f) => {
      return stockY + f * Math.min(foundationStep, 8)
    })
  }

  return {
    cardWidth,
    cardHeight,
    columnGap,
    padX,
    padY,
    boardHeight,
    boardWidth,
    columnsY,
    columnWidth: cardWidth,
    columnXs,
    layoutMode,
    railX,
    railY,
    railWidth,
    railHeight,
    railCardWidth,
    railCardHeight,
    foundationX,
    foundationYs,
    foundationStep,
    stockX,
    stockY,
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
    const scale =
      availableHeight > cardHeight
        ? (availableHeight - cardHeight) / (floorSpan - cardHeight)
        : 0
    return {
      offsets: floorOffsets.map((o) => o * scale),
      compressed: true,
    }
  }

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

/** Y where a card would land when dropped onto a destination column. */
export function columnAttachY(
  metrics: BoardMetrics,
  destCards: readonly Card[],
  availableColumnHeight: number,
): number {
  if (destCards.length === 0) return metrics.columnsY
  const { offsets } = stackOffsets(destCards, metrics.cardHeight, availableColumnHeight)
  const last = offsets[offsets.length - 1] ?? 0
  const top = destCards[destCards.length - 1]!
  const step = metrics.cardHeight * (top.faceUp ? FACE_UP_OVERLAP : FACE_DOWN_OVERLAP)
  return metrics.columnsY + last + step
}

export function computeLayout(
  state: GameState,
  viewport: ViewportSize,
  settings: LayoutSettings = {},
  metricsInput?: BoardMetrics,
): Map<CardId, CardPlacement> {
  const metrics = metricsInput ?? computeBoardMetrics(viewport, settings)
  const map = new Map<CardId, CardPlacement>()
  const safeBottom = viewport.safeBottom ?? 0

  const availableColumnHeight = Math.max(
    metrics.cardHeight,
    (metrics.layoutMode === 'rail'
      ? metrics.boardHeight - metrics.columnsY
      : metrics.railY - metrics.columnsY) -
      safeBottom -
      metrics.padY,
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
        // The tail card is never overlapped, so it keeps its centre artwork even
        // in a squeezed column; only covered cards drop to a corner-index sliver.
        compressed: compressed && i < cards.length - 1,
      })
    }
  }

  // Stock piles (stacked slightly upward for thickness)
  const stockDeals = state.stock.length
  const stockVisualX = metrics.stockX
  const stockLeft = scaledLeft(stockVisualX, metrics.cardWidth, RAIL_CARD_SCALE)
  for (let d = 0; d < stockDeals; d++) {
    const deal = state.stock[d]!
    for (let i = 0; i < deal.length; i++) {
      const card = deal[i]!
      map.set(card.id, {
        x: stockLeft + d * 1.5,
        y: metrics.stockY - d * 2,
        z: 1000 + d * 10 + i,
        rotate: 0,
        scale: RAIL_CARD_SCALE,
        faceUp: false,
        compressed: false,
      })
    }
  }

  // Foundations — stacked downward (rail) or slightly offset (bottom bar)
  for (let f = 0; f < state.foundations.length; f++) {
    const run = state.foundations[f] ?? []
    const fy = metrics.foundationYs[f] ?? metrics.columnsY
    const fx =
      metrics.layoutMode === 'bottom'
        ? metrics.foundationX + f * Math.max(8, metrics.foundationStep * 0.6)
        : metrics.foundationX
    const left = scaledLeft(fx, metrics.cardWidth, RAIL_CARD_SCALE)
    for (let i = 0; i < run.length; i++) {
      const card = run[i]!
      map.set(card.id, {
        x: left,
        y: fy,
        z: 2000 + f * 20 + i,
        rotate: 0,
        scale: RAIL_CARD_SCALE,
        faceUp: true,
        compressed: false,
      })
    }
  }

  return map
}

export type { BoardMetrics as LayoutMetrics }
