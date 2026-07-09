export const MIN_CARD_WIDTH = 55
export const MAX_CARD_WIDTH = 160
export const CARD_ASPECT_RATIO = 5 / 7
export const CONTAINER_PADDING_X = 24
export const TABLEAU_COLUMNS = 10

export function computeColumnGap(viewportW: number): number {
  if (viewportW < 640) return 4
  if (viewportW < 1024) return 8
  return 14
}

export function computeCardWidth(viewportW: number): number {
  const gap = computeColumnGap(viewportW)
  const totalGaps = (TABLEAU_COLUMNS - 1) * gap
  const raw = (viewportW - CONTAINER_PADDING_X - totalGaps) / TABLEAU_COLUMNS
  return Math.max(MIN_CARD_WIDTH, Math.min(MAX_CARD_WIDTH, Math.round(raw)))
}
