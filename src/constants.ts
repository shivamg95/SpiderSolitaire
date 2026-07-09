export const MIN_CARD_WIDTH = 55
export const MAX_CARD_WIDTH = 160
export const CARD_ASPECT_RATIO = 5 / 7
export const COLUMN_GAP = 6
export const CONTAINER_PADDING_X = 24
export const TABLEAU_COLUMNS = 10

export function computeCardWidth(viewportW: number): number {
  const totalGaps = (TABLEAU_COLUMNS - 1) * COLUMN_GAP
  const raw = (viewportW - CONTAINER_PADDING_X - totalGaps) / TABLEAU_COLUMNS
  return Math.max(MIN_CARD_WIDTH, Math.min(MAX_CARD_WIDTH, Math.round(raw)))
}
