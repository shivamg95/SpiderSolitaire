import { rankLabel } from '@/engine/cards'
import { classifyMove, hintableMoves, hintTierRank, type HintTier } from '@/engine/game'
import { applyMove } from '@/engine/moves'
import type { CardId, GameSettings, GameState, Move, Suit } from '@/engine/types'
import { DEFAULT_GAME_SETTINGS } from '@/engine/types'
import { canonicalKey } from './canonical'
import { heuristic } from './heuristics'
import { SOLVE_PROFILES, solveDeal } from './solve'

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

/**
 * @deprecated Use `solveDeal` from `./solve`. This adapter keeps the older
 * `{maxNodes, maxMs}` shape working for existing callers; it maps onto a sound
 * (unpruned) search so an `unsolvable` answer still means what it says.
 */
export function search(
  root: GameState,
  budget: SearchBudget,
  settings: GameSettings = DEFAULT_GAME_SETTINGS,
): SearchStatus {
  const result = solveDeal(
    root,
    {
      ...SOLVE_PROFILES.PROVE_DEAD,
      maxNodes: budget.maxNodes,
      maxMs: budget.maxMs,
      capacity: Math.max(1024, budget.maxNodes),
      ...(budget.shouldAbort ? { shouldAbort: budget.shouldAbort } : {}),
    },
    settings,
  )

  if (result.status === 'solved') {
    return { status: 'solved', moves: result.moves, nodes: result.nodes }
  }
  if (result.status === 'unsolvable') {
    return { status: 'unsolvable', nodes: result.nodes }
  }
  return { status: 'unknown', bestLine: [], nodes: result.nodes }
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

/** Build a single high-confidence hint for a known-legal move (rescue line). */
export function hintForMove(
  state: GameState,
  move: Move,
  settings: GameSettings = DEFAULT_GAME_SETTINGS,
  confidence: RankedHint['confidence'] = 'high',
): RankedHint {
  const tier = classifyMove(state, move, settings)
  return {
    move,
    explanation: explainMove(state, move, settings, tier),
    confidence,
    tier,
    cardIds: moveCardIds(state, move),
  }
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
