import { deal } from './deal'
import { applyMove } from './moves'
import { canDealStock, isWon, legalMoves, movableRunLength } from './rules'
import type { Difficulty, GameHandle, GameSettings, GameState, Move } from './types'
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

export function hintableMoves(
  state: GameState,
  settings: GameSettings = DEFAULT_GAME_SETTINGS,
): Move[] {
  return legalMoves(state, settings)
}

export function autoCompletableRuns(state: GameState): Move[] {
  return legalMoves(state).filter((m) => {
    if (m.kind !== 'moveRun') return false
    const result = applyMove(state, m)
    if (!result.ok) return false
    return result.effects.some((e) => e.kind === 'foundation')
  })
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
    const dest = state.columns[m.to] ?? []
    const run = state.columns[m.from]?.slice(-m.count) ?? []
    let score = 0
    if (dest.length === 0) score += 1
    else {
      const top = dest[dest.length - 1]!
      const head = run[0]!
      if (top.suit === head.suit) score += 3
      else score += 2
    }
    if (exposesFaceDown(state, m)) score += 4
    return score
  }

  return candidates.slice().sort((a, b) => scoreMove(b) - scoreMove(a))
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
