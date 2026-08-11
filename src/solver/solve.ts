import { mulberry32 } from '@/engine/rng'
import type { GameSettings, GameState, Move } from '@/engine/types'
import { DEFAULT_GAME_SETTINGS } from '@/engine/types'
import type { CompactDeal } from './compact'
import {
  applyCompactMove,
  compactHeuristic,
  compactLegalMoves,
  compactMoveTier,
  COMPACT_SIZE,
  isCompactWon,
  decodeMoveCode,
  MAX_LEGAL_MOVES,
  TIER_BREAK_BUILD,
  TIER_COMPLETE_SET,
  TIER_SHUFFLE,
  toCompact,
} from './compact'
import type { SearchWeights } from './heuristics'
import { HashSet53 } from './hashSet'
import { compactKey } from './zobrist'

/**
 * How hard the search is allowed to prune.
 *
 * `none` keeps every legal move, so draining the frontier really does prove the
 * position is dead. `aggressive` throws away shuffles and build-breaks, which
 * is far faster but can hide a solution — so in that mode an exhausted frontier
 * is reported as `unknown` rather than `unsolvable`, and callers cannot
 * accidentally read a pruning artefact as proof.
 */
export type PruneMode = 'none' | 'aggressive'

/**
 * `dfs` dives with restarts and is the one that actually wins 4-suit deals, but
 * it can never prove a position dead. `bestFirst` is slower at finding wins and
 * is kept because a drained frontier there is a real proof of unsolvability.
 */
export type SolveStrategy = 'dfs' | 'bestFirst'

export interface SolveBudget {
  readonly maxNodes: number
  readonly maxMs: number
  /** Hard ceiling on stored positions; guards worker memory. */
  readonly capacity: number
  readonly prune: PruneMode
  readonly strategy: SolveStrategy
  /** Cost per move applied to the priority, biasing toward shorter lines. */
  readonly depthWeight: number
  /** Nodes one `dfs` dive may burn before the search restarts with new jitter. */
  readonly attemptNodes: number
  /** Overrides SEARCH_WEIGHTS_BY_DIFFICULTY; used by the tuning sweep. */
  readonly weights?: SearchWeights
  readonly shouldAbort?: () => boolean
}

export type SolveStopReason = 'nodes' | 'time' | 'capacity' | 'aborted' | 'exhausted'

export type SolveResult =
  | { readonly status: 'solved'; readonly moves: readonly Move[]; readonly nodes: number }
  | { readonly status: 'unsolvable'; readonly nodes: number }
  | {
      readonly status: 'unknown'
      readonly nodes: number
      readonly reason: SolveStopReason
    }

type Profile = Omit<SolveBudget, 'shouldAbort'>

/**
 * Named budgets. `VERIFY` runs offline where a deal may take a minute;
 * `MINE` and `RESCUE` run in a browser worker and stay small enough that the
 * arena never exceeds roughly 25MB and 50MB respectively.
 */
export const SOLVE_PROFILES: Record<
  'VERIFY' | 'MINE' | 'RESCUE' | 'PROVE_DEAD',
  Profile
> = {
  VERIFY: {
    maxNodes: 6_000_000,
    maxMs: 60_000,
    capacity: 6_000_000,
    prune: 'aggressive',
    strategy: 'dfs',
    depthWeight: 0.35,
    attemptNodes: 30_000,
  },
  MINE: {
    maxNodes: 400_000,
    maxMs: 2_500,
    capacity: 400_000,
    prune: 'aggressive',
    strategy: 'dfs',
    depthWeight: 0.35,
    attemptNodes: 30_000,
  },
  /** "Can this position still be won?" — needs to find a line, not disprove one. */
  RESCUE: {
    maxNodes: 700_000,
    maxMs: 4_000,
    capacity: 700_000,
    prune: 'aggressive',
    strategy: 'dfs',
    depthWeight: 0.35,
    attemptNodes: 30_000,
  },
  /** The sound half of the rescue check: an exhausted frontier proves defeat. */
  PROVE_DEAD: {
    maxNodes: 120_000,
    maxMs: 900,
    capacity: 120_000,
    prune: 'none',
    strategy: 'bestFirst',
    depthWeight: 0.35,
    attemptNodes: 30_000,
  },
}

