export interface ColumnRect {
  readonly column: number
  readonly left: number
  readonly right: number
  readonly top: number
  readonly bottom: number
}

export interface HitPoint {
  readonly x: number
  readonly y: number
}

/** Nearest column by horizontal distance to rect center (tolerant; not elementFromPoint). */
export function nearestColumn(
  point: HitPoint,
  rects: readonly ColumnRect[],
  maxDistance = Infinity,
): number | null {
  if (rects.length === 0) return null
  let best: number | null = null
  let bestDist = maxDistance
  for (const rect of rects) {
    const cx = (rect.left + rect.right) / 2
    const d = Math.abs(point.x - cx)
    if (d < bestDist) {
      bestDist = d
      best = rect.column
    }
  }
  return best
}

export function columnRectsFromElements(
  elements: readonly { column: number; getBoundingClientRect: () => DOMRect }[],
): ColumnRect[] {
  return elements.map((el) => {
    const r = el.getBoundingClientRect()
    return {
      column: el.column,
      left: r.left,
      right: r.right,
      top: r.top,
      bottom: r.bottom,
    }
  })
}
