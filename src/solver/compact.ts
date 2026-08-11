import type { Card, ColumnIndex, Difficulty, GameState, Move, Suit } from '@/engine/types'
import { COLUMN_COUNT, FOUNDATION_TARGET } from '@/engine/types'
import { SEARCH_WEIGHTS_BY_DIFFICULTY, type SearchWeights } from './heuristics'

/**
 * Byte-level board encoding for the full-game solver.
 *
 * The search holds hundreds of thousands of positions at once, so a position
 * has to be small and cheap to copy. One position is a fixed 116-byte buffer:
 *
 *   [0..103]   card bytes, packed column after column with no gaps
 *   [104..113] length of each of the ten columns
 *   [114]      how many stock batches have been dealt so far
 *   [115]      how many foundations are complete
 *
 * A card byte is `suit * 13 + (rank - 1)`, plus 64 when the card is face up.
 * Foundation contents and card identities are not stored: the solver only ever
 * hands back a move list, which the caller replays through the real engine.
 */

export const COMPACT_SIZE = 116
export const CARDS_OFF = 0
export const COLLEN_OFF = 104
export const STOCK_DEALT_OFF = 114
export const FOUND_OFF = 115

export const FACE_UP = 64
export const CODE_MASK = 63
const CARDS_CAPACITY = 104
const BATCH_SIZE = 10
const SET_LENGTH = 13

const SUIT_ORDER: readonly Suit[] = ['S', 'H', 'D', 'C']

export interface CompactDeal {
  readonly difficulty: Difficulty
  /** Remaining stock, flattened, ten cards per batch. */
  readonly stock: Uint8Array
  /** Number of batches still in `stock`. */
  readonly batches: number
}

export function cardByte(suit: Suit, rank: number, faceUp: boolean): number {
  const suitIndex = SUIT_ORDER.indexOf(suit)
  return suitIndex * 13 + (rank - 1) + (faceUp ? FACE_UP : 0)
}

export function codeOf(byte: number): number {
  return byte & CODE_MASK
}

export function isFaceUp(byte: number): boolean {
  return (byte & FACE_UP) !== 0
}

export function suitIndexOf(byte: number): number {
  return ((byte & CODE_MASK) / 13) | 0
}

export function rankOf(byte: number): number {
  return ((byte & CODE_MASK) % 13) + 1
}

export function columnLength(buf: Uint8Array, col: number): number {
  return buf[COLLEN_OFF + col]!
}

export function foundationCount(buf: Uint8Array): number {
  return buf[FOUND_OFF]!
}

export function stockDealt(buf: Uint8Array): number {
  return buf[STOCK_DEALT_OFF]!
}

/** Index into the packed card area where `col` begins. */
export function columnStart(buf: Uint8Array, col: number): number {
  let start = 0
  for (let i = 0; i < col; i++) start += buf[COLLEN_OFF + i]!
  return start
}

export function isCompactWon(buf: Uint8Array): boolean {
  return buf[FOUND_OFF] === FOUNDATION_TARGET
}

export function toCompact(state: GameState): { buf: Uint8Array; deal: CompactDeal } {
  const buf = new Uint8Array(COMPACT_SIZE)
  let cursor = 0
  for (let col = 0; col < COLUMN_COUNT; col++) {
    const column: readonly Card[] = state.columns[col] ?? []
    for (const card of column) {
      buf[cursor++] = cardByte(card.suit, card.rank, card.faceUp)
    }
    buf[COLLEN_OFF + col] = column.length
  }
  buf[STOCK_DEALT_OFF] = 0
  buf[FOUND_OFF] = state.foundations.length

  const batches = state.stock.length
  const stock = new Uint8Array(batches * BATCH_SIZE)
  let s = 0
  for (const batch of state.stock) {
    for (const card of batch) {
      stock[s++] = cardByte(card.suit, card.rank, false)
    }
  }

  return { buf, deal: { difficulty: state.difficulty, stock, batches } }
}

/* -------------------------------------------------------------------------- */
/* Move codes                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * A move packed into a Uint16 so the search can keep one per arena node.
 * 0 is `dealStock`; everything else is `1 + from*140 + to*14 + count`.
 */
export const DEAL_STOCK_CODE = 0

export function encodeMoveCode(from: number, to: number, count: number): number {
  return 1 + from * 140 + to * 14 + count
}

export function decodeMoveCode(code: number): Move {
  if (code === DEAL_STOCK_CODE) return { kind: 'dealStock' }
  const rest = code - 1
  const from = (rest / 140) | 0
  const to = ((rest % 140) / 14) | 0
  const count = rest % 14
  return {
    kind: 'moveRun',
    from: from as ColumnIndex,
    to: to as ColumnIndex,
    count,
  }
}

