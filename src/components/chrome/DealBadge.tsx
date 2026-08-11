import type { Difficulty } from '@/engine/types'
import type { StarRating } from '@/solver/seedPool'
import { starsFor } from '@/state/seedSource'
import './DealBadge.css'

const RATING_WORDS: Record<StarRating, string> = {
  1: 'gentle',
  2: 'easy',
  3: 'fair',
  4: 'tough',
  5: 'brutal',
}

export interface DealBadgeProps {
  readonly seed: number
  readonly difficulty: Difficulty
}

/**
 * "Verified winnable" mark with a difficulty rating.
 *
 * This is a trust signal as much as a label. A hard 4-suit deal feels
 * unwinnable long before it is, and knowing a solution definitely exists is
 * what turns "this game is broken" into "I haven't found it yet". Absent for
 * shared or unverified deals, where the claim would not be true.
 */
export function DealBadge({ seed, difficulty }: DealBadgeProps) {
  const stars = starsFor(difficulty, seed)
  if (stars === null) return null

  const label = `Verified winnable · ${RATING_WORDS[stars]} (${stars} of 5)`

  return (
    <span className="deal-badge" title={label} aria-label={label}>
      <svg
        className="deal-badge__shield"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M12 2.6 4.8 5.4v6.1c0 4.4 2.9 8.4 7.2 9.9 4.3-1.5 7.2-5.5 7.2-9.9V5.4Z" />
        <path d="m8.7 11.9 2.4 2.4 4.2-4.5" />
      </svg>
      <span className="deal-badge__pips" aria-hidden>
        {[1, 2, 3, 4, 5].map((pip) => (
          <i
            key={pip}
            className={
              pip <= stars ? 'deal-badge__pip deal-badge__pip--on' : 'deal-badge__pip'
            }
          />
        ))}
      </span>
    </span>
  )
}
