import { withFace } from './cards'
import { canDealStock, canPlace, completedRunAtTail, movableRunLength } from './rules'
import type {
  Card,
  CardId,
  ColumnIndex,
  Effect,
  GameSettings,
  GameState,
  Move,
  MoveResult,
} from './types'
import { DEFAULT_GAME_SETTINGS, FOUNDATION_BONUS, FOUNDATION_TARGET } from './types'

function cloneColumns(columns: GameState['columns']): Card[][] {
  return columns.map((col) => col.slice())
}

function maybeFlip(column: Card[], columnIndex: ColumnIndex, effects: Effect[]): void {
  if (column.length === 0) return
  const top = column[column.length - 1]!
  if (top.faceUp) return
  column[column.length - 1] = withFace(top, true)
  effects.push({ kind: 'flip', column: columnIndex, cardId: top.id })
}

function maybeFoundation(
  columns: Card[][],
  foundations: Card[][],
  columnIndex: ColumnIndex,
  effects: Effect[],
  score: { value: number },
): void {
  const column = columns[columnIndex]!
  const run = completedRunAtTail(column)
  if (!run) return
  column.splice(column.length - 13, 13)
  foundations.push(run.slice())
  score.value += FOUNDATION_BONUS
  effects.push({
    kind: 'foundation',
    column: columnIndex,
    cardIds: run.map((c) => c.id),
    foundationIndex: foundations.length - 1,
  })
  maybeFlip(column, columnIndex, effects)
  if (foundations.length === FOUNDATION_TARGET) {
    effects.push({ kind: 'win' })
  }
}

export interface ApplyOptions {
  /**
   * Leave a completed K→A run sitting on its column instead of sweeping it to a
   * foundation. Lets the view show the cards arriving before they are collected;
   * the collection itself is then applied as a second, unstaged move.
   */
  readonly deferFoundations?: boolean
}

export function applyMove(
  state: GameState,
  move: Move,
  settings: GameSettings = DEFAULT_GAME_SETTINGS,
  options: ApplyOptions = {},
): MoveResult {
  const collect = !options.deferFoundations
  if (move.kind === 'dealStock') {
    if (state.stock.length === 0) {
      return { ok: false, reason: 'stock_empty' }
    }
    if (!canDealStock(state, settings)) {
      return { ok: false, reason: 'empty_column_blocks_deal' }
    }
    const columns = cloneColumns(state.columns)
    const stock = state.stock.map((batch) => batch.slice())
    const batch = stock.shift()!
    if (batch.length !== 10) {
      return { ok: false, reason: 'stock_empty' }
    }
    const effects: Effect[] = []
    const dealtIds: CardId[] = []
    for (let i = 0; i < 10; i++) {
      const card = batch[i]!
      columns[i]!.push(withFace(card, true))
      dealtIds.push(card.id)
    }
    effects.push({ kind: 'deal', cardIds: dealtIds })
    const foundations = state.foundations.map((f) => f.slice())
    const score = { value: state.score - 1 }
    if (collect) {
      for (let i = 0; i < 10; i++) {
        maybeFoundation(columns, foundations, i as ColumnIndex, effects, score)
      }
    }
    return {
      ok: true,
      state: {
        ...state,
        columns,
        stock,
        foundations,
        moveCount: state.moveCount + 1,
        score: score.value,
      },
      effects,
    }
  }

  const { from, to, count } = move
  if (from === to) {
    return { ok: false, reason: 'same_column' }
  }
  const source = state.columns[from]
  if (!source || count < 1 || count > source.length) {
    return { ok: false, reason: 'invalid_count' }
  }
  const max = movableRunLength(source)
  if (count > max) {
    return { ok: false, reason: 'not_movable_run' }
  }
  const run = source.slice(source.length - count)
  const dest = state.columns[to]
  if (!dest || !canPlace(run, dest)) {
    return { ok: false, reason: 'cannot_place' }
  }

  const columns = cloneColumns(state.columns)
  const fromCol = columns[from]!
  const toCol = columns[to]!
  const moved = fromCol.splice(fromCol.length - count, count)
  toCol.push(...moved)

  const effects: Effect[] = [
    {
      kind: 'moved',
      from,
      to,
      cardIds: moved.map((c) => c.id),
    },
  ]
  maybeFlip(fromCol, from, effects)

  const foundations = state.foundations.map((f) => f.slice())
  const score = { value: state.score - 1 }
  if (collect) {
    maybeFoundation(columns, foundations, to, effects, score)
  }

  return {
    ok: true,
    state: {
      ...state,
      columns,
      foundations,
      moveCount: state.moveCount + 1,
      score: score.value,
    },
    effects,
  }
}
