import { MAX_FOUNDATIONS, SUIT_SYMBOLS } from '../types'
import type { Suit } from '../types'

interface FoundationProps {
  completedSuits: Suit[]
  cardWidth: number
}

const SUIT_COLORS: Record<Suit, string> = {
  spades: '#1e293b',
  hearts: '#ef4444',
  diamonds: '#ef4444',
  clubs: '#1e293b',
}

export default function Foundation({ completedSuits, cardWidth }: FoundationProps) {
  const slotW = Math.max(16, Math.round(cardWidth * 0.48))
  const slotH = Math.max(22, Math.round(cardWidth * 0.67))
  const fontSize = Math.max(7, Math.round(cardWidth * 0.18))

  return (
    <div className="flex gap-1.5">
      {Array.from({ length: MAX_FOUNDATIONS }).map((_, i) => {
        const suit = completedSuits[i] ?? null
        const isComplete = suit !== null
        const color = suit ? SUIT_COLORS[suit] : undefined

        return (
          <div
            key={i}
            className={`
              rounded-md border transition-all duration-300 flex items-center justify-center
              ${isComplete
                ? 'border-[#ffd700]/60 bg-gradient-to-b from-yellow-900/30 to-amber-900/15 shadow-[0_0_8px_rgba(255,215,0,0.3)]'
                : 'border-indigo-800/30 bg-transparent'
              }
            `}
            style={{ width: slotW, height: slotH }}
          >
            {isComplete && (
              <div className="w-full h-full flex items-center justify-center">
                <span style={{ fontSize, color, lineHeight: 1, fontWeight: 700 }}>
                  {SUIT_SYMBOLS[suit!]}
                </span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