/* -------------------------------------------------------------------------- */
/* Board queries                                                               */
/* -------------------------------------------------------------------------- */

/** Length of the same-suit descending face-up run at the tail of `col`. */
export function compactMovableRun(buf: Uint8Array, col: number): number {
  const len = buf[COLLEN_OFF + col]!
  if (len === 0) return 0
  const start = columnStart(buf, col)
  const end = start + len
  let run = 1
  for (let i = end - 1; i > start; i--) {
    const lower = buf[i]!
    const upper = buf[i - 1]!
    if (!isFaceUp(upper) || !isFaceUp(lower)) break
    if (suitIndexOf(upper) !== suitIndexOf(lower)) break
    if (rankOf(upper) !== rankOf(lower) + 1) break
    run += 1
  }
  return run
}

const startScratch = new Int32Array(COLUMN_COUNT)

export function canDealCompact(
  buf: Uint8Array,
  deal: CompactDeal,
  allowDealWithEmptyColumn: boolean,
): boolean {
  if (buf[STOCK_DEALT_OFF]! >= deal.batches) return false
  if (allowDealWithEmptyColumn) return true
  for (let col = 0; col < COLUMN_COUNT; col++) {
    if (buf[COLLEN_OFF + col] === 0) return false
  }
  return true
}

/**
 * Legal moves written into `out` as move codes; returns how many were written.
 *
 * Empty columns are interchangeable, so only the first one is offered as a
 * destination. That is safe rather than merely convenient: the transposition
 * key ignores column order, so the collapsed alternatives would be discarded as
 * duplicates the moment they were generated.
 */
export function compactLegalMoves(
  buf: Uint8Array,
  deal: CompactDeal,
  allowDealWithEmptyColumn: boolean,
  out: Uint16Array,
): number {
  let n = 0

  let firstEmpty = -1
  for (let col = 0; col < COLUMN_COUNT; col++) {
    if (buf[COLLEN_OFF + col] === 0) {
      firstEmpty = col
      break
    }
  }

  let acc = 0
  for (let col = 0; col < COLUMN_COUNT; col++) {
    startScratch[col] = acc
    acc += buf[COLLEN_OFF + col]!
  }
  const starts = startScratch

  for (let from = 0; from < COLUMN_COUNT; from++) {
    const len = buf[COLLEN_OFF + from]!
    if (len === 0) continue
    const max = compactMovableRun(buf, from)
    const end = starts[from]! + len
    for (let count = 1; count <= max; count++) {
      const headRank = rankOf(buf[end - count]!)
      for (let to = 0; to < COLUMN_COUNT; to++) {
        if (to === from) continue
        const destLen = buf[COLLEN_OFF + to]!
        if (destLen === 0) {
          if (to !== firstEmpty) continue
          out[n++] = encodeMoveCode(from, to, count)
          continue
        }
        const destTop = buf[starts[to]! + destLen - 1]!
        if (!isFaceUp(destTop)) continue
        if (rankOf(destTop) !== headRank + 1) continue
        out[n++] = encodeMoveCode(from, to, count)
      }
    }
  }

  if (canDealCompact(buf, deal, allowDealWithEmptyColumn)) {
    out[n++] = DEAL_STOCK_CODE
  }

  return n
}

/** Upper bound on moves from any position, used to size generation buffers. */
export const MAX_LEGAL_MOVES = COLUMN_COUNT * SET_LENGTH * COLUMN_COUNT + 1

/* -------------------------------------------------------------------------- */
/* Move application                                                            */
/* -------------------------------------------------------------------------- */

const runScratch = new Uint8Array(SET_LENGTH)
const dealScratch = new Uint8Array(CARDS_CAPACITY)

/** Turn the tail card of `col` face up, mirroring the engine's auto-flip. */
function flipTail(buf: Uint8Array, col: number): void {
  const len = buf[COLLEN_OFF + col]!
  if (len === 0) return
  const index = columnStart(buf, col) + len - 1
  buf[index] = buf[index]! | FACE_UP
}

