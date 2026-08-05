/** Card width / height aspect ratio (classic poker size). */
export const CARD_ASPECT = 2.5 / 3.5

/** Vertical overlap as a fraction of card height. */
export const FACE_DOWN_OVERLAP = 0.1
export const FACE_UP_OVERLAP = 0.28

/** Minimum overlap fractions when compressing tall stacks. */
export const FACE_DOWN_FLOOR = 0.055
export const FACE_UP_FLOOR = 0.13

export const COLUMN_COUNT = 10
export const FOUNDATION_SLOTS = 8

export const MAX_CARD_WIDTH = 96
export const MIN_CARD_WIDTH = 42
export const COLUMN_GAP_RATIO = 0.08
export const MIN_COLUMN_GAP = 4

export const BOARD_PAD_X = 12
export const BOARD_PAD_Y = 8

/** Gap between the tableau and the right (or bottom) rail. */
export const RAIL_GAP = 12
export const MIN_RAIL_WIDTH = 56
export const MAX_RAIL_WIDTH = 104

/** Foundation/stock cards are indicators — slightly smaller than play cards. */
export const RAIL_CARD_SCALE = 0.82

/** Downward offset per completed foundation set (fraction of card height). */
export const FOUNDATION_STEP_RATIO = 0.15
export const MIN_FOUNDATION_STEP = 10

/** Cap card height so a short fan always fits on small viewports. */
export const MAX_CARD_HEIGHT_RATIO = 0.32

/** Switch to a bottom-bar rail below this viewport width. */
export const NARROW_LAYOUT_BREAKPOINT = 560
