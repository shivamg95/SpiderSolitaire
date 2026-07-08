import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import type { Card as CardType } from '../types'
import { getRankName, SUIT_SYMBOLS } from '../types'
import PipLayout from './PipLayout'

interface CardProps {
  card: CardType
  cardWidth: number
  onClick?: () => void
  onPointerDown?: (e: React.PointerEvent) => void
  isBlocked?: boolean
  zIndex?: number
  offset?: number
}

function fontSize(base: number, width: number, min: number, max: number): number {
  return Math.round(Math.max(min, Math.min(max, width * base)))
}

export default function Card({ card, cardWidth, onClick, onPointerDown, isBlocked, zIndex = 0, offset = 0 }: CardProps) {
  const isBlack = card.suit === 'spades' || card.suit === 'clubs'
  const suitColor = isBlack ? 'text-gray-900' : 'text-red-500'
  const [justFlipped, setJustFlipped] = useState(false)

  const w = cardWidth

  const cornerSize = fontSize(0.15, w, 9, 24)
  const hoverLift = Math.round(w * 0.06)

  const cornerTop = Math.round(w * 0.031)
  const cornerSide = Math.round(w * 0.062)
  const borderRadius = Math.round(w * 0.094)

  const shadowY = Math.round(w * 0.031)
  const shadowBlur = Math.round(w * 0.125)
  const tapBlur = Math.round(w * 0.25)
  const hoverGlow = Math.round(w * 0.12)

  const hatchInset = Math.round(w * 0.047)
  const hatchHalf = Math.round(w * 0.031)
  const hatchCycle = Math.round(w * 0.062)
  const innerInset = Math.round(w * 0.062)

  useEffect(() => {
    if (card.faceUp) {
      setJustFlipped(true)
      const timer = setTimeout(() => setJustFlipped(false), 350)
      return () => clearTimeout(timer)
    }
  }, [card.faceUp])

  const unselShadow = `0 ${shadowY}px ${shadowBlur}px rgba(0,0,0,0.35)`
  const hoverShadow = `${unselShadow}, 0 0 ${hoverGlow}px rgba(0,240,255,0.25)`
  const tapShadow = `0 0 ${tapBlur}px rgba(0,240,255,0.5)`

  return (
    <motion.div
      layout="position"
      layoutId={card.id}
      initial={false}
      animate={{
        opacity: isBlocked ? 0.5 : 1,
        scale: 1,
        scaleX: justFlipped ? [0.3, 1] : 1,
        boxShadow: card.faceUp && !isBlocked ? unselShadow : 'none',
      }}
      exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.12 } }}
      transition={{
        layout: { type: 'spring', stiffness: 300, damping: 25, mass: 1 },
        scaleX: { duration: 0.3, ease: 'easeOut' },
        default: { duration: 0.15 },
      }}
      className="absolute select-none overflow-hidden"
      style={{
        width: w,
        left: '50%',
        x: '-50%',
        top: 0,
        y: offset,
        zIndex,
        aspectRatio: '5 / 7',
        borderRadius,
        touchAction: 'none',
        cursor: card.faceUp && !isBlocked ? 'grab' : 'not-allowed',
        willChange: 'transform',
      }}
      onClick={(e) => {
        e.stopPropagation()
        if (!isBlocked) onClick?.()
      }}
      onPointerDown={(e) => {
        e.stopPropagation()
        if (card.faceUp && !isBlocked) onPointerDown?.(e)
      }}
      whileHover={card.faceUp && !isBlocked ? { scale: 1.04, y: offset - hoverLift, boxShadow: hoverShadow } : undefined}
      whileTap={card.faceUp && !isBlocked ? { scale: 0.92, boxShadow: tapShadow } : undefined}
    >
      {!card.faceUp ? (
        <>
          <div
            className="absolute inset-0 border border-indigo-800/50"
            style={{
              borderRadius,
              background: 'linear-gradient(135deg, #1a1050 0%, #1e1660 30%, #162040 60%, #1a1050 100%)',
            }}
          />
          <div
            className="absolute opacity-50"
            style={{
              inset: hatchInset,
              borderRadius: Math.round(w * 0.062),
              background: `
                repeating-linear-gradient(45deg, transparent, transparent ${hatchHalf}px, rgba(0,240,255,0.08) ${hatchHalf}px, rgba(0,240,255,0.08) ${hatchCycle}px),
                repeating-linear-gradient(-45deg, transparent, transparent ${hatchHalf}px, rgba(180,77,255,0.06) ${hatchHalf}px, rgba(180,77,255,0.06) ${hatchCycle}px)
              `,
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="w-2/3 h-2/3 rounded-full opacity-20"
              style={{ background: 'radial-gradient(circle, rgba(0,240,255,0.4) 0%, transparent 70%)' }}
            />
          </div>
          <div
            className="absolute border border-indigo-600/30"
            style={{
              inset: innerInset,
              borderRadius: Math.round(w * 0.062),
              background: 'linear-gradient(135deg, rgba(180,77,255,0.15) 0%, rgba(0,240,255,0.08) 50%, rgba(180,77,255,0.15) 100%)',
            }}
          />
        </>
      ) : (
        <>
          <div
            className="absolute inset-0"
            style={{
              borderRadius,
              background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
            }}
          />
          <div
            className="absolute flex flex-col items-center leading-none pointer-events-none z-10"
            style={{ top: cornerTop, left: cornerSide }}
          >
            <span className={`font-bold ${suitColor}`} style={{ fontSize: cornerSize }}>
              {getRankName(card.rank)}
            </span>
            <span className={suitColor} style={{ fontSize: cornerSize }}>
              {SUIT_SYMBOLS[card.suit]}
            </span>
          </div>
          <PipLayout rank={card.rank} suit={card.suit} cardWidth={w} isRed={!isBlack} />
          <div
            className="absolute flex flex-col items-center leading-none pointer-events-none z-10"
            style={{ bottom: cornerTop, right: cornerSide, transform: 'rotate(180deg)' }}
          >
            <span className={`font-bold ${suitColor}`} style={{ fontSize: cornerSize }}>
              {getRankName(card.rank)}
            </span>
            <span className={suitColor} style={{ fontSize: cornerSize }}>
              {SUIT_SYMBOLS[card.suit]}
            </span>
          </div>
        </>
      )}
    </motion.div>
  )
}
