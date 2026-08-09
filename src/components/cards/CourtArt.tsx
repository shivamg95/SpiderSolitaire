import type { Rank, Suit } from '@/engine/types'
import { SuitShape } from './suits'

/**
 * Court card artwork for J/Q/K, drawn as a half figure in a 120x130 box and
 * mirrored about the centre line the way a real double-headed deck is. Figures
 * use the traditional palette for every suit; only the pip in the panel corner
 * carries the red/black suit colour.
 */

const CENTER_X = 60
const CENTER_Y = 130

export type CourtRank = 11 | 12 | 13

export function isCourtRank(rank: Rank): rank is CourtRank {
  return rank === 11 || rank === 12 || rank === 13
}

function SuitPip({ suit }: { suit: Suit }) {
  return (
    <g transform="translate(8 6) scale(0.8)" fill="currentColor" stroke="none">
      <SuitShape suit={suit} />
    </g>
  )
}

/** Shoulders and robe, shared by all three figures. */
function Robe({ fill }: { fill: string }) {
  return (
    <>
      <path
        d="M18 130 L25 94 C35 108 46 113 60 113 C74 113 85 108 95 94 L102 130 Z"
        fill={fill}
      />
      <path
        d="M28 101 C38 113 47 117 60 117 C73 117 82 113 92 101"
        fill="none"
        stroke="var(--court-gold)"
        strokeWidth="4"
      />
    </>
  )
}

function Eyes({ y }: { y: number }) {
  return (
    <>
      <ellipse cx="52.5" cy={y} rx="2.2" ry="2.6" fill="var(--court-ink)" stroke="none" />
      <ellipse cx="67.5" cy={y} rx="2.2" ry="2.6" fill="var(--court-ink)" stroke="none" />
      <path
        d={`M47 ${y - 6.5} Q52.5 ${y - 10} 58 ${y - 7}`}
        fill="none"
        strokeWidth="2.1"
      />
      <path
        d={`M62 ${y - 7} Q67.5 ${y - 10} 73 ${y - 6.5}`}
        fill="none"
        strokeWidth="2.1"
      />
      <path
        d={`M60 ${y - 1} L57.5 ${y + 10} Q60 ${y + 12} 62.5 ${y + 10}`}
        fill="none"
        strokeWidth="1.7"
      />
    </>
  )
}

function Jack({ suit }: { suit: Suit }) {
  return (
    <g
      stroke="var(--court-ink)"
      strokeWidth="2"
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      {/* halberd */}
      <path d="M16 130 L16 26" strokeWidth="4.5" stroke="var(--court-wood)" />
      <path
        d="M16 30 L16 8 L11 15 Z M16 16 C26 16 32 22 33 31 C25 33 18 28 16 22 Z"
        fill="var(--court-steel)"
      />

      <Robe fill="var(--court-blue)" />

      <path
        d="M33 88 C42 102 78 102 87 88 L95 99 C83 115 37 115 25 99 Z"
        fill="var(--court-white)"
      />

      {/* hair */}
      <path
        d="M33 50 C24 68 26 86 33 98 C40 94 44 88 43 82 C40 70 41 60 46 52 Z"
        fill="var(--court-hair)"
      />
      <path
        d="M87 50 C96 68 94 86 87 98 C80 94 76 88 77 82 C80 70 79 60 74 52 Z"
        fill="var(--court-hair)"
      />

      <ellipse cx="60" cy="68" rx="17" ry="20" fill="var(--court-skin)" />
      <Eyes y={64} />
      <path
        d="M49 79 C53 82 67 82 71 79 C67 85.5 53 85.5 49 79 Z"
        fill="var(--court-hair)"
      />
      <path d="M54 88 Q60 91 66 88" fill="none" strokeWidth="1.8" />

      {/* plumed cap */}
      <path
        d="M86 27 C99 14 110 19 112 30 C101 28 93 34 89 42 Z"
        fill="var(--court-white)"
      />
      <path d="M31 45 C29 24 43 13 60 14 C77 15 90 25 88 45 Z" fill="var(--court-red)" />
      <rect x="28" y="41" width="64" height="12" rx="6" fill="var(--court-gold)" />
      <circle cx="60" cy="47" r="3.2" fill="var(--court-blue)" strokeWidth="1.4" />

      <SuitPip suit={suit} />
    </g>
  )
}

