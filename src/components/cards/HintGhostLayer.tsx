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
import { CourtArt, isCourtRank } from './CourtArt'
import { SuitGlyph, isRedSuit } from './suits'
import './Card.css'
import './HintGhostLayer.css'

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
  return (
    <div className={clsx('card-face', isRedSuit(card.suit) && 'card-face--red')}>
      <div className="card-index card-index--tl">
        <span>{label}</span>
        <SuitGlyph suit={card.suit} className="card-suit-sm" />
      </div>
      {isCourtRank(card.rank) ? (
        <CourtArt rank={card.rank} suit={card.suit} />
      ) : (
        <SuitGlyph suit={card.suit} className="card-suit-lg" />
      )}
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
