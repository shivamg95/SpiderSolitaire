import { useEffect, useMemo, useRef } from 'react'
import { motion } from 'motion/react'
import clsx from 'clsx'
import type { Card as CardModel, GameState, Move } from '@/engine/types'
import { rankLabel } from '@/engine/cards'
import type { MotionTransition } from '@/animation/springs'
import {
  columnAttachY,
  type BoardMetrics,
  type CardPlacement,
} from '@/layout/computeLayout'
import { FACE_UP_OVERLAP } from '@/layout/constants'
import './Card.css'
import './HintGhostLayer.css'

const SUIT_PATH: Record<string, string> = {
  S: 'M12 2 C9 7 4 10 4 14 C4 17 6.5 19 9 19 C10.2 19 11.2 18.5 12 17.7 C12.8 18.5 13.8 19 15 19 C17.5 19 20 17 20 14 C20 10 15 7 12 2 Z M10.5 19 L12 23 L13.5 19',
  H: 'M12 21 C12 21 3 14 3 9 C3 6 5 4 7.5 4 C9.2 4 10.7 5 12 6.5 C13.3 5 14.8 4 16.5 4 C19 4 21 6 21 9 C21 14 12 21 12 21 Z',
  D: 'M12 2 L20 12 L12 22 L4 12 Z',
  C: 'M12 3 C9.5 3 7.5 5 7.5 7.5 C7.5 9.2 8.4 10.6 9.7 11.3 C7.8 11.7 6.5 13.3 6.5 15.2 C6.5 17.6 8.5 19.5 11 19.5 C11.3 19.5 11.7 19.5 12 19.4 V23 H12 C12.3 19.5 12.7 19.5 13 19.5 C15.5 19.5 17.5 17.6 17.5 15.2 C17.5 13.3 16.2 11.7 14.3 11.3 C15.6 10.6 16.5 9.2 16.5 7.5 C16.5 5 14.5 3 12 3 Z',
}

const RED = new Set(['H', 'D'])

const PAUSE_MS = 420
const DEAL_PULSE_MS = 900

export interface HintGhostLayerProps {
  readonly state: GameState
  readonly move: Move | null
  readonly hintIndex: number
  readonly playing: boolean
  readonly placements: Map<string, CardPlacement>
  readonly metrics: BoardMetrics
  readonly availableColumnHeight: number
  readonly transition: MotionTransition
  readonly reducedMotion: boolean
  readonly onCycleComplete: () => void
}

function GhostFace({ card }: { card: CardModel }) {
  const label = rankLabel(card.rank)
  const red = RED.has(card.suit)
  const path = SUIT_PATH[card.suit]
  return (
    <div className={clsx('card-face', red && 'card-face--red')}>
      <div className="card-index card-index--tl">
        <span>{label}</span>
        {path ? (
          <svg viewBox="0 0 24 24" className="card-suit-sm" aria-hidden>
            <path d={path} fill="currentColor" />
          </svg>
        ) : null}
      </div>
      {path ? (
        <svg viewBox="0 0 24 24" className="card-suit-lg" aria-hidden>
          <path d={path} fill="currentColor" />
        </svg>
      ) : null}
    </div>
  )
}

export function HintGhostLayer({
  state,
  move,
  hintIndex,
  playing,
  placements,
  metrics,
  availableColumnHeight,
  transition,
  reducedMotion,
  onCycleComplete,
}: HintGhostLayerProps) {
  const completedRef = useRef(false)
  const cycleKey = `${hintIndex}-${move ? JSON.stringify(move) : 'none'}`

  useEffect(() => {
    completedRef.current = false
  }, [cycleKey])

  useEffect(() => {
    if (!playing || move?.kind !== 'dealStock') return
    const id = window.setTimeout(
      () => {
        onCycleComplete()
      },
      reducedMotion ? 200 : DEAL_PULSE_MS,
    )
    return () => {
      window.clearTimeout(id)
    }
  }, [playing, move, reducedMotion, onCycleComplete, cycleKey])

  const flight = useMemo(() => {
    if (!playing || move?.kind !== 'moveRun') return null
    const col = state.columns[move.from]
    if (!col || move.count < 1) return null
    const run = col.slice(col.length - move.count)
    const destCol = state.columns[move.to] ?? []
    const destX = metrics.columnXs[move.to] ?? metrics.padX
    const attachY = columnAttachY(metrics, destCol, availableColumnHeight)
    const step = metrics.cardHeight * FACE_UP_OVERLAP

    const cards = run.map((card, i) => {
      const src = placements.get(card.id)
      if (!src) return null
      return {
        card,
        from: { x: src.x, y: src.y },
        to: { x: destX, y: attachY + i * step },
        z: 6000 + i,
      }
    })
    if (cards.some((c) => c === null)) return null
    return cards as NonNullable<(typeof cards)[number]>[]
  }, [playing, move, state.columns, placements, metrics, availableColumnHeight])

  const finish = () => {
    if (completedRef.current) return
    completedRef.current = true
    window.setTimeout(
      () => {
        onCycleComplete()
      },
      reducedMotion ? 80 : PAUSE_MS,
    )
  }

  if (!playing || !move) return null

  if (move.kind === 'dealStock') {
    return (
      <div className="hint-ghost-layer" aria-hidden>
        <div className="hint-ghost-deal-label">Deal</div>
      </div>
    )
  }

  if (!flight || flight.length === 0) return null

  const motionTransition = reducedMotion
    ? ({ type: 'tween', duration: 0.12, ease: 'easeOut' } as const)
    : transition

  return (
    <div className="hint-ghost-layer" aria-hidden>
      {flight.map((item, i) => (
        <motion.div
          key={`${cycleKey}-${item.card.id}`}
          className="card card--up card--ghost"
          style={{
            width: metrics.cardWidth,
            height: metrics.cardHeight,
            zIndex: item.z,
          }}
          initial={
            reducedMotion
              ? { x: item.to.x, y: item.to.y, opacity: 0.35, scale: 1 }
              : { x: item.from.x, y: item.from.y, opacity: 0.55, scale: 1 }
          }
          animate={
            reducedMotion
              ? { x: item.to.x, y: item.to.y, opacity: 0.55, scale: 1 }
              : { x: item.to.x, y: item.to.y, opacity: 0.55, scale: 1 }
          }
          transition={motionTransition as import('motion/react').Transition}
          onAnimationComplete={() => {
            if (i === flight.length - 1) finish()
          }}
        >
          <div className="card-inner">
            <GhostFace card={item.card} />
          </div>
        </motion.div>
      ))}
    </div>
  )
}