const BLOCK_BITS = 16
const BLOCK_SIZE = 1 << BLOCK_BITS
const BLOCK_MASK = BLOCK_SIZE - 1

/**
 * Positions live in fixed 64k-node blocks so the arena can grow to millions of
 * entries without ever copying the board data it already holds.
 */
class NodeArena {
  private blocks: Uint8Array[] = []
  parent = new Int32Array(1024)
  moveCode = new Uint16Array(1024)
  depth = new Int32Array(1024)
  size = 0
  private readonly capacity: number

  constructor(capacity: number) {
    this.capacity = capacity
  }

  /** Returns the new node index, or -1 when the arena is full. */
  alloc(): number {
    if (this.size >= this.capacity) return -1
    const index = this.size
    const block = index >> BLOCK_BITS
    if (block >= this.blocks.length) {
      this.blocks.push(new Uint8Array(BLOCK_SIZE * COMPACT_SIZE))
    }
    if (index >= this.parent.length) this.growSideTables()
    this.size = index + 1
    return index
  }

  rollback(): void {
    this.size -= 1
  }

  buf(index: number): Uint8Array {
    const block = this.blocks[index >> BLOCK_BITS]!
    const offset = (index & BLOCK_MASK) * COMPACT_SIZE
    return block.subarray(offset, offset + COMPACT_SIZE)
  }

  private growSideTables(): void {
    const next = Math.min(this.parent.length * 2, this.capacity + 1)
    const parent = new Int32Array(next)
    parent.set(this.parent)
    const moveCode = new Uint16Array(next)
    moveCode.set(this.moveCode)
    const depth = new Int32Array(next)
    depth.set(this.depth)
    this.parent = parent
    this.moveCode = moveCode
    this.depth = depth
  }
}

/** Max-heap of arena indices keyed by priority. */
class PriorityQueue {
  private nodes = new Int32Array(1024)
  private priorities = new Float64Array(1024)
  private length = 0

  get size(): number {
    return this.length
  }

  push(node: number, priority: number): void {
    if (this.length === this.nodes.length) this.grow()
    let i = this.length
    this.length += 1
    while (i > 0) {
      const parent = (i - 1) >> 1
      if (this.priorities[parent]! >= priority) break
      this.nodes[i] = this.nodes[parent]!
      this.priorities[i] = this.priorities[parent]!
      i = parent
    }
    this.nodes[i] = node
    this.priorities[i] = priority
  }

  pop(): number {
    const top = this.nodes[0]!
    this.length -= 1
    if (this.length === 0) return top

    const node = this.nodes[this.length]!
    const priority = this.priorities[this.length]!
    let i = 0
    for (;;) {
      const left = i * 2 + 1
      if (left >= this.length) break
      const right = left + 1
      let child = left
      if (right < this.length && this.priorities[right]! > this.priorities[left]!) {
        child = right
      }
      if (this.priorities[child]! <= priority) break
      this.nodes[i] = this.nodes[child]!
      this.priorities[i] = this.priorities[child]!
      i = child
    }
    this.nodes[i] = node
    this.priorities[i] = priority
    return top
  }

  private grow(): void {
    const nodes = new Int32Array(this.nodes.length * 2)
    nodes.set(this.nodes)
    const priorities = new Float64Array(this.priorities.length * 2)
    priorities.set(this.priorities)
    this.nodes = nodes
    this.priorities = priorities
  }
}

function reconstruct(arena: NodeArena, node: number): Move[] {
  const codes: number[] = []
  let current = node
  while (current > 0) {
    codes.push(arena.moveCode[current]!)
    current = arena.parent[current]!
  }
  codes.reverse()
  return codes.map(decodeMoveCode)
}

