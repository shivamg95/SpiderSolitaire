import { memo, useMemo } from 'react'
import type { Card as CardModel, CardId, GameState } from '@/engine/types'
import { lockedFaceUpRunVisual } from '@/engine/rules'
import type { CardPlacement } from '@/layout/computeLayout'
import {
  RUN_STAGGER_MAX_MS,
  RUN_STAGGER_MS,
  type MotionTransition,
} from '@/animation/springs'
import { Card } from './Card'

export interface CardLayerProps {
  readonly state: GameState
  readonly placements: Map<CardId, CardPlacement>
  readonly cardWidth: number
  readonly cardHeight: number
  readonly transition: MotionTransition
  readonly arcTransition?: MotionTransition
  readonly flipTransition?: MotionTransition
  readonly reducedMotion?: boolean
  readonly hintCardIds?: ReadonlySet<string>
  readonly selectedCardIds?: ReadonlySet<string>
  readonly draggingIds?: ReadonlySet<string>
  /** Card id to its position in the run currently in flight, for the stagger. */
  readonly flightOrder?: ReadonlyMap<string, number>
  readonly dragOffset?: { x: number; y: number }
  readonly onCardPointerDown?: (
    event: React.PointerEvent,
    card: CardModel,
    column: number,
    indexInColumn: number,
  ) => void
}

function collectCards(
  state: GameState,
  keepIds?: ReadonlySet<string>,
): {
  card: CardModel
  column: number | null
  index: number
}[] {
  const out: { card: CardModel; column: number | null; index: number }[] = []
  for (let c = 0; c < state.columns.length; c++) {
    const col = state.columns[c] ?? []
    for (let i = 0; i < col.length; i++) {
      out.push({ card: col[i]!, column: c, index: i })
    }
  }
  // Stock / foundations stack every card at the same {x,y}; only the top of
  // each pile is visible. Keep buried cards mounted only while they animate.
  for (const deal of state.stock) {
    for (let i = 0; i < deal.length; i++) {
      const card = deal[i]!
      if (i === deal.length - 1 || keepIds?.has(card.id)) {
        out.push({ card, column: null, index: i })
      }
    }
  }
  for (const run of state.foundations) {
    for (let i = 0; i < run.length; i++) {
      const card = run[i]!
      if (i === run.length - 1 || keepIds?.has(card.id)) {
        out.push({ card, column: null, index: i })
      }
    }
  }
  return out
}

function columnRunVisuals(state: GameState): {
  lockedIds: ReadonlySet<string>
  breakIds: ReadonlySet<string>
} {
  const lockedIds = new Set<string>()
  const breakIds = new Set<string>()
  for (const col of state.columns) {
    const { lockedIds: locked, breakId } = lockedFaceUpRunVisual(col)
    for (const id of locked) lockedIds.add(id)
    if (breakId) breakIds.add(breakId)
  }
  return { lockedIds, breakIds }
}

export const CardLayer = memo(function CardLayer({
  state,
  placements,
  cardWidth,
  cardHeight,
  transition,
  arcTransition,
  flipTransition,
  reducedMotion = false,
  hintCardIds,
  selectedCardIds,
  draggingIds,
  flightOrder,
  dragOffset,
  onCardPointerDown,
}: CardLayerProps) {
  const keepIds = useMemo(() => {
    if (
      (!draggingIds || draggingIds.size === 0) &&
      (!flightOrder || flightOrder.size === 0)
    ) {
      return undefined
    }
    const ids = new Set<string>()
    if (draggingIds) for (const id of draggingIds) ids.add(id)
    if (flightOrder) for (const id of flightOrder.keys()) ids.add(id)
    return ids
  }, [draggingIds, flightOrder])

  const items = useMemo(() => collectCards(state, keepIds), [state, keepIds])
  const { lockedIds, breakIds } = useMemo(() => columnRunVisuals(state), [state])

  return (
    <div className="card-layer" aria-label="Cards">
      {items.map(({ card, column, index }) => {
        const placement = placements.get(card.id)
        if (!placement) return null
        const isDragging = draggingIds?.has(card.id) ?? false
        const isLocked = lockedIds.has(card.id)
        const interactive = column !== null && card.faceUp && !isLocked
        const flightIndex = flightOrder?.get(card.id)
        return (
          <Card
            key={card.id}
            card={card}
            placement={placement}
            width={cardWidth}
            height={cardHeight}
            transition={transition}
            reducedMotion={reducedMotion}
            highlighted={hintCardIds?.has(card.id) ?? false}
            selected={selectedCardIds?.has(card.id) ?? false}
            dragging={isDragging}
            dimmed={isLocked}
            broken={breakIds.has(card.id)}
            interactive={interactive}
            column={column}
            indexInColumn={index}
            flying={flightIndex !== undefined}
            flightDelayMs={
              flightIndex === undefined
                ? 0
                : Math.min(flightIndex * RUN_STAGGER_MS, RUN_STAGGER_MAX_MS)
            }
            {...(arcTransition ? { arcTransition } : {})}
            {...(flipTransition ? { flipTransition } : {})}
            {...(isDragging && dragOffset ? { dragOffset } : {})}
            {...(interactive && onCardPointerDown ? { onCardPointerDown } : {})}
          />
        )
      })}
    </div>
  )
})