function Queen({ suit }: { suit: Suit }) {
  return (
    <g
      stroke="var(--court-ink)"
      strokeWidth="2"
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      <Robe fill="var(--court-red)" />

      {/* ruff */}
      <path
        d="M32 87 C42 103 78 103 88 87 L97 100 C84 118 36 118 23 100 Z"
        fill="var(--court-white)"
      />

      {/* hair */}
      <path
        d="M33 48 C24 66 25 88 32 100 C39 96 45 90 44 83 C40 70 41 58 46 50 Z"
        fill="var(--court-hair)"
      />
      <path
        d="M87 48 C96 66 95 88 88 100 C81 96 75 90 76 83 C80 70 79 58 74 50 Z"
        fill="var(--court-hair)"
      />

      <ellipse cx="60" cy="67" rx="16.5" ry="20" fill="var(--court-skin)" />
      <Eyes y={63} />
      <path
        d="M53 80 C56 77 64 77 67 80 C64 84 56 84 53 80 Z"
        fill="var(--court-red)"
        strokeWidth="1.6"
      />

      {/* flower held at the shoulder */}
      <path
        d="M34 130 C28 116 25 106 24 98"
        fill="none"
        strokeWidth="2.6"
        stroke="var(--court-green)"
      />
      <path
        d="M28 110 C21 108 16 111 14 116 C20 120 26 117 28 111 Z"
        fill="var(--court-green)"
        strokeWidth="1.6"
      />
      <g strokeWidth="1.6">
        <ellipse cx="23" cy="80" rx="5.5" ry="6.8" fill="var(--court-white)" />
        <ellipse cx="33" cy="88" rx="6.8" ry="5.5" fill="var(--court-white)" />
        <ellipse cx="28" cy="99" rx="6" ry="5.5" fill="var(--court-white)" />
        <ellipse cx="16" cy="97" rx="6" ry="5.5" fill="var(--court-white)" />
        <ellipse cx="13" cy="85" rx="6.2" ry="5.5" fill="var(--court-white)" />
        <circle cx="23" cy="90" r="5.4" fill="var(--court-gold)" />
      </g>

      {/* diadem */}
      <path
        d="M34 46 L37 22 L48 36 L60 17 L72 36 L83 22 L86 46 Z"
        fill="var(--court-gold)"
      />
      <rect x="32" y="42" width="56" height="12" rx="5" fill="var(--court-gold)" />
      <circle cx="37" cy="21" r="3.2" fill="var(--court-white)" strokeWidth="1.4" />
      <circle cx="60" cy="16" r="3.8" fill="var(--court-red)" strokeWidth="1.4" />
      <circle cx="83" cy="21" r="3.2" fill="var(--court-white)" strokeWidth="1.4" />
      <circle cx="46" cy="48" r="2.6" fill="var(--court-red)" strokeWidth="1.3" />
      <circle cx="60" cy="48" r="3" fill="var(--court-blue)" strokeWidth="1.3" />
      <circle cx="74" cy="48" r="2.6" fill="var(--court-red)" strokeWidth="1.3" />

      <SuitPip suit={suit} />
    </g>
  )
}

