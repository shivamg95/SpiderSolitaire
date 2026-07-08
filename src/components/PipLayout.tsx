import type { Rank, Suit } from '../types'
import { SUIT_SYMBOLS } from '../types'

interface PipLayoutProps {
  rank: Rank
  suit: Suit
  cardWidth: number
  isRed: boolean
}

function pipSize(w: number): number {
  return Math.max(7, Math.min(20, Math.round(w * 0.13)))
}

function aceSize(w: number): number {
  return Math.max(22, Math.min(80, Math.round(w * 0.5)))
}

const PIP_POSITIONS: Record<number, { x: number; y: number; r: number }[]> = {
  2: [
    { x: 50, y: 24, r: 0 }, { x: 50, y: 76, r: 180 },
  ],
  3: [
    { x: 50, y: 24, r: 0 }, { x: 50, y: 50, r: 0 }, { x: 50, y: 76, r: 180 },
  ],
  4: [
    { x: 26, y: 24, r: 0 }, { x: 74, y: 24, r: 0 },
    { x: 26, y: 76, r: 180 }, { x: 74, y: 76, r: 180 },
  ],
  5: [
    { x: 26, y: 24, r: 0 }, { x: 74, y: 24, r: 0 },
    { x: 50, y: 50, r: 0 },
    { x: 26, y: 76, r: 180 }, { x: 74, y: 76, r: 180 },
  ],
  6: [
    { x: 24, y: 22, r: 0 }, { x: 24, y: 50, r: 0 }, { x: 24, y: 78, r: 180 },
    { x: 76, y: 22, r: 0 }, { x: 76, y: 50, r: 0 }, { x: 76, y: 78, r: 180 },
  ],
  7: [
    { x: 24, y: 17, r: 0 }, { x: 24, y: 42, r: 0 }, { x: 24, y: 67, r: 180 },
    { x: 76, y: 17, r: 0 }, { x: 76, y: 42, r: 0 }, { x: 76, y: 67, r: 180 },
    { x: 50, y: 90, r: 180 },
  ],
  8: [
    { x: 24, y: 17, r: 0 }, { x: 24, y: 42, r: 0 }, { x: 24, y: 67, r: 180 },
    { x: 76, y: 17, r: 0 }, { x: 76, y: 42, r: 0 }, { x: 76, y: 67, r: 180 },
    { x: 50, y: 29, r: 0 }, { x: 50, y: 71, r: 180 },
  ],
  9: [
    { x: 24, y: 14, r: 0 }, { x: 24, y: 35, r: 0 }, { x: 24, y: 56, r: 180 }, { x: 24, y: 77, r: 180 },
    { x: 76, y: 14, r: 0 }, { x: 76, y: 35, r: 0 }, { x: 76, y: 56, r: 180 }, { x: 76, y: 77, r: 180 },
    { x: 50, y: 93, r: 180 },
  ],
  10: [
    { x: 24, y: 12, r: 0 }, { x: 24, y: 32, r: 0 }, { x: 24, y: 52, r: 180 }, { x: 24, y: 72, r: 180 },
    { x: 76, y: 12, r: 0 }, { x: 76, y: 32, r: 0 }, { x: 76, y: 52, r: 180 }, { x: 76, y: 72, r: 180 },
    { x: 50, y: 91, r: 180 }, { x: 50, y: 15, r: 0 },
  ],
}

export default function PipLayout({ rank, suit, cardWidth, isRed }: PipLayoutProps) {
  const w = cardWidth
  const sym = SUIT_SYMBOLS[suit]
  const color = isRed ? '#ef4444' : '#1e293b'
  const s = pipSize(w)
  const innerPad = Math.round(w * 0.08)
  const faceLetterSize = Math.max(24, Math.min(88, Math.round(w * 0.55)))
  const faceSmallSize = Math.max(12, Math.min(36, Math.round(w * 0.22)))
  const faceBorderWidth = Math.max(1, Math.round(w * 0.025))

  // Ace
  if (rank === 1) {
    return (
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span style={{ fontSize: aceSize(w), color, lineHeight: 1 }}>{sym}</span>
      </div>
    )
  }

  // Face cards
  if (rank >= 11) {
    const letter = rank === 11 ? 'J' : rank === 12 ? 'Q' : 'K'
    return (
      <div className="absolute pointer-events-none"
        style={{
          inset: innerPad,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Ornamental border box */}
        <div style={{
          position: 'absolute',
          inset: faceBorderWidth * 2,
          border: `${faceBorderWidth}px solid ${color}`,
          borderRadius: Math.round(w * 0.04),
          opacity: 0.7,
        }} />
        {/* Corner accents */}
        <div style={{ position: 'absolute', top: faceBorderWidth * 2, left: faceBorderWidth * 3, width: Math.round(w * 0.12), height: Math.round(w * 0.12), borderTop: `${faceBorderWidth}px solid ${color}`, borderLeft: `${faceBorderWidth}px solid ${color}`, opacity: 0.5 }} />
        <div style={{ position: 'absolute', top: faceBorderWidth * 2, right: faceBorderWidth * 3, width: Math.round(w * 0.12), height: Math.round(w * 0.12), borderTop: `${faceBorderWidth}px solid ${color}`, borderRight: `${faceBorderWidth}px solid ${color}`, opacity: 0.5 }} />

        {/* Main letter */}
        <span style={{
          fontSize: faceLetterSize,
          color,
          fontWeight: 700,
          lineHeight: 1,
          fontFamily: 'Georgia, serif',
        }}>
          {letter}
        </span>

        {/* Mirror letter at bottom */}
        <span style={{
          position: 'absolute',
          bottom: '5%',
          fontSize: faceSmallSize,
          color,
          fontWeight: 700,
          lineHeight: 1,
          fontFamily: 'Georgia, serif',
          transform: 'rotate(180deg)',
        }}>
          {letter}
        </span>
      </div>
    )
  }

  // Number cards (2-10)
  const positions = PIP_POSITIONS[rank] || []
  return (
    <div className="absolute inset-0 pointer-events-none"
      style={{ padding: innerPad }}
    >
      {positions.map((p, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: `${p.y}%`,
            transform: `translate(-50%, -50%) rotate(${p.r}deg)`,
            fontSize: s,
            color,
            lineHeight: 1,
          }}
        >
          {sym}
        </span>
      ))}
    </div>
  )
}
