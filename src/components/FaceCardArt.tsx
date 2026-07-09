import type { Suit, Rank } from '../types'

interface FaceCardArtProps {
  rank: Rank
  suit: Suit
  color: string
  width: number
}

export default function FaceCardArt({ rank, suit, color, width }: FaceCardArtProps) {
  const w = width
  const h = Math.round(w * (7 / 5))
  const cx = w / 2
  const cy = h / 2
  const headR = Math.round(w * 0.14)
  const stroke = Math.max(2, Math.round(w * 0.025))

  // Crown for King
  if (rank === 13) {
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="absolute inset-0 pointer-events-none opacity-90">
        {/* Crown base */}
        <path
          d={`M ${cx - w * 0.25} ${cy - headR * 0.4} L ${cx - w * 0.18} ${cy - headR * 0.9} L ${cx - w * 0.05} ${cy - headR * 0.55} L ${cx} ${cy - headR * 1.1} L ${cx + w * 0.05} ${cy - headR * 0.55} L ${cx + w * 0.18} ${cy - headR * 0.9} L ${cx + w * 0.25} ${cy - headR * 0.4} Z`}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinejoin="round"
        />
        {/* Face circle */}
        <circle cx={cx} cy={cy + headR * 0.2} r={headR} fill="none" stroke={color} strokeWidth={stroke} />
        {/* Eyes */}
        <circle cx={cx - headR * 0.35} cy={cy + headR * 0.1} r={headR * 0.1} fill={color} />
        <circle cx={cx + headR * 0.35} cy={cy + headR * 0.1} r={headR * 0.1} fill={color} />
        {/* Beard */}
        <path
          d={`M ${cx - headR * 0.5} ${cy + headR * 0.5} Q ${cx} ${cy + headR * 1.1} ${cx + headR * 0.5} ${cy + headR * 0.5}`}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
        />
        {/* Suit symbol at center */}
        <text x={cx} y={cy - headR * 1.35} textAnchor="middle" fontSize={Math.round(w * 0.16)} fill={color}>
          {suit === 'hearts' || suit === 'diamonds' ? '♥' : '♠'}
        </text>
      </svg>
    )
  }

  // Queen
  if (rank === 12) {
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="absolute inset-0 pointer-events-none opacity-90">
        {/* Crown */}
        <path
          d={`M ${cx - w * 0.22} ${cy - headR * 0.45} L ${cx - w * 0.12} ${cy - headR * 0.85} L ${cx} ${cy - headR * 0.55} L ${cx + w * 0.12} ${cy - headR * 0.85} L ${cx + w * 0.22} ${cy - headR * 0.45} Z`}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinejoin="round"
        />
        {/* Hair / veil shape */}
        <path
          d={`M ${cx - headR * 1.1} ${cy + headR * 0.3} Q ${cx - headR * 1.2} ${cy - headR * 0.6} ${cx} ${cy - headR * 0.6} Q ${cx + headR * 1.2} ${cy - headR * 0.6} ${cx + headR * 1.1} ${cy + headR * 0.3}`}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
        />
        {/* Face */}
        <circle cx={cx} cy={cy + headR * 0.15} r={headR * 0.9} fill="none" stroke={color} strokeWidth={stroke} />
        {/* Eyes */}
        <circle cx={cx - headR * 0.3} cy={cy + headR * 0.05} r={headR * 0.08} fill={color} />
        <circle cx={cx + headR * 0.3} cy={cy + headR * 0.05} r={headR * 0.08} fill={color} />
        {/* Necklace */}
        <path
          d={`M ${cx - headR * 0.45} ${cy + headR * 0.75} Q ${cx} ${cy + headR * 1.05} ${cx + headR * 0.45} ${cy + headR * 0.75}`}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
        />
      </svg>
    )
  }

  // Jack
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="absolute inset-0 pointer-events-none opacity-90">
      {/* Face */}
      <circle cx={cx} cy={cy + headR * 0.1} r={headR} fill="none" stroke={color} strokeWidth={stroke} />
      {/* Eyes */}
      <circle cx={cx - headR * 0.35} cy={cy} r={headR * 0.09} fill={color} />
      <circle cx={cx + headR * 0.35} cy={cy} r={headR * 0.09} fill={color} />
      {/* Smile */}
      <path
        d={`M ${cx - headR * 0.35} ${cy + headR * 0.45} Q ${cx} ${cy + headR * 0.75} ${cx + headR * 0.35} ${cy + headR * 0.45}`}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
      />
      {/* Feather / hat plume */}
      <path
        d={`M ${cx + headR * 0.6} ${cy - headR * 0.6} Q ${cx + headR * 1.1} ${cy - headR * 0.8} ${cx + headR * 0.9} ${cy - headR * 1.3}`}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
      />
      {/* Hat brim */}
      <path
        d={`M ${cx - headR * 0.5} ${cy - headR * 0.5} Q ${cx} ${cy - headR * 0.85} ${cx + headR * 0.5} ${cy - headR * 0.5}`}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
      />
    </svg>
  )
}