function King({ suit }: { suit: Suit }) {
  return (
    <g
      stroke="var(--court-ink)"
      strokeWidth="2"
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      <Robe fill="var(--court-blue)" />

      {/* ermine mantle */}
      <path
        d="M32 88 C42 103 78 103 88 88 L96 99 C84 116 36 116 24 99 Z"
        fill="var(--court-white)"
      />
      <circle cx="40" cy="104" r="1.9" fill="var(--court-ink)" stroke="none" />
      <circle cx="60" cy="109" r="2.1" fill="var(--court-ink)" stroke="none" />
      <circle cx="80" cy="104" r="1.9" fill="var(--court-ink)" stroke="none" />

      {/* sword */}
      <path d="M18 104 L18 40 L23 25 L28 40 L28 104 Z" fill="var(--court-steel)" />
      <path d="M23 31 L23 102" strokeWidth="1.2" opacity="0.4" />
      <rect x="9" y="102" width="28" height="7" rx="3" fill="var(--court-gold)" />
      <rect x="20" y="109" width="6" height="9" fill="var(--court-wood)" />
      <circle cx="23" cy="121" r="4" fill="var(--court-gold)" />

      {/* hair */}
      <path
        d="M32 50 C24 66 25 84 32 97 L46 91 C39 80 40 62 44 52 Z"
        fill="var(--court-hair)"
      />
      <path
        d="M88 50 C96 66 95 84 88 97 L74 91 C81 80 80 62 76 52 Z"
        fill="var(--court-hair)"
      />

      <ellipse cx="60" cy="68" rx="17.5" ry="20.5" fill="var(--court-skin)" />
      <Eyes y={64} />

      {/* beard and moustache */}
      <path
        d="M45 78 C46 96 51 106 60 106 C69 106 74 96 75 78 C70 87 66 90 60 90 C54 90 50 87 45 78 Z"
        fill="var(--court-hair)"
      />
      <path
        d="M48 79 C53 83.5 67 83.5 72 79 C68 88 52 88 48 79 Z"
        fill="var(--court-hair)"
        strokeWidth="1.6"
      />

      {/* crown */}
      <path
        d="M31 46 L34 12 L46 31 L60 8 L74 31 L86 12 L89 46 Z"
        fill="var(--court-gold)"
      />
      <rect x="29" y="42" width="62" height="12" rx="4" fill="var(--court-gold)" />
      <circle cx="34" cy="11" r="3.8" fill="var(--court-red)" strokeWidth="1.4" />
      <circle cx="60" cy="7" r="4.2" fill="var(--court-blue)" strokeWidth="1.4" />
      <circle cx="86" cy="11" r="3.8" fill="var(--court-red)" strokeWidth="1.4" />
      <circle cx="44" cy="48" r="2.8" fill="var(--court-red)" strokeWidth="1.3" />
      <circle cx="60" cy="48" r="3.2" fill="var(--court-blue)" strokeWidth="1.3" />
      <circle cx="76" cy="48" r="2.8" fill="var(--court-red)" strokeWidth="1.3" />

      <SuitPip suit={suit} />
    </g>
  )
}

function Figure({ rank, suit }: { rank: CourtRank; suit: Suit }) {
  if (rank === 11) return <Jack suit={suit} />
  if (rank === 12) return <Queen suit={suit} />
  return <King suit={suit} />
}

export function CourtArt({ rank, suit }: { rank: CourtRank; suit: Suit }) {
  return (
    <svg viewBox="0 0 120 260" className="card-court" aria-hidden>
      <rect
        x="1.5"
        y="1.5"
        width="117"
        height="257"
        rx="7"
        fill="var(--court-paper)"
        stroke="var(--court-ink)"
        strokeWidth="2.5"
      />
      <g transform="translate(0 4)">
        <Figure rank={rank} suit={suit} />
      </g>
      <g transform={`rotate(180 ${CENTER_X} ${CENTER_Y}) translate(0 4)`}>
        <Figure rank={rank} suit={suit} />
      </g>
      <rect
        x="3"
        y="126.5"
        width="114"
        height="7"
        fill="var(--court-gold)"
        stroke="var(--court-ink)"
        strokeWidth="1.8"
      />
      <rect
        x="1.5"
        y="1.5"
        width="117"
        height="257"
        rx="7"
        fill="none"
        stroke="var(--court-ink)"
        strokeWidth="2.5"
      />
    </svg>
  )
}
