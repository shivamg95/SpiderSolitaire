import { applyMove } from '@/engine/moves'
import { isWon, legalMoves } from '@/engine/rules'
import type { GameSettings, GameState, Move } from '@/engine/types'
import { DEFAULT_GAME_SETTINGS } from '@/engine/types'
import { canonicalKey } from './canonical'
import { heuristic } from './heuristics'

export interface SearchBudget {
  readonly maxNodes: number
  readonly maxMs: number
  readonly shouldAbort?: () => boolean
}

export type SearchStatus =
  | { readonly status: 'solved'; readonly moves: readonly Move[]; readonly nodes: number }
  | { readonly status: 'unsolvable'; readonly nodes: number }
  | {
      readonly status: 'unknown'
      readonly bestLine: readonly Move[]
      readonly nodes: number
    }

interface Node {
  readonly state: GameState
  readonly path: readonly Move[]
  readonly score: number
}

function reverses(prev: Move | undefined, next: Move): boolean {
  if (prev?.kind !== 'moveRun' || next.kind !== 'moveRun') return false
  return prev.from === next.to && prev.to === next.from && prev.count === next.count
}

function orderMoves(state: GameState, moves: Move[], prev: Move | undefined): Move[] {
  return moves
    .filter((m) => !reverses(prev, m))
    .map((m) => {
      const result = applyMove(state, m)
      const delta = result.ok ? heuristic(result.state) - heuristic(state) : -999
      return { m, delta }
    })
    .sort((a, b) => b.delta - a.delta)
    .map((x) => x.m)
}

export function search(
  root: GameState,
  budget: SearchBudget,
  settings: GameSettings = DEFAULT_GAME_SETTINGS,
): SearchStatus {
  const started = Date.now()
  let nodes = 0
  const visited = new Map<string, number>()
  const open: Node[] = [{ state: root, path: [], score: heuristic(root) }]
  let bestLine: readonly Move[] = []
  let bestScore = heuristic(root)

  while (open.length > 0) {
    if (nodes >= budget.maxNodes) {
      return { status: 'unknown', bestLine, nodes }
    }
    if (Date.now() - started >= budget.maxMs) {
      return { status: 'unknown', bestLine, nodes }
    }
    if (budget.shouldAbort?.()) {
      return { status: 'unknown', bestLine, nodes }
    }

    // Best-first: pick highest heuristic
    open.sort((a, b) => b.score - a.score)
    const node = open.shift()!
    nodes += 1

    if (isWon(node.state)) {
      return { status: 'solved', moves: node.path, nodes }
    }

    const key = canonicalKey(node.state)
    const prevDepth = visited.get(key)
    if (prevDepth !== undefined && prevDepth <= node.path.length) continue
    visited.set(key, node.path.length)

    if (node.score > bestScore) {
      bestScore = node.score
      bestLine = node.path
    }

    const prev = node.path[node.path.length - 1]
    const moves = orderMoves(node.state, legalMoves(node.state, settings), prev)
    for (const move of moves) {
      const result = applyMove(node.state, move, settings)
      if (!result.ok) continue
      open.push({
        state: result.state,
        path: [...node.path, move],
        score: heuristic(result.state),
      })
    }

    // Bound open list to avoid memory blowups
    if (open.length > 2_000) {
      open.sort((a, b) => b.score - a.score)
      open.length = 2_000
    }
  }

  return nodes > 0 && visited.size > 0
    ? { status: 'unsolvable', nodes }
    : { status: 'unknown', bestLine, nodes }
}

export function explainMove(state: GameState, move: Move): string {
  if (move.kind === 'dealStock') return 'deals from the stock'
  const result = applyMove(state, move)
  if (!result.ok) return 'legal build'
  if (result.effects.some((e) => e.kind === 'foundation')) return 'completes a foundation'
  if (result.effects.some((e) => e.kind === 'flip')) return 'frees a hidden card'
  const dest = state.columns[move.to]
  if (dest?.length === 0) return 'opens a column'
  const run = state.columns[move.from]?.slice(-move.count)
  const top = dest?.[dest.length - 1]
  const head = run?.[0]
  if (top?.suit === head?.suit && top && head) return 'builds a same-suit run'
  return 'builds on any suit'
}

export function rankedHints(
  state: GameState,
  limit = 3,
  settings: GameSettings = DEFAULT_GAME_SETTINGS,
): { move: Move; explanation: string; confidence: 'high' | 'medium' | 'low' }[] {
  const moves = legalMoves(state, settings)
  const scored = moves.map((move) => {
    const result = applyMove(state, move, settings)
    const delta = result.ok ? heuristic(result.state) - heuristic(state) : -999
    return { move, delta, explanation: explainMove(state, move) }
  })
  scored.sort((a, b) => b.delta - a.delta)
  return scored.slice(0, limit).map((s, i) => ({
    move: s.move,
    explanation: s.explanation,
    confidence: (i === 0 ? 'high' : i === 1 ? 'medium' : 'low') as
      'high' | 'medium' | 'low',
  }))
}
