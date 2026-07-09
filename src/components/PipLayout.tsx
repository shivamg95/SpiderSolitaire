import type { Rank, Suit } from '../types'
import { SUIT_SYMBOLS } from '../types'
import FaceCardArt from './FaceCardArt'

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
    { x: 50, y: 28, r: 0 }, { x: 50, y: 72, r: 180 },
  ],
  3: [
    { x: 50, y: 28, r: 0 }, { x: 50, y: 50, r: 0 }, { x: 50, y: 72, r: 180 },
  ],
  4: [
    { x: 28, y: 28, r: 0 }, { x: 72, y: 28, r: 0 },
    { x: 28, y: 72, r: 180 }, { x: 72, y: 72, r: 180 },
  ],
  5: [
    { x: 28, y: 28, r: 0 }, { x: 72, y: 28, r: 0 },
    { x: 50, y: 50, r: 0 },
    { x: 28, y: 72, r: 180 }, { x: 72, y: 72, r: 180 },
  ],
  6: [
    { x: 28, y: 25, r: 0 }, { x: 28, y: 50, r: 0 }, { x: 28, y: 75, r: 180 },
    { x: 72, y: 25, r: 0 }, { x: 72, y: 50, r: 0 }, { x: 72, y: 75, r: 180 },
  ],
  7: [
    { x: 28, y: 25, r: 0 }, { x: 28, y: 50, r: 0 }, { x: 28, y: 75, r: 180 },
    { x: 72, y: 25, r: 0 }, { x: 72, y: 50, r: 0 }, { x: 72, y: 75, r: 180 },
    { x: 50, y: 37, r: 0 },
  ],
  8: [
    { x: 28, y: 25, r: 0 }, { x: 28, y: 50, r: 0 }, { x: 28, y: 75, r: 180 },
    { x: 72, y: 25, r: 0 }, { x: 72, y: 50, r: 0 }, { x: 72, y: 75, r: 180 },
    { x: 50, y: 37, r: 0 }, { x: 50, y: 63, r: 180 },
  ],
  9: [
    { x: 28, y: 22, r: 0 }, { x: 28, y: 42, r: 0 }, { x: 28, y: 58, r: 180 }, { x: 28, y: 78, r: 180 },
    { x: 72, y: 22, r: 0 }, { x: 72, y: 42, r: 0 }, { x: 72, y: 58, r: 180 }, { x: 72, y: 78, r: 180 },
    { x: 50, y: 50, r: 0 },
  ],
  10: [
    { x: 28, y: 22, r: 0 }, { x: 28, y: 40, r: 0 }, { x: 28, y: 60, r: 180 }, { x: 28, y: 78, r: 180 },
    { x: 72, y: 22, r: 0 }, { x: 72, y: 40, r: 0 }, { x: 72, y: 60, r: 180 }, { x: 72, y: 78, r: 180 },
    { x: 50, y: 31, r: 0 }, { x: 50, y: 69, r: 180 },
  ],
}

export default function PipLayout({ rank, suit, cardWidth, isRed }: PipLayoutProps) {
  const w = cardWidth
  const sym = SUIT_SYMBOLS[suit]
  const color = isRed ? '#ef4444' : '#1e293b'
  const s = pipSize(w)
  const innerPad = Math.round(w * 0.08)
  const faceBorderWidth = Math.max(1, Math.round(w * 0.025))
  const cornerIndexSize = Math.max(10, Math.min(30, Math.round(w * 0.19)))
  const cornerTop = Math.round(w * 0.031)
  const cornerSide = Math.round(w * 0.062)

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
    const isQueen = rank === 12
    const artSize = Math.round(w * 0.78)
    const bgSymSize = Math.max(28, Math.min(100, Math.round(w * 0.62)))
    const cornerAccent = Math.round(w * 0.14)
    const ac = faceBorderWidth
    const tintBg = isRed
      ? 'linear-gradient(135deg, rgba(239,68,68,0.06) 0%, rgba(239,68,68,0.02) 100%)'
      : 'linear-gradient(135deg, rgba(30,41,59,0.06) 0%, rgba(30,41,59,0.02) 100%)'
    const radius = Math.round(w * 0.04)

    return (
      <div className="absolute pointer-events-none"
        style={{
          inset: innerPad,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Suit-tinted background */}
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: radius,
          background: tintBg,
        }} />

        {/* Face card illustration */}
        <div className="absolute inset-0 flex items-center justify-center" style={{ transform: 'translateY(-2%)' }}>
          <FaceCardArt rank={rank} suit={suit} color={color} width={artSize} />
        </div>

        {/* Ornamental border box */}
        <div style={{
          position: 'absolute',
          inset: ac * 2,
          border: `${ac}px solid ${color}`,
          borderRadius: radius,
          opacity: 0.6,
        }} />

        {/* Queen: second inner border */}
        {isQueen && (
          <div style={{
            position: 'absolute',
            inset: ac * 5,
            border: `${Math.max(1, ac - 1)}px solid ${color}`,
            borderRadius: radius,
            opacity: 0.3,
          }} />
        )}

        {/* All four corner accents */}
        <div style={{ position: 'absolute', top: ac * 2, left: ac * 3, width: cornerAccent, height: cornerAccent, borderTop: `${ac}px solid ${color}`, borderLeft: `${ac}px solid ${color}`, opacity: 0.5, borderRadius: radius }} />
        <div style={{ position: 'absolute', top: ac * 2, right: ac * 3, width: cornerAccent, height: cornerAccent, borderTop: `${ac}px solid ${color}`, borderRight: `${ac}px solid ${color}`, opacity: 0.5, borderRadius: radius }} />
        <div style={{ position: 'absolute', bottom: ac * 2, left: ac * 3, width: cornerAccent, height: cornerAccent, borderBottom: `${ac}px solid ${color}`, borderLeft: `${ac}px solid ${color}`, opacity: 0.5, borderRadius: radius }} />
        <div style={{ position: 'absolute', bottom: ac * 2, right: ac * 3, width: cornerAccent, height: cornerAccent, borderBottom: `${ac}px solid ${color}`, borderRight: `${ac}px solid ${color}`, opacity: 0.5, borderRadius: radius }} />

        {/* Large faint background suit symbol */}
        <span style={{
          position: 'absolute',
          fontSize: bgSymSize,
          color,
          opacity: 0.12,
          lineHeight: 1,
        }}>
          {sym}
        </span>

        {/* Bottom-right index, rotated 180° */}
        <div
          className="absolute flex flex-col items-center leading-none pointer-events-none"
          style={{ bottom: cornerTop, right: cornerSide, transform: 'rotate(180deg)' }}
        >
          <span className="font-bold" style={{ fontSize: cornerIndexSize, color, lineHeight: 1 }}>
            {letter}
          </span>
          <span style={{ fontSize: cornerIndexSize, color, lineHeight: 1 }}>
            {sym}
          </span>
        </div>
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
