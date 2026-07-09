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
  isHinted?: boolean
  zIndex?: number
  offset?: number
}

function fontSize(base: number, width: number, min: number, max: number): number {
  return Math.round(Math.max(min, Math.min(max, width * base)))
}

export default function Card({ card, cardWidth, onClick, onPointerDown, isBlocked, isHinted, zIndex = 0, offset = 0 }: CardProps) {
  const isBlack = card.suit === 'spades' || card.suit === 'clubs'
  const suitColor = isBlack ? 'text-gray-900' : 'text-red-500'
  const [justFlipped, setJustFlipped] = useState(false)

  const w = cardWidth

  const cornerSize = fontSize(0.22, w, 12, 34)
  const hoverLift = Math.round(w * 0.06)

  const cornerTop = Math.round(w * 0.031)
  const cornerSide = Math.round(w * 0.062)
  const borderRadius = Math.round(w * 0.094)

  const shadowY = Math.round(w * 0.03)
  const shadowBlur = Math.round(w * 0.16)
  const tapBlur = Math.round(w * 0.25)
  const hoverGlow = Math.round(w * 0.12)

  const innerInset = Math.round(w * 0.062)

  useEffect(() => {
    if (card.faceUp) {
      setJustFlipped(true)
      const timer = setTimeout(() => setJustFlipped(false), 350)
      return () => clearTimeout(timer)
    }
  }, [card.faceUp])

  const unselShadow = `0 ${shadowY}px ${shadowBlur * 0.5}px rgba(0,0,0,0.15), 0 ${shadowY * 2}px ${shadowBlur}px rgba(0,0,0,0.12), 0 ${shadowY * 4}px ${shadowBlur * 1.5}px rgba(0,0,0,0.08)`
  const hoverShadow = `${unselShadow}, 0 0 ${hoverGlow}px rgba(0,240,255,0.2)`
  const tapShadow = `0 0 ${tapBlur}px rgba(0,240,255,0.35)`

  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: offset,
        width: w,
        zIndex,
        aspectRatio: '5 / 7',
        transform: 'translateX(-50%)',
        touchAction: 'none',
        cursor: card.faceUp && !isBlocked ? 'grab' : 'not-allowed',
      }}
      onClick={(e) => {
        e.stopPropagation()
        if (!isBlocked) onClick?.()
      }}
      onPointerDown={(e) => {
        e.stopPropagation()
        if (card.faceUp && !isBlocked) onPointerDown?.(e)
      }}
    >
      <motion.div
        layout="position"
        layoutId={card.id}
        initial={false}
        animate={{
          opacity: isBlocked ? 0.35 : 1,
          scale: 1,
          scaleX: justFlipped ? [0.3, 1] : 1,
          boxShadow: card.faceUp && !isBlocked ? unselShadow : 'none',
          filter: isBlocked ? 'grayscale(0.6) brightness(0.75) contrast(0.9)' : 'none',
        }}
        exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.12 } }}
        transition={{
          layout: { type: 'spring', stiffness: 300, damping: 25, mass: 1 },
          scaleX: { duration: 0.3, ease: 'easeOut' },
          default: { duration: 0.15 },
        }}
        className="relative select-none overflow-hidden"
        style={{
          width: '100%',
          height: '100%',
          borderRadius,
          willChange: 'transform',
          position: 'relative',
        }}
        whileHover={card.faceUp && !isBlocked ? { scale: 1.04, y: -hoverLift, boxShadow: hoverShadow } : undefined}
        whileTap={card.faceUp && !isBlocked ? { scale: 0.92, boxShadow: tapShadow } : undefined}
      >
        {isHinted && (
          <motion.div
            className="absolute inset-0 pointer-events-none z-20"
            style={{ borderRadius }}
            animate={{ boxShadow: [
              '0 0 0 2px rgba(0,240,255,0.6), 0 0 12px rgba(0,240,255,0.4)',
              '0 0 0 3px rgba(0,240,255,0.9), 0 0 20px rgba(0,240,255,0.6)',
              '0 0 0 2px rgba(0,240,255,0.6), 0 0 12px rgba(0,240,255,0.4)',
            ] }}
            transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
        {!card.faceUp ? (
          <>
            <div
              className="absolute inset-0 border border-indigo-700/40"
              style={{
                borderRadius,
                background: 'linear-gradient(135deg, #161040 0%, #1a1858 40%, #161040 100%)',
              }}
            />
            <div
              className="absolute inset-0 flex items-center justify-center opacity-40"
              style={{ borderRadius }}
            >
              <div
                style={{
                  width: Math.round(w * 0.45),
                  height: Math.round(w * 0.45),
                  transform: 'rotate(45deg)',
                  border: '1px solid rgba(0,240,255,0.25)',
                  borderRadius: Math.round(w * 0.02),
                  background: 'linear-gradient(135deg, rgba(0,240,255,0.08) 0%, rgba(180,77,255,0.05) 100%)',
                  boxShadow: '0 0 12px rgba(0,240,255,0.1)',
                }}
              />
            </div>
            <div
              className="absolute inset-0 opacity-20"
              style={{
                borderRadius,
                background: `
                  radial-gradient(circle at 30% 30%, rgba(0,240,255,0.15) 0%, transparent 40%),
                  radial-gradient(circle at 70% 70%, rgba(180,77,255,0.12) 0%, transparent 40%)
                `,
              }}
            />
            <div
              className="absolute border border-indigo-500/25"
              style={{
                inset: innerInset,
                borderRadius: Math.round(w * 0.062),
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
    </div>
  )
}