/** How often the wall-clock and abort checks run, in nodes expanded. */
const CLOCK_INTERVAL = 512

/**
 * Filter a generated move list in place, returning the surviving count.
 *
 * Two rules, both only safe because the caller has opted into `aggressive`:
 *
 * 1. If any move completes a K→A set, that is the only move worth making. A
 *    finished set is thirteen cards of dead weight removed for good, and the
 *    alternative lines are still reachable afterwards. Treating it as forced
 *    collapses the branching factor exactly where positions are most crowded.
 * 2. Otherwise drop shuffles and build-breaks, which is the same ladder the
 *    hint system uses to decide a move is not worth suggesting.
 */
function prune(buf: Uint8Array, moves: Uint16Array, count: number): number {
  for (let i = 0; i < count; i++) {
    if (compactMoveTier(buf, moves[i]!) === TIER_COMPLETE_SET) {
      let kept = 0
      for (let j = 0; j < count; j++) {
        const code = moves[j]!
        if (compactMoveTier(buf, code) === TIER_COMPLETE_SET) moves[kept++] = code
      }
      return kept
    }
  }

  let kept = 0
  for (let i = 0; i < count; i++) {
    const code = moves[i]!
    const tier = compactMoveTier(buf, code)
    if (tier === TIER_SHUFFLE || tier === TIER_BREAK_BUILD) continue
    moves[kept++] = code
  }
  return kept
}

/**
 * Most children a level keeps. Real branching after pruning sits well under
 * this; the cap only bounds the per-level board storage.
 */
const MAX_KEPT = 192
const MAX_DEPTH = 1200

interface Level {
  readonly buf: Uint8Array
  readonly childBufs: Uint8Array
  readonly childCodes: Uint16Array
  readonly childKeys: Float64Array
  readonly childScores: Float64Array
  readonly order: Int32Array
  n: number
  cursor: number
  code: number
}

function makeLevel(): Level {
  return {
    buf: new Uint8Array(COMPACT_SIZE),
    childBufs: new Uint8Array(MAX_KEPT * COMPACT_SIZE),
    childCodes: new Uint16Array(MAX_KEPT),
    childKeys: new Float64Array(MAX_KEPT),
    childScores: new Float64Array(MAX_KEPT),
    order: new Int32Array(MAX_KEPT),
    n: 0,
    cursor: 0,
    code: 0,
  }
}

/**
 * Depth-first search with heuristic move ordering and randomised restarts.
 *
 * A won Spider game is two hundred-odd moves deep, which is exactly the shape
 * best-first search handles worst: it will exhaust every shallow variation
 * before committing to a line, and on 4-suit the frontier plateaus long before
 * it reaches winning depth. Diving instead, and restarting with jittered move
 * ordering when a dive stalls, turns the same node budget into a portfolio of
 * deep attempts.
 */
