import { FOUNDATION_SLOTS } from '@/layout/constants'

export interface FoundationsProps {
  readonly filled: number
  readonly xs: readonly number[]
  readonly y: number
  readonly width: number
  readonly height: number
}

export function Foundations({ filled, xs, y, width, height }: FoundationsProps) {
  return (
    <div
      className="foundations"
      aria-label={`Foundations ${filled} of ${FOUNDATION_SLOTS}`}
    >
      {Array.from({ length: FOUNDATION_SLOTS }, (_, i) => (
        <div
          key={i}
          className={i < filled ? 'foundation foundation--filled' : 'foundation'}
          style={{ left: xs[i] ?? 0, top: y, width, height }}
          data-foundation={i}
        />
      ))}
    </div>
  )
}
