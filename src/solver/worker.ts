import { createGame, fold } from '@/engine/game'
import { applyMove } from '@/engine/moves'
import { isWon } from '@/engine/rules'
import type { Difficulty, GameState, Move } from '@/engine/types'
import { rankedHints, search } from './search'
import type { SearchBudget, SearchStatus } from './search'

export type SolverRequest =
  | {
      readonly id: string
      readonly method: 'solve'
      readonly params: {
        readonly seed: number
        readonly difficulty: Difficulty
        readonly moveLog: readonly Move[]
        readonly budget: SearchBudget
      }
    }
  | {
      readonly id: string
      readonly method: 'hint'
      readonly params: { readonly state: GameState; readonly limit?: number }
    }
  | {
      readonly id: string
      readonly method: 'findWinnable'
      readonly params: {
        readonly difficulty: Difficulty
        readonly budgetMs: number
        readonly startSeed?: number
      }
    }
  | {
      readonly id: string
      readonly method: 'cancel'
      readonly params: { readonly id: string }
    }

export type SolverResponse =
  | { readonly id: string; readonly result: unknown }
  | { readonly id: string; readonly error: string }

const cancelled = new Set<string>()

function handle(req: SolverRequest): SolverResponse {
  try {
    if (req.method === 'cancel') {
      cancelled.add(req.params.id)
      return { id: req.id, result: true }
    }
    if (cancelled.has(req.id)) {
      cancelled.delete(req.id)
      return { id: req.id, result: { status: 'unknown', bestLine: [], nodes: 0 } }
    }

    if (req.method === 'solve') {
      const state = fold(req.params.seed, req.params.difficulty, req.params.moveLog)
      const budget: SearchBudget = {
        ...req.params.budget,
        shouldAbort: () => cancelled.has(req.id),
      }
      const result = search(state, budget)
      cancelled.delete(req.id)
      return { id: req.id, result }
    }

    if (req.method === 'hint') {
      const hints = rankedHints(req.params.state, req.params.limit ?? 3)
      return { id: req.id, result: hints }
    }

    // findWinnable
    const { difficulty, budgetMs } = req.params
    let seed = req.params.startSeed ?? Math.floor(Math.random() * 1_000_000_000)
    const started = Date.now()
    let attempts = 0
    while (Date.now() - started < budgetMs) {
      if (cancelled.has(req.id)) break
      attempts += 1
      const game = createGame(seed, difficulty)
      const perSolve = Math.min(400, budgetMs - (Date.now() - started))
      const result = search(game.state, {
        maxNodes: 5_000,
        maxMs: perSolve,
        shouldAbort: () => cancelled.has(req.id),
      })
      if (result.status === 'solved') {
        // Verify replay
        let s = game.state
        for (const m of result.moves) {
          const r = applyMove(s, m)
          if (!r.ok) break
          s = r.state
        }
        if (isWon(s)) {
          cancelled.delete(req.id)
          return {
            id: req.id,
            result: { seed, attempts, nodes: result.nodes, moves: result.moves },
          }
        }
      }
      seed = (seed + 1) >>> 0
    }
    cancelled.delete(req.id)
    return { id: req.id, result: { seed: null, attempts } }
  } catch (e) {
    return { id: req.id, error: e instanceof Error ? e.message : String(e) }
  }
}

self.onmessage = (ev: MessageEvent<SolverRequest>) => {
  const response = handle(ev.data)
  ;(self as unknown as Worker).postMessage(response)
}

export type { SearchStatus }
