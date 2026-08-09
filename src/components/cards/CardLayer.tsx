import { memo, useMemo } from 'react'
import type { Card as CardModel, CardId, GameState } from '@/engine/types'
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

function collectCards(state: GameState): {
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
  for (const deal of state.stock) {
    for (let i = 0; i < deal.length; i++) {
      out.push({ card: deal[i]!, column: null, index: i })
    }
  }
  for (const run of state.foundations) {
    for (let i = 0; i < run.length; i++) {
      out.push({ card: run[i]!, column: null, index: i })
    }
  }
  return out
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
  const items = useMemo(() => collectCards(state), [state])

  return (
    <div className="card-layer" aria-label="Cards">
      {items.map(({ card, column, index }) => {
        const placement = placements.get(card.id)
        if (!placement) return null
        const isDragging = draggingIds?.has(card.id) ?? false
        const interactive = column !== null && card.faceUp
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
            interactive={interactive}
            flying={flightIndex !== undefined}
            flightDelayMs={
              flightIndex === undefined
                ? 0
                : Math.min(flightIndex * RUN_STAGGER_MS, RUN_STAGGER_MAX_MS)
            }
            {...(arcTransition ? { arcTransition } : {})}
            {...(flipTransition ? { flipTransition } : {})}
            {...(isDragging && dragOffset ? { dragOffset } : {})}
            {...(interactive && onCardPointerDown
              ? {
                  onPointerDown: (e: React.PointerEvent) => {
                    onCardPointerDown(e, card, column, index)
                  },
                }
              : {})}
          />
        )
      })}
    </div>
  )
})
