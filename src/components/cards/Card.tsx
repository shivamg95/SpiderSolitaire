import { memo, useCallback, useEffect, useState } from 'react'
import clsx from 'clsx'
import { motion, type Transition } from 'motion/react'
import type { Card as CardModel } from '@/engine/types'
import { rankLabel } from '@/engine/cards'
import type { CardPlacement } from '@/layout/computeLayout'
import { FLIP_MS, MOVE_ARC_RATIO, type MotionTransition } from '@/animation/springs'
import { CourtArt, isCourtRank } from './CourtArt'
import { SuitGlyph, isRedSuit } from './suits'
import './Card.css'

/** Above settled cards, below the drag layer, so a move never slides behind. */
const FLIGHT_Z = 4000
const DRAG_Z = 5000

export interface CardProps {
  readonly card: CardModel
  readonly placement: CardPlacement
  readonly width: number
  readonly height: number
  readonly transition: MotionTransition
  readonly arcTransition?: MotionTransition
  readonly flipTransition?: MotionTransition
  readonly highlighted?: boolean
  readonly selected?: boolean
  readonly dragging?: boolean
  readonly dimmed?: boolean
  readonly broken?: boolean
  readonly interactive?: boolean
  readonly flying?: boolean
  readonly flightDelayMs?: number
  readonly reducedMotion?: boolean
  /** Column index when the card sits in the tableau; null for stock/foundation. */
  readonly column?: number | null
  readonly indexInColumn?: number
  readonly onCardPointerDown?: (
    event: React.PointerEvent,
    card: CardModel,
    column: number,
    indexInColumn: number,
  ) => void
  readonly style?: React.CSSProperties
  readonly dragOffset?: { x: number; y: number }
}

function CardFace({ card, compressed }: { card: CardModel; compressed: boolean }) {
  const label = rankLabel(card.rank)
  const red = isRedSuit(card.suit)
  return (
    <div className={clsx('card-face', red && 'card-face--red')}>
      <div className="card-index card-index--tl">
        <span>{label}</span>
        <SuitGlyph suit={card.suit} className="card-suit-sm" />
      </div>
      {!compressed ? (
        isCourtRank(card.rank) ? (
          <CourtArt rank={card.rank} suit={card.suit} />
        ) : (
          <SuitGlyph suit={card.suit} className="card-suit-lg" />
        )
      ) : null}
      <div className="card-index card-index--br">
        <span>{label}</span>
        <SuitGlyph suit={card.suit} className="card-suit-sm" />
      </div>
    </div>
  )
}

function CardBack() {
  return <div className="card-back" aria-hidden />
}

/**
 * True while a face change is being animated. Derived during render so the flip
 * transition is already in place on the commit that turns the card over.
 */
function useFaceFlip(faceUp: boolean, enabled: boolean): boolean {
  const [state, setState] = useState({ faceUp, seq: 0, animating: false })

  if (state.faceUp !== faceUp) {
    setState({ faceUp, seq: state.seq + 1, animating: enabled })
  }

  useEffect(() => {
    if (!state.animating) return
    const id = window.setTimeout(() => {
      setState((s) => ({ ...s, animating: false }))
    }, FLIP_MS)
    return () => {
      window.clearTimeout(id)
    }
  }, [state.animating, state.seq])

  return state.animating
}

export const Card = memo(function Card({
  card,
  placement,
  width,
  height,
  transition,
  arcTransition,
  flipTransition,
  highlighted = false,
  selected = false,
  dragging = false,
  dimmed = false,
  broken = false,
  interactive = false,
  flying = false,
  flightDelayMs = 0,
  reducedMotion = false,
  column = null,
  indexInColumn = 0,
  onCardPointerDown,
  style: _style,
  dragOffset,
}: CardProps) {
  void _style
  const x = placement.x + (dragOffset?.x ?? 0)
  const y = placement.y + (dragOffset?.y ?? 0)
  const scale = dragging ? placement.scale * 1.06 : placement.scale
  const flipping = useFaceFlip(placement.faceUp, !reducedMotion)

  const delay = flying ? flightDelayMs / 1000 : 0
  const arcLift = flying && !reducedMotion ? -height * MOVE_ARC_RATIO : 0

  const positionTransition: Transition = dragging
    ? { type: 'tween', duration: 0 }
    : ({ ...transition, delay } as Transition)

  const handlePointerDown = useCallback(
    (event: React.PointerEvent) => {
      if (!interactive || column === null || !onCardPointerDown) return
      onCardPointerDown(event, card, column, indexInColumn)
    },
    [card, column, indexInColumn, interactive, onCardPointerDown],
  )

  const face = (
    <motion.div
      className="card-flip"
      animate={{ rotateY: placement.faceUp ? 0 : 180 }}
      transition={
        flipping ? (flipTransition as Transition) : ({ duration: 0 } as Transition)
      }
    >
      {placement.faceUp || flipping ? (
        <div className="card-side card-side--front">
          <div className="card-inner">
            <CardFace card={card} compressed={placement.compressed} />
          </div>
        </div>
      ) : null}
      {!placement.faceUp || flipping ? (
        <div className="card-side card-side--back">
          <div className="card-inner">
            <CardBack />
          </div>
        </div>
      ) : null}
    </motion.div>
  )

  return (
    <motion.div
      className={clsx(
        'card',
        placement.faceUp ? 'card--up' : 'card--down',
        highlighted && 'card--hint',
        selected && 'card--selected',
        dragging && 'card--dragging',
        flying && 'card--flying',
        flipping && 'card--flipping',
        dimmed && 'card--dimmed',
        broken && 'card--broken',
        interactive && 'card--interactive',
        placement.compressed && 'card--compressed',
      )}
      style={{
        width,
        height,
        zIndex: (dragging ? DRAG_Z : flying || flipping ? FLIGHT_Z : 0) + placement.z,
      }}
      animate={{
        x,
        y,
        rotate: placement.rotate,
        scale,
        opacity: dimmed ? 0.45 : 1,
      }}
      transition={positionTransition}
      onPointerDown={interactive ? handlePointerDown : undefined}
      data-card-id={card.id}
      data-face={placement.faceUp ? 'up' : 'down'}
    >
      {arcLift ? (
        <motion.div
          className="card-lift"
          animate={{ y: [0, arcLift, 0] }}
          transition={{ ...arcTransition, delay } as Transition}
        >
          {face}
        </motion.div>
      ) : (
        <div className="card-lift">{face}</div>
      )}
    </motion.div>
  )
})
