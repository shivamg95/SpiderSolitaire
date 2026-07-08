import { MAX_FOUNDATIONS, SUIT_SYMBOLS } from '../types'
import type { Suit } from '../types'

interface FoundationProps {
  completedSuits: Suit[]
}

const SUIT_COLORS: Record<Suit, string> = {
  spades: '#1e293b',
  hearts: '#ef4444',
  diamonds: '#ef4444',
  clubs: '#1e293b',
}

export default function Foundation({ completedSuits }: FoundationProps) {
  return (
    <div className="flex gap-2">
      {Array.from({ length: MAX_FOUNDATIONS }).map((_, i) => {
        const suit = completedSuits[i] ?? null
        const isComplete = suit !== null
        const color = suit ? SUIT_COLORS[suit] : undefined

        return (
          <div
            key={i}
            className={`
              w-8 h-10 rounded-md border transition-all duration-300 flex items-center justify-center
              ${isComplete
                ? 'border-[#ffd700]/60 bg-gradient-to-b from-yellow-900/30 to-amber-900/15 shadow-[0_0_8px_rgba(255,215,0,0.3)]'
                : 'border-indigo-800/30 bg-transparent'
              }
            `}
          >
            {isComplete && (
              <div className="w-full h-full flex items-center justify-center">
                <span style={{ fontSize: 14, color, lineHeight: 1, fontWeight: 700 }}>
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
