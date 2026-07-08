import type { Card as CardType } from '../types'
import { getRankName, SUIT_SYMBOLS } from '../types'

interface CardProps {
  card: CardType
  onClick?: () => void
  isSelected?: boolean
  isHovered?: boolean
  zIndex?: number
  offset?: number
}

export default function Card({ card, onClick, isSelected, zIndex = 0, offset = 0 }: CardProps) {
  if (!card.faceUp) {
    return (
    <div
      className="absolute rounded-md cursor-pointer overflow-hidden
                 border border-indigo-800/50 shadow-lg"
      style={{
        width: '64px',
        left: '50%',
        transform: 'translateX(-50%)',
        top: `${offset}px`,
        zIndex,
        aspectRatio: '5 / 7',
          background: `
            linear-gradient(135deg, #1a1050 0%, #1e1660 30%, #162040 60%, #1a1050 100%)
          `,
        }}
      onClick={(e) => {
        e.stopPropagation()
        onClick?.()
      }}
      >
        <div
          className="absolute inset-[3px] rounded-sm opacity-50"
          style={{
            background: `
              repeating-linear-gradient(
                45deg,
                transparent,
                transparent 2px,
                rgba(0, 240, 255, 0.08) 2px,
                rgba(0, 240, 255, 0.08) 4px
              ),
              repeating-linear-gradient(
                -45deg,
                transparent,
                transparent 2px,
                rgba(180, 77, 255, 0.06) 2px,
                rgba(180, 77, 255, 0.06) 4px
              )
            `,
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2/3 h-2/3 rounded-full opacity-20"
            style={{
              background: 'radial-gradient(circle, rgba(0,240,255,0.4) 0%, transparent 70%)',
            }}
          />
        </div>
        <div
          className="absolute inset-[4px] rounded-sm border border-indigo-600/30"
          style={{
            background: `
              linear-gradient(135deg,
                rgba(180, 77, 255, 0.15) 0%,
                rgba(0, 240, 255, 0.08) 50%,
                rgba(180, 77, 255, 0.15) 100%
              )
            `,
          }}
        />
      </div>
    )
  }

  const isBlack = card.suit === 'spades' || card.suit === 'clubs'

  return (
    <div
      className={`
        absolute rounded-md cursor-pointer select-none overflow-hidden
        transition-transform duration-150
        ${isSelected
          ? 'ring-2 ring-[#00f0ff] shadow-[0_0_12px_rgba(0,240,255,0.5)]'
          : 'hover:shadow-[0_0_8px_rgba(0,240,255,0.3)]'
        }
      `}
      style={{
        width: '64px',
        left: '50%',
        transform: 'translateX(-50%)',
        top: `${offset}px`,
        zIndex,
        aspectRatio: '5 / 7',
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        boxShadow: isSelected
          ? '0 0 12px rgba(0,240,255,0.5), 0 4px 12px rgba(0,0,0,0.4)'
          : '0 2px 8px rgba(0,0,0,0.3)',
      }}
      onClick={(e) => {
        e.stopPropagation()
        onClick?.()
      }}
    >
      <div className="absolute top-0.5 left-1 flex flex-col items-center leading-none">
        <span className={`text-[10px] font-bold ${isBlack ? 'text-gray-900' : 'text-red-500'}`}>
          {getRankName(card.rank)}
        </span>
        <span className={`text-[10px] ${isBlack ? 'text-gray-900' : 'text-red-500'}`}>
          {SUIT_SYMBOLS[card.suit]}
        </span>
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-xl ${isBlack ? 'text-gray-900' : 'text-red-500'}`}>
          {SUIT_SYMBOLS[card.suit]}
        </span>
      </div>
      <div className="absolute bottom-0.5 right-1 flex flex-col items-center leading-none rotate-180">
        <span className={`text-[10px] font-bold ${isBlack ? 'text-gray-900' : 'text-red-500'}`}>
          {getRankName(card.rank)}
        </span>
        <span className={`text-[10px] ${isBlack ? 'text-gray-900' : 'text-red-500'}`}>
          {SUIT_SYMBOLS[card.suit]}
        </span>
      </div>
    </div>
  )
}