/** Remove completed K→A sets from `col`, repeating for stacked sets. */
function collectSets(buf: Uint8Array, col: number): void {
  for (;;) {
    const len = buf[COLLEN_OFF + col]!
    if (len < SET_LENGTH) return
    const start = columnStart(buf, col)
    const runStart = start + len - SET_LENGTH
    const head = buf[runStart]!
    if (!isFaceUp(head) || rankOf(head) !== 13) return

    const suit = suitIndexOf(head)
    let complete = true
    for (let i = 1; i < SET_LENGTH; i++) {
      const card = buf[runStart + i]!
      if (!isFaceUp(card) || suitIndexOf(card) !== suit || rankOf(card) !== 13 - i) {
        complete = false
        break
      }
    }
    if (!complete) return

    let total = 0
    for (let i = 0; i < COLUMN_COUNT; i++) total += buf[COLLEN_OFF + i]!
    buf.copyWithin(runStart, runStart + SET_LENGTH, total)
    buf[COLLEN_OFF + col] = len - SET_LENGTH
    buf[FOUND_OFF] = buf[FOUND_OFF]! + 1
    flipTail(buf, col)
  }
}

/**
 * Apply `code` to `src`, writing the result into `dst`. Assumes the move came
 * from `compactLegalMoves` on `src`, so legality is not re-checked.
 */
export function applyCompactMove(
  src: Uint8Array,
  dst: Uint8Array,
  code: number,
  deal: CompactDeal,
): void {
  dst.set(src)

  if (code === DEAL_STOCK_CODE) {
    const batch = dst[STOCK_DEALT_OFF]!
    const base = batch * BATCH_SIZE
    let write = 0
    let read = 0
    for (let col = 0; col < COLUMN_COUNT; col++) {
      const len = dst[COLLEN_OFF + col]!
      for (let i = 0; i < len; i++) dealScratch[write++] = dst[read++]!
      dealScratch[write++] = deal.stock[base + col]! | FACE_UP
      dst[COLLEN_OFF + col] = len + 1
    }
    for (let i = 0; i < write; i++) dst[i] = dealScratch[i]!
    dst[STOCK_DEALT_OFF] = batch + 1
    for (let col = 0; col < COLUMN_COUNT; col++) collectSets(dst, col)
    return
  }

  const rest = code - 1
  const from = (rest / 140) | 0
  const to = ((rest % 140) / 14) | 0
  const count = rest % 14

  const fromStart = columnStart(dst, from)
  const fromLen = dst[COLLEN_OFF + from]!
  const runStart = fromStart + fromLen - count
  const runEnd = fromStart + fromLen
  const toStart = columnStart(dst, to)
  const insertAt = toStart + dst[COLLEN_OFF + to]!

  for (let i = 0; i < count; i++) runScratch[i] = dst[runStart + i]!

  if (from < to) {
    // The run sits before the insertion point, so the block between them slides left.
    dst.copyWithin(runStart, runEnd, insertAt)
    for (let i = 0; i < count; i++) dst[insertAt - count + i] = runScratch[i]!
  } else {
    // The run sits after the insertion point, so the block between them slides right.
    dst.copyWithin(insertAt + count, insertAt, runStart)
    for (let i = 0; i < count; i++) dst[insertAt + i] = runScratch[i]!
  }

  dst[COLLEN_OFF + from] = fromLen - count
  dst[COLLEN_OFF + to] = dst[COLLEN_OFF + to]! + count

  flipTail(dst, from)
  collectSets(dst, to)
}

/* -------------------------------------------------------------------------- */
/* Move classification (pruning ladder)                                        */
/* -------------------------------------------------------------------------- */

export const TIER_COMPLETE_SET = 0
export const TIER_DEAL = 1
export const TIER_EMPTY_COLUMN = 2
export const TIER_UNCOVER = 3
export const TIER_SUIT_MERGE = 4
export const TIER_CROSS_SUIT = 5
export const TIER_SPEND_EMPTY = 6
export const TIER_BREAK_BUILD = 7
export const TIER_SHUFFLE = 8

/**
 * Classify a legal move the same way the engine's hint ladder does, but on
 * bytes. `TIER_SHUFFLE` and `TIER_BREAK_BUILD` are the two tiers the aggressive
 * pruning mode discards.
 */
