import { memo } from 'react'
import clsx from 'clsx'
import { motion } from 'motion/react'
import type { Card as CardModel, Suit } from '@/engine/types'
import { rankLabel } from '@/engine/cards'
import type { CardPlacement } from '@/layout/computeLayout'
import type { MotionTransition } from '@/animation/springs'
import './Card.css'

const SUIT_PATH: Record<Suit, string> = {
  S: 'M12 2 C9 7 4 10 4 14 C4 17 6.5 19 9 19 C10.2 19 11.2 18.5 12 17.7 C12.8 18.5 13.8 19 15 19 C17.5 19 20 17 20 14 C20 10 15 7 12 2 Z M10.5 19 L12 23 L13.5 19',
  H: 'M12 21 C12 21 3 14 3 9 C3 6 5 4 7.5 4 C9.2 4 10.7 5 12 6.5 C13.3 5 14.8 4 16.5 4 C19 4 21 6 21 9 C21 14 12 21 12 21 Z',
  D: 'M12 2 L20 12 L12 22 L4 12 Z',
  C: 'M12 3 C9.5 3 7.5 5 7.5 7.5 C7.5 9.2 8.4 10.6 9.7 11.3 C7.8 11.7 6.5 13.3 6.5 15.2 C6.5 17.6 8.5 19.5 11 19.5 C11.3 19.5 11.7 19.5 12 19.4 V23 H12 C12.3 19.5 12.7 19.5 13 19.5 C15.5 19.5 17.5 17.6 17.5 15.2 C17.5 13.3 16.2 11.7 14.3 11.3 C15.6 10.6 16.5 9.2 16.5 7.5 C16.5 5 14.5 3 12 3 Z',
}

const RED: ReadonlySet<Suit> = new Set(['H', 'D'])

export interface CardProps {
  readonly card: CardModel
  readonly placement: CardPlacement
  readonly width: number
  readonly height: number
  readonly transition: MotionTransition
  readonly highlighted?: boolean
  readonly selected?: boolean
  readonly dragging?: boolean
  readonly dimmed?: boolean
  readonly interactive?: boolean
  readonly onPointerDown?: (event: React.PointerEvent) => void
  readonly style?: React.CSSProperties
  readonly dragOffset?: { x: number; y: number }
}

function SuitGlyph({ suit, className }: { suit: Suit; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d={SUIT_PATH[suit]} fill="currentColor" />
    </svg>
  )
}

function CardFace({ card }: { card: CardModel }) {
  const label = rankLabel(card.rank)
  const red = RED.has(card.suit)
  return (
    <div className={clsx('card-face', red && 'card-face--red')}>
      <div className="card-index card-index--tl">
        <span>{label}</span>
        <SuitGlyph suit={card.suit} className="card-suit-sm" />
      </div>
      <SuitGlyph suit={card.suit} className="card-suit-lg" />
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

export const Card = memo(function Card({
  card,
  placement,
  width,
  height,
  transition,
  highlighted = false,
  selected = false,
  dragging = false,
  dimmed = false,
  interactive = false,
  onPointerDown,
  style: _style,
  dragOffset,
}: CardProps) {
  void _style
  const x = placement.x + (dragOffset?.x ?? 0)
  const y = placement.y + (dragOffset?.y ?? 0)
  const scale = dragging ? placement.scale * 1.06 : placement.scale

  return (
    <motion.div
      className={clsx(
        'card',
        placement.faceUp ? 'card--up' : 'card--down',
        highlighted && 'card--hint',
        selected && 'card--selected',
        dragging && 'card--dragging',
        dimmed && 'card--dimmed',
        interactive && 'card--interactive',
        placement.compressed && 'card--compressed',
      )}
      style={{
        width,
        height,
        zIndex: dragging ? 5000 + placement.z : placement.z,
      }}
      animate={{
        x,
        y,
        rotate: placement.rotate,
        scale,
        opacity: dimmed ? 0.45 : 1,
      }}
      transition={
        (dragging
          ? { type: 'tween', duration: 0 }
          : transition) as import('motion/react').Transition
      }
      onPointerDown={onPointerDown}
      data-card-id={card.id}
      data-face={placement.faceUp ? 'up' : 'down'}
    >
      <div className="card-inner">
        {placement.faceUp ? <CardFace card={card} /> : <CardBack />}
      </div>
    </motion.div>
  )
})