function dfsSolve(
  root: Uint8Array,
  deal: CompactDeal,
  budget: SolveBudget,
  allowDealWithEmptyColumn: boolean,
): SolveResult {
  const started = Date.now()
  const visited = new HashSet53(Math.min(budget.capacity, 1 << 21))
  const moves = new Uint16Array(MAX_LEGAL_MOVES)
  const levels: Level[] = [makeLevel()]
  const attemptCap = Math.max(1_000, budget.attemptNodes)

  let nodes = 0
  let stop: SolveStopReason = 'nodes'

  const levelAt = (depth: number): Level => {
    while (levels.length <= depth) levels.push(makeLevel())
    return levels[depth]!
  }

  /** Score, hash and order every child of `level`, skipping seen positions. */
  const expand = (level: Level, jitter: number, rng: () => number): void => {
    let count = compactLegalMoves(level.buf, deal, allowDealWithEmptyColumn, moves)
    if (budget.prune === 'aggressive') count = prune(level.buf, moves, count)

    let kept = 0
    for (let i = 0; i < count && kept < MAX_KEPT; i++) {
      const code = moves[i]!
      const offset = kept * COMPACT_SIZE
      const child = level.childBufs.subarray(offset, offset + COMPACT_SIZE)
      applyCompactMove(level.buf, child, code, deal)
      const key = compactKey(child)
      if (visited.has(key)) continue
      level.childCodes[kept] = code
      level.childKeys[kept] = key
      level.childScores[kept] =
        compactHeuristic(child, deal.difficulty, budget.weights) +
        (jitter > 0 ? rng() * jitter : 0)
      kept += 1
    }
    level.n = kept
    level.cursor = 0

    // Insertion sort, best score first. Post-pruning branching is small enough
    // that this beats allocating a comparator-sorted array per node.
    const order = level.order
    for (let i = 0; i < kept; i++) {
      const score = level.childScores[i]!
      let j = i
      while (j > 0 && level.childScores[order[j - 1]!]! < score) {
        order[j] = order[j - 1]!
        j -= 1
      }
      order[j] = i
    }
  }

  for (let attempt = 0; ; attempt++) {
    if (nodes >= budget.maxNodes) {
      stop = 'nodes'
      break
    }
    if (Date.now() - started >= budget.maxMs) {
      stop = 'time'
      break
    }
    if (budget.shouldAbort?.()) {
      stop = 'aborted'
      break
    }

    visited.clear()
    const rng = mulberry32(0x5eed + attempt * 0x9e37)
    // The first dive is pure greedy; later ones shuffle near-ties harder so the
    // portfolio explores genuinely different lines rather than re-treading one.
    const jitter = attempt === 0 ? 0 : 1.5 * attempt
    const attemptLimit = nodes + Math.min(attemptCap, budget.maxNodes - nodes)

    const root0 = levelAt(0)
    root0.buf.set(root)
    root0.code = 0
    visited.add(compactKey(root))
    expand(root0, jitter, rng)

    let depth = 0
    let capped = false
    let halted = false
    while (depth >= 0) {
      const level = levels[depth]!
      if (level.cursor >= level.n) {
        depth -= 1
        continue
      }

      const index = level.order[level.cursor++]!
      if (!visited.add(level.childKeys[index]!)) continue

      nodes += 1
      if (nodes >= attemptLimit) {
        capped = true
        break
      }
      if ((nodes & (CLOCK_INTERVAL - 1)) === 0) {
        if (Date.now() - started >= budget.maxMs) {
          stop = 'time'
          halted = true
          break
        }
        if (budget.shouldAbort?.()) {
          stop = 'aborted'
          halted = true
          break
        }
      }

      const offset = index * COMPACT_SIZE
      const childBuf = level.childBufs.subarray(offset, offset + COMPACT_SIZE)

      if (isCompactWon(childBuf)) {
        const path: Move[] = []
        for (let d = 1; d <= depth; d++) path.push(decodeMoveCode(levels[d]!.code))
        path.push(decodeMoveCode(level.childCodes[index]!))
        return { status: 'solved', moves: path, nodes }
      }

      if (depth + 1 >= MAX_DEPTH) continue

      const next = levelAt(depth + 1)
      next.buf.set(childBuf)
      next.code = level.childCodes[index]!
      expand(next, jitter, rng)
      depth += 1
    }

    if (halted) break

    // The dive drained the whole reachable tree without needing its node
    // allowance, so every restart after this one would explore the same nothing.
    // Small dead positions land here, which is exactly where the old code would
    // otherwise spin out its entire time budget on empty restarts.
    if (!capped) {
      if (budget.prune === 'none') return { status: 'unsolvable', nodes }
      return { status: 'unknown', nodes, reason: 'exhausted' }
    }
  }

  return { status: 'unknown', nodes, reason: stop }
}

