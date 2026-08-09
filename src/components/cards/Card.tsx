import { memo, useEffect, useState } from 'react'
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
  readonly interactive?: boolean
  readonly flying?: boolean
  readonly flightDelayMs?: number
  readonly reducedMotion?: boolean
  readonly onPointerDown?: (event: React.PointerEvent) => void
  readonly style?: React.CSSProperties
  readonly dragOffset?: { x: number; y: number }
}

function CardFace({ card }: { card: CardModel }) {
  const label = rankLabel(card.rank)
  const red = isRedSuit(card.suit)
  return (
    <div className={clsx('card-face', red && 'card-face--red')}>
      <div className="card-index card-index--tl">
        <span>{label}</span>
        <SuitGlyph suit={card.suit} className="card-suit-sm" />
      </div>
      {isCourtRank(card.rank) ? (
        <CourtArt rank={card.rank} suit={card.suit} />
      ) : (
        <SuitGlyph suit={card.suit} className="card-suit-lg" />
      )}
      <div className="card-index card-index--br">
        <span>{label}</span>
        <SuitGlyph suit={card.suit} className="card-suit-sm" />
      </div>
    </div>
  )
}

function CardBack() {
  return (
    <div className="card-back" aria-hidden>
      <svg viewBox="0 0 100 140" className="card-back-svg">
        <defs>
          <linearGradient id="cb" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--card-back-0)" />
            <stop offset="100%" stopColor="var(--card-back-1)" />
          </linearGradient>
          <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path
              d="M 10 0 L 0 0 0 10"
              fill="none"
              stroke="var(--neon)"
              strokeOpacity="0.25"
              strokeWidth="0.6"
            />
          </pattern>
        </defs>
        <rect x="4" y="4" width="92" height="132" rx="8" fill="url(#cb)" />
        <rect x="10" y="10" width="80" height="120" rx="6" fill="url(#grid)" />
        <circle
          cx="50"
          cy="70"
          r="18"
          fill="none"
          stroke="var(--neon-2)"
          strokeWidth="2"
          opacity="0.7"
        />
      </svg>
    </div>
  )
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
  interactive = false,
  flying = false,
  flightDelayMs = 0,
  reducedMotion = false,
  onPointerDown,
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

  return (
    <motion.div
      className={clsx(
        'card',
        placement.faceUp ? 'card--up' : 'card--down',
        highlighted && 'card--hint',
        selected && 'card--selected',
        dragging && 'card--dragging',
        flying && 'card--flying',
        dimmed && 'card--dimmed',
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
      onPointerDown={onPointerDown}
      data-card-id={card.id}
      data-face={placement.faceUp ? 'up' : 'down'}
    >
      <motion.div
        className="card-lift"
        animate={{ y: arcLift ? [0, arcLift, 0] : 0 }}
        transition={
          arcLift
            ? ({ ...arcTransition, delay } as Transition)
            : ({ duration: 0 } as Transition)
        }
      >
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
                <CardFace card={card} />
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
      </motion.div>
    </motion.div>
  )
})
