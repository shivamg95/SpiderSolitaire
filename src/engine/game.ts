import { deal } from './deal'
import { applyMove } from './moves'
import { canDealStock, isWon, legalMoves, movableRunLength } from './rules'
import type {
  CardId,
  Difficulty,
  GameHandle,
  GameSettings,
  GameState,
  Move,
} from './types'
import { DEFAULT_GAME_SETTINGS, SNAPSHOT_EVERY } from './types'

interface Snapshot {
  readonly index: number
  readonly state: GameState
}

const snapshotCache = new WeakMap<object, Snapshot[]>()

export function createGame(
  seed: number,
  difficulty: Difficulty,
  settings: GameSettings = DEFAULT_GAME_SETTINGS,
): GameHandle {
  return {
    seed,
    difficulty,
    moveLog: [],
    redoLog: [],
    state: deal(seed, difficulty),
    settings,
  }
}

export function fold(
  seed: number,
  difficulty: Difficulty,
  moveLog: readonly Move[],
  settings: GameSettings = DEFAULT_GAME_SETTINGS,
  cacheOwner?: object,
): GameState {
  const owner = cacheOwner ?? { seed, difficulty }
  let snapshots = snapshotCache.get(owner)
  if (!snapshots) {
    snapshots = [{ index: 0, state: deal(seed, difficulty) }]
    snapshotCache.set(owner, snapshots)
  }

  let startIndex = 0
  let state = snapshots[0]?.state ?? deal(seed, difficulty)
  for (let i = snapshots.length - 1; i >= 0; i--) {
    const snap = snapshots[i]
    if (snap && snap.index <= moveLog.length) {
      startIndex = snap.index
      state = snap.state
      break
    }
  }

  // If cache has snapshots beyond the requested log length, ignore them.
  for (let i = startIndex; i < moveLog.length; i++) {
    const move = moveLog[i]
    if (!move) throw new Error(`missing move at ${i}`)
    const result = applyMove(state, move, settings)
    if (!result.ok) {
      throw new Error(`illegal move at ${i}: ${result.reason}`)
    }
    state = result.state
    if ((i + 1) % SNAPSHOT_EVERY === 0) {
      if (!snapshots.some((s) => s.index === i + 1)) {
        snapshots.push({ index: i + 1, state })
      }
    }
  }
  return state
}

export function attemptMove(handle: GameHandle, move: Move): GameHandle {
  const result = applyMove(handle.state, move, handle.settings)
  if (!result.ok) return handle
  return {
    ...handle,
    moveLog: [...handle.moveLog, move],
    redoLog: [],
    state: result.state,
  }
}

/**
 * The board halfway through a move that completes a set: the run has landed on
 * its column but the K→A sweep to the foundation has not happened yet. Null when
 * the move collects nothing, since then there is nothing to stage.
 *
 * The move log is unaffected — this is a view of one legal move mid-flight, not
 * a move of its own — so undo and replay still see a single entry.
 */
export function stagedState(handle: GameHandle, move: Move): GameState | null {
  if (!collectsSet(handle.state, move, handle.settings)) return null
  const staged = applyMove(handle.state, move, handle.settings, {
    deferFoundations: true,
  })
  return staged.ok ? staged.state : null
}

export function undo(handle: GameHandle): GameHandle {
  if (handle.moveLog.length === 0) return handle
  const last = handle.moveLog[handle.moveLog.length - 1]
  if (!last) return handle
  const moveLog = handle.moveLog.slice(0, -1)
  const state = fold(handle.seed, handle.difficulty, moveLog, handle.settings, handle)
  return {
    ...handle,
    moveLog,
    redoLog: [last, ...handle.redoLog],
    state,
  }
}

export function redo(handle: GameHandle): GameHandle {
  const next = handle.redoLog[0]
  if (!next) return handle
  const result = applyMove(handle.state, next, handle.settings)
  if (!result.ok) return handle
  return {
    ...handle,
    moveLog: [...handle.moveLog, next],
    redoLog: handle.redoLog.slice(1),
    state: result.state,
  }
}

export function restartDeal(handle: GameHandle): GameHandle {
  return createGame(handle.seed, handle.difficulty, handle.settings)
}

export function remainingDeals(state: GameState): number {
  return state.stock.length
}

function positionKeys(state: GameState): Map<CardId, string> {
  const keys = new Map<CardId, string>()
  state.columns.forEach((col, c) => {
    col.forEach((card, i) => keys.set(card.id, `c${c}:${i}`))
  })
  // Dealing shifts the remaining piles down one slot; keying the stock as a
  // single region keeps that re-index from looking like 50 cards taking flight.
  state.stock.forEach((batch) => {
    batch.forEach((card) => keys.set(card.id, 'stock'))
  })
  state.foundations.forEach((run, f) => {
    run.forEach((card, i) => keys.set(card.id, `f${f}:${i}`))
  })
  return keys
}