export function compactMoveTier(buf: Uint8Array, code: number): number {
  if (code === DEAL_STOCK_CODE) return TIER_DEAL

  const rest = code - 1
  const from = (rest / 140) | 0
  const to = ((rest % 140) / 14) | 0
  const count = rest % 14

  const fromStart = columnStart(buf, from)
  const fromLen = buf[COLLEN_OFF + from]!
  const toStart = columnStart(buf, to)
  const destLen = buf[COLLEN_OFF + to]!

  const headIndex = fromStart + fromLen - count
  const head = buf[headIndex]!
  const headSuit = suitIndexOf(head)
  const headRank = rankOf(head)
  const lowestRank = headRank - count + 1

  // Completing a set needs the run to bottom out at an Ace and the destination
  // to already carry the rest of a same-suit K→A stack.
  if (lowestRank === 1 && destLen + count >= SET_LENGTH) {
    const needed = SET_LENGTH - count
    let complete = true
    for (let i = 0; i < needed; i++) {
      const card = buf[toStart + destLen - needed + i]!
      if (!isFaceUp(card) || suitIndexOf(card) !== headSuit) {
        complete = false
        break
      }
      if (rankOf(card) !== 13 - i) {
        complete = false
        break
      }
    }
    if (complete) return TIER_COMPLETE_SET
  }

  const emptiesSource = fromLen === count
  const intoEmpty = destLen === 0
  const flips = !emptiesSource && !isFaceUp(buf[headIndex - 1]!)

  if (!emptiesSource) {
    const anchor = buf[headIndex - 1]!
    if (
      isFaceUp(anchor) &&
      suitIndexOf(anchor) === headSuit &&
      rankOf(anchor) === headRank + 1
    ) {
      return TIER_BREAK_BUILD
    }
  }

  if (emptiesSource && intoEmpty) return TIER_SHUFFLE
  if (emptiesSource) return TIER_EMPTY_COLUMN

  if (intoEmpty) {
    if (headRank === 13 || count === compactMovableRun(buf, from) || flips) {
      return TIER_SPEND_EMPTY
    }
    return TIER_SHUFFLE
  }

  if (flips) return TIER_UNCOVER

  const destTop = buf[toStart + destLen - 1]!
  if (suitIndexOf(destTop) === headSuit) return TIER_SUIT_MERGE

  return TIER_CROSS_SUIT
}

/** Readable board dump: one `S13+` style token per card. For tests only. */
export function compactColumns(buf: Uint8Array): string[][] {
  const columns: string[][] = []
  let start = 0
  for (let col = 0; col < COLUMN_COUNT; col++) {
    const len = buf[COLLEN_OFF + col]!
    const cards: string[] = []
    for (let i = 0; i < len; i++) {
      const byte = buf[start + i]!
      cards.push(
        `${SUIT_ORDER[suitIndexOf(byte)]!}${rankOf(byte)}${isFaceUp(byte) ? '+' : '-'}`,
      )
    }
    columns.push(cards)
    start += len
  }
  return columns
}

/* -------------------------------------------------------------------------- */
/* Heuristic                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Board evaluation for the full-game search, on bytes. Higher is better.
 * Uses SEARCH_WEIGHTS_BY_DIFFICULTY, not the hint weights — see the comment
 * there for why the two must not be shared.
 */
export function compactHeuristic(
  buf: Uint8Array,
  difficulty: Difficulty,
  weights?: SearchWeights,
): number {
  const w = weights ?? SEARCH_WEIGHTS_BY_DIFFICULTY[difficulty]
  let faceDown = 0
  let buried = 0
  let suitPairs = 0
  let suitGroups = 0
  let junctions = 0
  let hardBreaks = 0
  let empty = 0
  let tailRun = 0

  let start = 0
  for (let col = 0; col < COLUMN_COUNT; col++) {
    const len = buf[COLLEN_OFF + col]!
    if (len === 0) {
      empty += 1
      continue
    }
    const end = start + len

    let seenUp = false
    let firstUp = end
    for (let i = start; i < end; i++) {
      if (isFaceUp(buf[i]!)) {
        if (!seenUp) firstUp = i
        seenUp = true
      } else {
        faceDown += 1
        if (seenUp) buried += 1
      }
    }

    let groupLen = 1
    for (let i = firstUp + 1; i < end; i++) {
      const upper = buf[i - 1]!
      const lower = buf[i]!
      const descends = rankOf(upper) === rankOf(lower) + 1
      if (!descends) {
        suitGroups += (groupLen * (groupLen - 1)) / 2
        groupLen = 1
        hardBreaks += 1
        continue
      }
      if (suitIndexOf(upper) !== suitIndexOf(lower)) {
        suitGroups += (groupLen * (groupLen - 1)) / 2
        groupLen = 1
        junctions += 1
        continue
      }
      groupLen += 1
      suitPairs += 1
    }
    if (firstUp < end) suitGroups += (groupLen * (groupLen - 1)) / 2

    tailRun += compactMovableRun(buf, col)
    start = end
  }

  return (
    w.foundations * buf[FOUND_OFF]! -
    w.faceDown * faceDown -
    w.buried * buried +
    w.suitPairs * suitPairs +
    w.suitGroupsQuad * suitGroups -
    w.junctions * junctions -
    w.hardBreaks * hardBreaks +
    w.emptyColumns * empty +
    w.tailRun * tailRun
  )
}