export function solveCompact(
  root: Uint8Array,
  deal: CompactDeal,
  budget: SolveBudget,
  allowDealWithEmptyColumn: boolean,
): SolveResult {
  // An already-won board needs no moves. Checked here rather than inside each
  // strategy so neither can forget: a won position has no legal moves, so a
  // search that starts there would otherwise report an exhausted frontier.
  if (isCompactWon(root)) return { status: 'solved', moves: [], nodes: 0 }

  if (budget.strategy === 'dfs') {
    return dfsSolve(root, deal, budget, allowDealWithEmptyColumn)
  }
  return bestFirstSolve(root, deal, budget, allowDealWithEmptyColumn)
}

function bestFirstSolve(
  root: Uint8Array,
  deal: CompactDeal,
  budget: SolveBudget,
  allowDealWithEmptyColumn: boolean,
): SolveResult {
  const started = Date.now()
  const arena = new NodeArena(budget.capacity)
  const visited = new HashSet53(Math.min(budget.capacity, 1 << 22))
  const queue = new PriorityQueue()
  const moves = new Uint16Array(MAX_LEGAL_MOVES)

  const rootIndex = arena.alloc()
  arena.buf(rootIndex).set(root)
  arena.parent[rootIndex] = -1
  arena.depth[rootIndex] = 0
  visited.add(compactKey(root))
  queue.push(rootIndex, compactHeuristic(root, deal.difficulty, budget.weights))

  let nodes = 0
  let exhausted = true
  let stop: SolveStopReason = 'nodes'

  while (queue.size > 0) {
    if (nodes >= budget.maxNodes) {
      exhausted = false
      stop = 'nodes'
      break
    }
    if (nodes % CLOCK_INTERVAL === 0) {
      if (Date.now() - started >= budget.maxMs) {
        exhausted = false
        stop = 'time'
        break
      }
      if (budget.shouldAbort?.()) {
        exhausted = false
        stop = 'aborted'
        break
      }
    }

    const node = queue.pop()
    nodes += 1

    const parentBuf = arena.buf(node)
    const depth = arena.depth[node]! + 1
    let count = compactLegalMoves(parentBuf, deal, allowDealWithEmptyColumn, moves)

    if (budget.prune === 'aggressive') {
      count = prune(parentBuf, moves, count)
    }

    for (let i = 0; i < count; i++) {
      const code = moves[i]!

      const child = arena.alloc()
      if (child === -1) return { status: 'unknown', nodes, reason: 'capacity' }

      // `parentBuf` is a view into the arena, and allocating the child can
      // append a fresh block but never moves existing ones, so the view stays
      // valid across the call above.
      const childBuf = arena.buf(child)
      applyCompactMove(parentBuf, childBuf, code, deal)

      if (!visited.add(compactKey(childBuf))) {
        arena.rollback()
        continue
      }

      arena.parent[child] = node
      arena.moveCode[child] = code
      arena.depth[child] = depth

      if (isCompactWon(childBuf)) {
        return { status: 'solved', moves: reconstruct(arena, child), nodes }
      }

      queue.push(
        child,
        compactHeuristic(childBuf, deal.difficulty, budget.weights) -
          budget.depthWeight * depth,
      )
    }
  }

  if (exhausted && budget.prune === 'none') {
    return { status: 'unsolvable', nodes }
  }
  return { status: 'unknown', nodes, reason: exhausted ? 'exhausted' : stop }
}

export function solveDeal(
  state: GameState,
  budget: SolveBudget,
  settings: GameSettings = DEFAULT_GAME_SETTINGS,
): SolveResult {
  const { buf, deal } = toCompact(state)
  return solveCompact(buf, deal, budget, settings.allowDealWithEmptyColumn)
}

/** Build a budget from a named profile, overriding individual fields. */
export function budgetFrom(
  profile: keyof typeof SOLVE_PROFILES,
  overrides: Partial<SolveBudget> = {},
): SolveBudget {
  return { ...SOLVE_PROFILES[profile], ...overrides }
}