/**
 * Cards whose board position changed between two states, in destination order.
 * Used by the view to keep travelling cards above settled ones; works for every
 * transition (move, deal, undo, redo, foundation) without threading effects.
 */
export function movedCardIds(prev: GameState, next: GameState): CardId[] {
  const before = positionKeys(prev)
  const moved: CardId[] = []
  for (const [id, key] of positionKeys(next)) {
    if (before.get(id) !== key) moved.push(id)
  }
  return moved
}

/**
 * Priority ladder for hints. Lower index = stronger. In 1-suit, uncover ranks
 * above suitMerge; in 2/4-suit consolidation outranks blind digging.
 */
export type HintTier =
  | 'completeSet'
  | 'emptyColumn'
  | 'suitMerge'
  | 'uncover'
  | 'suitPlacement'
  | 'crossSuitUnload'
  | 'spendEmpty'
  | 'deal'
  | 'breakBuild'
  | 'shuffle'

const MULTI_SUIT_TIER_ORDER: readonly HintTier[] = [
  'completeSet',
  'emptyColumn',
  'suitMerge',
  'uncover',
  'suitPlacement',
  'crossSuitUnload',
  'spendEmpty',
  'deal',
  'breakBuild',
  'shuffle',
]

const ONE_SUIT_TIER_ORDER: readonly HintTier[] = [
  'completeSet',
  'emptyColumn',
  'uncover',
  'suitMerge',
  'suitPlacement',
  'crossSuitUnload',
  'spendEmpty',
  'deal',
  'breakBuild',
  'shuffle',
]

/** Numeric rank for a tier (0 = best). Used as a lookahead tiebreaker. */
export function hintTierRank(tier: HintTier, difficulty: Difficulty): number {
  const order = difficulty === 1 ? ONE_SUIT_TIER_ORDER : MULTI_SUIT_TIER_ORDER
  const idx = order.indexOf(tier)
  return idx < 0 ? order.length : idx
}

/**
 * True when the run being moved is already correctly placed — its head sits on
 * a face-up, same-suit card one rank higher, so lifting it dismantles a build.
 */
export function breaksExistingBuild(state: GameState, move: Move): boolean {
  if (move.kind !== 'moveRun') return false
  const column = state.columns[move.from]
  if (!column) return false
  const anchor = column[column.length - move.count - 1]
  const head = column[column.length - move.count]
  if (!head || !anchor?.faceUp) return false
  return anchor.suit === head.suit && anchor.rank === head.rank + 1
}

/** True when a move lands the thirteenth card of a set and clears it away. */
export function collectsSet(
  state: GameState,
  move: Move,
  settings: GameSettings = DEFAULT_GAME_SETTINGS,
): boolean {
  const result = applyMove(state, move, settings)
  return result.ok && result.effects.some((e) => e.kind === 'foundation')
}

/**
 * Classify a legal move into the hint priority ladder.
 *
 * Spend-empty is only admitted for a King, the full movable run, or a move that
 * flips a face-down; dumping a partial loose card into a free column is a shuffle.
 */
export function classifyMove(
  state: GameState,
  move: Move,
  settings: GameSettings = DEFAULT_GAME_SETTINGS,
): HintTier {
  if (move.kind === 'dealStock') return 'deal'

  const source = state.columns[move.from]
  const dest = state.columns[move.to]
  if (!source || !dest) return 'shuffle'

  if (collectsSet(state, move, settings)) return 'completeSet'

  const emptiesSource = source.length === move.count
  const intoEmpty = dest.length === 0
  const flips = exposesFaceDown(state, move)
  const head = source[source.length - move.count]
  const maxRun = movableRunLength(source)

  if (breaksExistingBuild(state, move)) return 'breakBuild'

  // Relocating a whole column into an empty one trades one gap for another.
  if (emptiesSource && intoEmpty) return 'shuffle'

  if (emptiesSource) return 'emptyColumn'

  if (intoEmpty) {
    const isKing = head?.rank === 13
    const isFullRun = move.count === maxRun
    if (isKing || isFullRun || flips) return 'spendEmpty'
    return 'shuffle'
  }

  if (flips) return 'uncover'

  const top = dest[dest.length - 1]
  if (head && top?.suit === head.suit) {
    // Any same-suit landing joins builds; a lone dest card still counts.
    return movableRunLength(dest) >= 1 ? 'suitMerge' : 'suitPlacement'
  }

  if (head && top) return 'crossSuitUnload'

  return 'shuffle'
}

