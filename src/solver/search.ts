import { rankLabel } from '@/engine/cards'
import { classifyMove, hintableMoves, hintTierRank, type HintTier } from '@/engine/game'
import { applyMove } from '@/engine/moves'
import { isWon, legalMoves } from '@/engine/rules'
import type { CardId, GameSettings, GameState, Move, Suit } from '@/engine/types'
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
  const baseline = heuristic(state)
  return moves
    .filter((m) => !reverses(prev, m))
    .map((m) => {
      const result = applyMove(state, m)
      const delta = result.ok ? heuristic(result.state) - baseline : -999
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

export interface HintSearchBudget {
  readonly maxDepth: number
  readonly beamWidth: number
  readonly maxMs: number
  readonly maxNodes: number
}

/** Worker budget: deep enough to see setup moves, fast enough for a button press. */
export const DEFAULT_HINT_BUDGET: HintSearchBudget = {
  maxDepth: 4,
  beamWidth: 12,
  maxMs: 120,
  maxNodes: 4_000,
}

/** Main-thread fallback: one-ply only so the UI never janks. */
export const SYNC_HINT_BUDGET: HintSearchBudget = {
  maxDepth: 1,
  beamWidth: 1,
  maxMs: 50,
  maxNodes: 100,
}

const HINT_DISCOUNT = 0.9

interface BeamNode {
  readonly state: GameState
  readonly depth: number
  readonly prev: Move | undefined
}

/**
 * Bounded beam lookahead from a root move. Returns the best discounted
 * heuristic reachable on that move's line (depth 0 = after the root move).
 */
export function hintSearch(
  root: GameState,
  rootMove: Move,
  settings: GameSettings = DEFAULT_GAME_SETTINGS,
  budget: HintSearchBudget = DEFAULT_HINT_BUDGET,
): number {
  const after = applyMove(root, rootMove, settings)
  if (!after.ok) return Number.NEGATIVE_INFINITY

  const started = Date.now()
  let nodes = 0
  let best = heuristic(after.state)
  const visited = new Set<string>([canonicalKey(after.state)])

  let beam: BeamNode[] = [{ state: after.state, depth: 0, prev: rootMove }]

  while (beam.length > 0) {
    if (nodes >= budget.maxNodes) break
    if (Date.now() - started >= budget.maxMs) break

    const nextBeam: (BeamNode & { score: number })[] = []

    for (const node of beam) {
      if (node.depth >= budget.maxDepth - 1) continue
      if (nodes >= budget.maxNodes) break
      if (Date.now() - started >= budget.maxMs) break

      const candidates = hintableMoves(node.state, settings)
      const ordered = orderMoves(node.state, candidates, node.prev)

      for (const move of ordered) {
        if (nodes >= budget.maxNodes) break
        const result = applyMove(node.state, move, settings)
        if (!result.ok) continue
        nodes += 1

        const key = canonicalKey(result.state)
        if (visited.has(key)) continue
        visited.add(key)

        const depth = node.depth + 1
        const score = heuristic(result.state) * HINT_DISCOUNT ** depth
        if (score > best) best = score

        nextBeam.push({
          state: result.state,
          depth,
          prev: move,
          score,
        })
      }
    }

    nextBeam.sort((a, b) => b.score - a.score)
    beam = nextBeam.slice(0, budget.beamWidth).map(({ state, depth, prev }) => ({
      state,
      depth,
      prev,
    }))
  }

  return best
}

function suitWord(suit: Suit): string {
  switch (suit) {
    case 'S':
      return 'spade'
    case 'H':
      return 'heart'
    case 'D':
      return 'diamond'
    case 'C':
      return 'club'
  }
}

function moveCardIds(state: GameState, move: Move): readonly CardId[] {
  if (move.kind !== 'moveRun') return []
  const col = state.columns[move.from]
  if (!col) return []
  return col.slice(col.length - move.count).map((c) => c.id)
}

export function explainMove(
  state: GameState,
  move: Move,
  settings: GameSettings = DEFAULT_GAME_SETTINGS,
  tier?: HintTier,
): string {
  const resolved = tier ?? classifyMove(state, move, settings)

  switch (resolved) {
    case 'deal':
      return 'deals from the stock'
    case 'completeSet': {
      if (move.kind === 'moveRun') {
        const head =
          state.columns[move.from]?.[state.columns[move.from]!.length - move.count]
        if (head) return `completes a ${suitWord(head.suit)} foundation`
      }
      return 'completes a foundation'
    }
    case 'emptyColumn':
      return 'clears a column'
    case 'uncover':
      return move.kind === 'moveRun'
        ? `frees a hidden card in column ${move.from + 1}`
        : 'frees a hidden card'
    case 'suitMerge': {
      if (move.kind === 'moveRun') {
        const head =
          state.columns[move.from]?.[state.columns[move.from]!.length - move.count]
        if (head) return `merges two ${suitWord(head.suit)} builds`
      }
      return 'builds a same-suit run'
    }
    case 'suitPlacement': {
      if (move.kind === 'moveRun') {
        const head =
          state.columns[move.from]?.[state.columns[move.from]!.length - move.count]
        if (head) {
          return `places ${rankLabel(head.rank)}${head.suit} onto its suit`
        }
      }
      return 'builds a same-suit run'
    }
    case 'crossSuitUnload':
      return 'unloads onto another suit'
    case 'spendEmpty': {
      if (move.kind === 'moveRun') {
        const head =
          state.columns[move.from]?.[state.columns[move.from]!.length - move.count]
        if (head?.rank === 13) return 'parks a King in an empty column'
      }
      return 'uses an empty column'
    }
    case 'breakBuild':
      return 'splits a same-suit build'
    case 'shuffle':
      return 'rearranges cards'
  }
}

export interface RankedHint {
  readonly move: Move
  readonly explanation: string
  readonly confidence: 'high' | 'medium' | 'low'
  readonly tier: HintTier
  readonly cardIds: readonly CardId[]
}

function confidenceFor(
  ranked: readonly { score: number; tier: HintTier }[],
  index: number,
): 'high' | 'medium' | 'low' {
  const entry = ranked[index]
  if (!entry) return 'low'
  if (entry.tier === 'completeSet') return 'high'
  if (index === 0) {
    const second = ranked[1]
    if (!second) return 'high'
    const gap = entry.score - second.score
    if (gap >= 4) return 'high'
    if (gap >= 1.5) return 'medium'
    return 'low'
  }
  if (index === 1) return 'medium'
  return 'low'
}

/**
 * Rank ladder-pruned candidates with bounded lookahead. Returns the top `limit`
 * moves (default 3), tiebroken by hint tier, with gap-derived confidence.
 */
export function rankedHints(
  state: GameState,
  limit = 3,
  settings: GameSettings = DEFAULT_GAME_SETTINGS,
  candidates?: readonly Move[],
  budget: HintSearchBudget = DEFAULT_HINT_BUDGET,
): RankedHint[] {
  const moves = candidates ?? hintableMoves(state, settings)
  if (moves.length === 0) return []

  const scored = moves.map((move) => {
    const tier = classifyMove(state, move, settings)
    const score = hintSearch(state, move, settings, budget)
    return {
      move,
      tier,
      score,
      explanation: explainMove(state, move, settings, tier),
      cardIds: moveCardIds(state, move),
      tierRank: hintTierRank(tier, state.difficulty),
    }
  })

  scored.sort((a, b) => b.score - a.score || a.tierRank - b.tierRank)

  const top = scored.slice(0, Math.max(1, limit))
  return top.map((s, i) => ({
    move: s.move,
    explanation: s.explanation,
    confidence: confidenceFor(top, i),
    tier: s.tier,
    cardIds: s.cardIds,
  }))
}
