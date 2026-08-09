import type { Suit } from '@/engine/types'

/**
 * Suit artwork drawn in a 24x24 box.
 *
 * Spades, hearts and diamonds are single filled outlines. Clubs are a union of
 * three lobes plus a stem, kept as separate elements so the overlaps merge
 * without depending on path winding order.
 */
const SUIT_PATH: Record<Exclude<Suit, 'C'>, string> = {
  S: 'M12 2.1 C9.2 6.7 4 9.5 4 13.7 C4 16.7 6.3 19 9 19 C10.2 19 11.2 18.5 12 17.7 C11.9 19.9 11.2 21.4 9.6 22.3 L14.4 22.3 C12.8 21.4 12.1 19.9 12 17.7 C12.8 18.5 13.8 19 15 19 C17.7 19 20 16.7 20 13.7 C20 9.5 14.8 6.7 12 2.1 Z',
  H: 'M12 21.4 C12 21.4 3 14.3 3 9 C3 6 5.2 3.8 7.8 3.8 C9.6 3.8 11 4.9 12 6.4 C13 4.9 14.4 3.8 16.2 3.8 C18.8 3.8 21 6 21 9 C21 14.3 12 21.4 12 21.4 Z',
  D: 'M12 1.8 C13.4 6.2 16.2 10 19.4 12 C16.2 14 13.4 17.8 12 22.2 C10.6 17.8 7.8 14 4.6 12 C7.8 10 10.6 6.2 12 1.8 Z',
}

const CLUB_STEM =
  'M10.6 11 C11.4 15.2 10.8 19.2 8.4 21.9 L15.6 21.9 C13.2 19.2 12.6 15.2 13.4 11 Z'

export const RED_SUITS: ReadonlySet<Suit> = new Set<Suit>(['H', 'D'])

export function isRedSuit(suit: Suit): boolean {
  return RED_SUITS.has(suit)
}

/**
 * Suit artwork as bare SVG geometry, for embedding inside an existing `<svg>`.
 * Fills with `currentColor` unless the caller overrides `fill`.
 */
export function SuitShape({ suit }: { suit: Suit }) {
  if (suit === 'C') {
    return (
      <>
        <circle cx="12" cy="7.4" r="4.4" />
        <circle cx="7.4" cy="13.6" r="4.4" />
        <circle cx="16.6" cy="13.6" r="4.4" />
        <path d={CLUB_STEM} />
      </>
    )
  }
  return <path d={SUIT_PATH[suit]} />
}

/** Standalone suit symbol sized by its CSS box. */
export function SuitGlyph({ suit, className }: { suit: Suit; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <SuitShape suit={suit} />
    </svg>
  )
}
