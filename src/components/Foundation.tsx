import { MAX_FOUNDATIONS, SUIT_SYMBOLS } from '../types'
import type { Suit } from '../types'

interface FoundationProps {
  completedSuits: Suit[]
  cardWidth: number
  vertical?: boolean
}

const SUIT_COLORS: Record<Suit, string> = {
  spades: '#1e293b',
  hearts: '#ef4444',
  diamonds: '#ef4444',
  clubs: '#1e293b',
}

const SUIT_ORDER: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs']

export default function Foundation({ completedSuits, cardWidth, vertical }: FoundationProps) {
  const slotW = Math.max(28, Math.round(cardWidth * 0.75))
  const slotH = Math.round(slotW * (7 / 5))
  const fontSize = Math.max(14, Math.round(slotW * 0.4))
  const placeholderSize = Math.max(12, Math.round(slotW * 0.32))
  const radius = Math.round(slotW * 0.094)

  if (vertical) {
    const overlap = Math.round(slotH * (5 / 6))
    return (
      <div className="flex flex-col items-center">
        {Array.from({ length: MAX_FOUNDATIONS }).map((_, i) => {
          const suit = completedSuits[i] ?? null
          const isComplete = suit !== null
          const shouldRender = i === 0 || isComplete
          const expectedSuit = SUIT_ORDER[i % SUIT_ORDER.length]
          const color = suit ? SUIT_COLORS[suit] : 'rgba(99,102,241,0.3)'

          if (!shouldRender) return null

          return (
            <div
              key={i}
              className={`
                border transition-all duration-300 flex items-center justify-center overflow-hidden
                ${isComplete
                  ? 'border-[#ffd700]/60 bg-gradient-to-b from-yellow-900/30 to-amber-900/15 shadow-[0_0_10px_rgba(255,215,0,0.3)]'
                  : 'border-indigo-500/20 bg-indigo-950/20'
                }
              `}
              style={{ width: slotW, height: slotH, borderRadius: radius, marginTop: i === 0 ? 0 : -overlap }}
            >
              {isComplete ? (
                <div className="w-full h-full flex items-center justify-center">
                  <span style={{ fontSize, color, lineHeight: 1, fontWeight: 700 }}>
                    {SUIT_SYMBOLS[suit!]}
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-0.5">
                  <span
                    style={{
                      fontSize: placeholderSize,
                      color: 'rgba(99,102,241,0.25)',
                      lineHeight: 1,
                    }}
                  >
                    {SUIT_SYMBOLS[expectedSuit]}
                  </span>
                  <span
                    style={{
                      fontSize: Math.max(8, Math.round(slotW * 0.14)),
                      color: 'rgba(99,102,241,0.2)',
                      lineHeight: 1,
                    }}
                  >
                    {i + 1}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="flex gap-1.5">
      {Array.from({ length: MAX_FOUNDATIONS }).map((_, i) => {
        const suit = completedSuits[i] ?? null
        const isComplete = suit !== null
        const expectedSuit = SUIT_ORDER[i % SUIT_ORDER.length]
        const color = suit ? SUIT_COLORS[suit] : 'rgba(99,102,241,0.3)'

        return (
          <div
            key={i}
            className={`
              border transition-all duration-300 flex items-center justify-center overflow-hidden
              ${isComplete
                ? 'border-[#ffd700]/60 bg-gradient-to-b from-yellow-900/30 to-amber-900/15 shadow-[0_0_10px_rgba(255,215,0,0.3)]'
                : 'border-indigo-500/20 bg-indigo-950/20'
              }
            `}
            style={{ width: slotW, height: slotH, borderRadius: radius }}
          >
            {isComplete ? (
              <div className="w-full h-full flex items-center justify-center">
                <span style={{ fontSize, color, lineHeight: 1, fontWeight: 700 }}>
                  {SUIT_SYMBOLS[suit!]}
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-0.5">
                <span
                  style={{
                    fontSize: placeholderSize,
                    color: 'rgba(99,102,241,0.25)',
                    lineHeight: 1,
                  }}
                >
                  {SUIT_SYMBOLS[expectedSuit]}
                </span>
                <span
                  style={{
                    fontSize: Math.max(8, Math.round(slotW * 0.14)),
                    color: 'rgba(99,102,241,0.2)',
                    lineHeight: 1,
                  }}
                >
                  {i + 1}
                </span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
