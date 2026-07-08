import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import type { Card as CardType } from '../types'
import { getRankName, SUIT_SYMBOLS } from '../types'

const CARD_WIDTH = 64

interface CardProps {
  card: CardType
  onClick?: () => void
  onPointerDown?: (e: React.PointerEvent) => void
  isSelected?: boolean
  zIndex?: number
  offset?: number
}

export default function Card({ card, onClick, onPointerDown, isSelected, zIndex = 0, offset = 0 }: CardProps) {
  const isBlack = card.suit === 'spades' || card.suit === 'clubs'
  const suitColor = isBlack ? 'text-gray-900' : 'text-red-500'
  const [justFlipped, setJustFlipped] = useState(false)

  useEffect(() => {
    if (card.faceUp) {
      setJustFlipped(true)
      const timer = setTimeout(() => setJustFlipped(false), 600)
      return () => clearTimeout(timer)
    }
  }, [card.faceUp])

  return (
    <motion.div
      layout
      layoutId={card.id}
      initial={card.faceUp ? { opacity: 0, scale: 0.9 } : undefined}
      animate={{
        opacity: 1,
        scale: isSelected ? 1.05 : 1,
        boxShadow: card.faceUp
          ? (isSelected
              ? '0 0 20px rgba(0,240,255,0.6), 0 8px 24px rgba(0,0,0,0.5)'
              : '0 2px 8px rgba(0,0,0,0.35)')
          : 'none',
      }}
      exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.12 } }}
      transition={{
        layout: { type: 'spring', stiffness: 500, damping: 35, mass: 0.8 },
        default: { duration: 0.2 },
      }}
      className={`
        absolute rounded-md select-none overflow-hidden
        ${card.faceUp ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}
        ${isSelected
          ? 'ring-2 ring-[#00f0ff]'
          : ''
        }
      `}
      style={{
        width: CARD_WIDTH,
        left: '50%',
        x: '-50%',
        top: 0,
        y: offset,
        zIndex: isSelected ? zIndex + 100 : zIndex,
        aspectRatio: '5 / 7',
      }}
      onClick={(e) => {
        e.stopPropagation()
        onClick?.()
      }}
      onPointerDown={(e) => {
        e.stopPropagation()
        if (card.faceUp) onPointerDown?.(e)
      }}
      whileHover={card.faceUp ? { scale: 1.03, y: offset - 2 } : undefined}
      whileTap={card.faceUp ? { scale: 0.97 } : undefined}
    >
      {!card.faceUp ? (
        <>
          <div
            className="absolute inset-0 rounded-md border border-indigo-800/50"
            style={{
              background: 'linear-gradient(135deg, #1a1050 0%, #1e1660 30%, #162040 60%, #1a1050 100%)',
            }}
          />
          <div
            className="absolute inset-[3px] rounded-sm opacity-50"
            style={{
              background: `
                repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,240,255,0.08) 2px, rgba(0,240,255,0.08) 4px),
                repeating-linear-gradient(-45deg, transparent, transparent 2px, rgba(180,77,255,0.06) 2px, rgba(180,77,255,0.06) 4px)
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
            className="absolute inset-[4px] rounded-sm border border-indigo-600/30"
            style={{
              background: 'linear-gradient(135deg, rgba(180,77,255,0.15) 0%, rgba(0,240,255,0.08) 50%, rgba(180,77,255,0.15) 100%)',
            }}
          />
        </>
      ) : (
        <>
          {justFlipped && (
            <motion.div
              className="absolute inset-0 rounded-md pointer-events-none z-10"
              initial={{ opacity: 0.6 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              style={{
                background: 'radial-gradient(ellipse at center, rgba(0,240,255,0.4) 0%, transparent 70%)',
              }}
            />
          )}
          <div
            className="absolute inset-0 rounded-md"
            style={{
              background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
            }}
          />
          <div className="absolute top-0.5 left-1 flex flex-col items-center leading-none pointer-events-none">
            <span className={`text-[10px] font-bold ${suitColor}`}>
              {getRankName(card.rank)}
            </span>
            <span className={`text-[10px] ${suitColor}`}>
              {SUIT_SYMBOLS[card.suit]}
            </span>
          </div>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className={`text-xl ${suitColor}`}>
              {SUIT_SYMBOLS[card.suit]}
            </span>
          </div>
          <div className="absolute bottom-0.5 right-1 flex flex-col items-center leading-none pointer-events-none [transform:rotate(180deg)]">
            <span className={`text-[10px] font-bold ${suitColor}`}>
              {getRankName(card.rank)}
            </span>
            <span className={`text-[10px] ${suitColor}`}>
              {SUIT_SYMBOLS[card.suit]}
            </span>
          </div>
        </>
      )}
    </motion.div>
  )
}
