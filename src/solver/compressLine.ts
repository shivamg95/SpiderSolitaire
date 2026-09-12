import { applyMove } from '@/engine/moves'
import { isWon } from '@/engine/rules'
import type { CardId, GameSettings, GameState, Move } from '@/engine/types'
import { DEFAULT_GAME_SETTINGS } from '@/engine/types'

const MAX_PASSES = 8

function lineWins(
  root: GameState,
  moves: readonly Move[],
  settings: GameSettings,
): boolean {
  let state = root
  for (const move of moves) {
    const result = applyMove(state, move, settings)
    if (!result.ok) return false
    state = result.state
  }
  return isWon(state)
}

function movedIds(
  root: GameState,
  moves: readonly Move[],
  settings: GameSettings,
): (readonly CardId[] | null)[] | null {
  const ids: (readonly CardId[] | null)[] = []
  let state = root
  for (const move of moves) {
    const result = applyMove(state, move, settings)
    if (!result.ok) return null
    const effect = result.effects.find((e) => e.kind === 'moved')
    ids.push(effect?.kind === 'moved' ? effect.cardIds : null)
    state = result.state
  }
  return ids
}

function sameCards(a: readonly CardId[], b: readonly CardId[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

/**
 * Drop any move whose suffix still wins without it. One forward pass from the
 * current prefix; later passes catch moves that only became skippable after a
 * later parking step disappeared.
 */
function skipRedundant(
  root: GameState,
  moves: readonly Move[],
  settings: GameSettings,
): Move[] {
  const kept: Move[] = []
  let state = root
  for (let i = 0; i < moves.length; i++) {
    if (lineWins(state, moves.slice(i + 1), settings)) continue
    const applied = applyMove(state, moves[i]!, settings)
    if (!applied.ok) return [...moves]
    state = applied.state
    kept.push(moves[i]!)
  }
  return kept
}

function relocationMerge(a: Move, b: Move): Move[] | null {
  if (a.kind !== 'moveRun' || b.kind !== 'moveRun') return null
  if (a.to !== b.from || a.count !== b.count) return null
  if (a.from === b.to) return []
  return [{ kind: 'moveRun', from: a.from, to: b.to, count: a.count }]
}

/**
 * Collapse A→B then B→C of the same run into A→C, and cancel A→B then B→A.
 * Every candidate is replayed; a merge that would collect a set on the wrong
 * column (and break later indices) is left alone.
 */
function coalesceRelocations(
  root: GameState,
  moves: readonly Move[],
  settings: GameSettings,
): Move[] {
  const line = [...moves]
  let i = 0
  while (i < line.length - 1) {
    const merged = relocationMerge(line[i]!, line[i + 1]!)
    if (merged === null) {
      i += 1
      continue
    }
    const trial = [...line.slice(0, i), ...merged, ...line.slice(i + 2)]
    if (lineWins(root, trial, settings)) {
      line.splice(i, 2, ...merged)
      continue
    }
    i += 1
  }
  return line
}

/**
 * The solver parks a run, does other work, then moves the same cards again.
 * Adjacent coalesce cannot see that. If the next hop of those cards can be
 * done at the first opportunity (or the first hop can wait), drop the extra
 * relocate. Replay is the safety net: a hop that was waiting for a dest to
 * open, or that uncovered something, is kept.
 */
function shortcutSameRun(
  root: GameState,
  moves: readonly Move[],
  settings: GameSettings,
): Move[] {
  let line = [...moves]
  let remaining = moves.length
  while (remaining > 0) {
    remaining -= 1
    const ids = movedIds(root, line, settings)
    if (!ids) return [...moves]

    let changed = false
    outer: for (let i = 0; i < line.length; i++) {
      const a = line[i]!
      const aIds = ids[i]
      if (a.kind !== 'moveRun' || !aIds) continue
      for (let j = i + 1; j < line.length; j++) {
        const b = line[j]!
        const bIds = ids[j]
        if (b.kind !== 'moveRun' || !bIds || !sameCards(aIds, bIds)) continue

        if (a.from === b.to) {
          const dropped = [
            ...line.slice(0, i),
            ...line.slice(i + 1, j),
            ...line.slice(j + 1),
          ]
          if (lineWins(root, dropped, settings)) {
            line = dropped
            changed = true
            break outer
          }
        } else {
          const sendEarlier: Move[] = [
            ...line.slice(0, i),
            { kind: 'moveRun', from: a.from, to: b.to, count: a.count },
            ...line.slice(i + 1, j),
            ...line.slice(j + 1),
          ]
          if (lineWins(root, sendEarlier, settings)) {
            line = sendEarlier
            changed = true
            break outer
          }
          const delay: Move[] = [
            ...line.slice(0, i),
            ...line.slice(i + 1, j),
            { kind: 'moveRun', from: a.from, to: b.to, count: b.count },
            ...line.slice(j + 1),
          ]
          if (lineWins(root, delay, settings)) {
            line = delay
            changed = true
            break outer
          }
        }
        break
      }
    }
    if (!changed) return line
  }
  return line
}

/**
 * Shorten a proven winning line without changing the win.
 *
 * The solver returns the first DFS path that hits 8 foundations. That path is
 * allowed to park the same run on every legal +1 on the way. Rescue Hint plays
 * the line move-for-move, so those extra hops show up as the same cards moving
 * again and again. Compression is a post-pass: skip anything the suffix does
 * not need, coalesce adjacent hops, then shortcut later hops of the same run.
 * If the line does not actually win (mocked tests, a truncated log) it is left
 * untouched.
 */
export function compressWinningLine(
  root: GameState,
  moves: readonly Move[],
  settings: GameSettings = DEFAULT_GAME_SETTINGS,
): readonly Move[] {
  if (moves.length <= 1) return moves
  if (!lineWins(root, moves, settings)) return moves

  let line: Move[] = [...moves]
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const next = shortcutSameRun(
      root,
      coalesceRelocations(root, skipRedundant(root, line, settings), settings),
      settings,
    )
    if (next.length === line.length) {
      line = next
      break
    }
    line = next
  }

  return lineWins(root, line, settings) ? line : moves
}