/** True when a move achieves something structural rather than shuffling cards. */
export function isProductiveMove(state: GameState, move: Move): boolean {
  const tier = classifyMove(state, move)
  return tier !== 'shuffle' && tier !== 'breakBuild'
}

/**
 * Damage score for a cross-suit unload (lower is better). Prefers covering a
 * loose card over a build head, and a shallow column over a deep one.
 */
export function crossSuitUnloadDamage(state: GameState, move: Move): number {
  if (move.kind !== 'moveRun') return Number.POSITIVE_INFINITY
  const dest = state.columns[move.to] ?? []
  if (dest.length === 0) return Number.POSITIVE_INFINITY
  return movableRunLength(dest) * 10 + dest.length
}

/**
 * Moves worth offering as hints, pruned by the priority ladder.
 * Shuffles are always dropped. Build-breaks are kept only when nothing else
 * survives, so legitimate set-completing splits remain available as a fallback.
 */
export function hintableMoves(
  state: GameState,
  settings: GameSettings = DEFAULT_GAME_SETTINGS,
): Move[] {
  const all = legalMoves(state, settings)
  const classified = all.map((move) => ({
    move,
    tier: classifyMove(state, move, settings),
  }))

  // Prefer non-shuffles; only fall back to raw legal moves when every option is
  // a no-op so the hint button still has something to show.
  const withoutShuffle = classified.filter((c) => c.tier !== 'shuffle')
  const pool = withoutShuffle.length > 0 ? withoutShuffle : classified

  const withoutBreak = pool.filter((c) => c.tier !== 'breakBuild')
  const admitted = withoutBreak.length > 0 ? withoutBreak : pool

  // Prefer less-damaging cross-suit unloads when sorting candidates for search.
  return admitted
    .map((c) => ({
      ...c,
      damage: c.tier === 'crossSuitUnload' ? crossSuitUnloadDamage(state, c.move) : 0,
      rank: hintTierRank(c.tier, state.difficulty),
    }))
    .sort((a, b) => a.rank - b.rank || a.damage - b.damage)
    .map((c) => c.move)
}

export function autoCompletableRuns(state: GameState): Move[] {
  return legalMoves(state).filter((m) => m.kind === 'moveRun' && collectsSet(state, m))
}

export function exposesFaceDown(state: GameState, move: Move): boolean {
  if (move.kind !== 'moveRun') return false
  const column = state.columns[move.from]
  if (!column) return false
  const remaining = column.length - move.count
  if (remaining <= 0) return false
  const next = column[remaining - 1]
  return Boolean(next && !next.faceUp)
}

/**
 * Where a tapped run should go, best first.
 *
 * Every candidate lifts the same run, so what separates them is purely the
 * landing spot: completing a set beats everything, then a same-suit card that
 * merges two builds, then covering some other card, and finally spending an
 * empty column. Swapping one empty column for another gains nothing at all, so
 * it sorts last and is only ever chosen when it is the single legal option.
 */
export function rankTapDestinations(
  state: GameState,
  from: number,
  count: number,
): Move[] {
  const candidates = legalMoves(state).filter(
    (m): m is Extract<Move, { kind: 'moveRun' }> =>
      m.kind === 'moveRun' && m.from === from && m.count === count,
  )

  const scoreMove = (m: Extract<Move, { kind: 'moveRun' }>): number => {
    const source = state.columns[m.from] ?? []
    const dest = state.columns[m.to] ?? []
    const head = source[source.length - count]
    if (!head) return -Infinity
    if (collectsSet(state, m)) return 10_000

    if (dest.length === 0) {
      return source.length === count ? -10_000 : 100
    }

    const top = dest[dest.length - 1]!
    // Merging onto the longer build keeps the most cards moving as one run.
    if (top.suit === head.suit) return 1_000 + movableRunLength(dest)
    // A cross-suit landing buries the card it covers, so prefer burying a loose
    // card over the head of a build, and a shallow column over a deep one.
    return 500 - movableRunLength(dest) * 10 - dest.length
  }

  return candidates
    .map((move) => ({ move, score: scoreMove(move) }))
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.move)
}

export function gameWon(handle: GameHandle): boolean {
  return isWon(handle.state)
}

export function canDeal(handle: GameHandle): boolean {
  return canDealStock(handle.state, handle.settings)
}

export function columnMovableLength(state: GameState, column: number): number {
  const col = state.columns[column]
  if (!col) return 0
  return movableRunLength(col)
}
