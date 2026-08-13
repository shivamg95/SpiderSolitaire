import { fold, hintableMoves } from '@/engine/game'
import type { Difficulty, GameSettings, GameState, Move } from '@/engine/types'
import { DEFAULT_GAME_SETTINGS } from '@/engine/types'
import { rankedHints } from './search'
import { mineSeeds, type MinedSeedResult } from './mine'
import {
  findLastWinnableIndex,
  winnability,
  type LastWinnableResult,
  type WinnabilityReport,
} from './rescue'
import type { SolveBudget, SolveResult } from './solve'
import { SOLVE_PROFILES, solveDeal } from './solve'

export type SolverRequest =
  | {
      readonly id: string
      readonly method: 'solve'
      readonly params: {
        readonly seed: number
        readonly difficulty: Difficulty
        readonly moveLog: readonly Move[]
        readonly budget: Partial<SolveBudget>
        readonly settings?: GameSettings | undefined
      }
    }
  | {
      readonly id: string
      readonly method: 'hint'
      readonly params: {
        readonly state: GameState
        readonly limit?: number | undefined
        readonly settings?: GameSettings | undefined
      }
    }
  | {
      readonly id: string
      readonly method: 'mine'
      readonly params: {
        readonly difficulty: Difficulty
        readonly budgetMs: number
        readonly limit: number
        readonly startSeed?: number | undefined
      }
    }
  | {
      readonly id: string
      readonly method: 'winnability'
      readonly params: {
        readonly seed: number
        readonly difficulty: Difficulty
        readonly moveLog: readonly Move[]
        readonly settings?: GameSettings | undefined
      }
    }
  | {
      readonly id: string
      readonly method: 'lastWinnable'
      readonly params: {
        readonly seed: number
        readonly difficulty: Difficulty
        readonly moveLog: readonly Move[]
        readonly settings?: GameSettings | undefined
      }
    }

export type SolverResult =
  | SolveResult
  | WinnabilityReport
  | MinedSeedResult
  | LastWinnableResult
  | ReturnType<typeof rankedHints>

export type SolverResponse =
  | { readonly id: string; readonly result: SolverResult }
  | { readonly id: string; readonly error: string }

/**
 * Long jobs are cancelled by terminating the worker from the client, not by
 * posting a message: this handler is synchronous, so a `cancel` message would
 * sit in the queue until the search it was meant to stop had already finished.
 * `SolverClient` keeps short (`hint`) and long (`mine`, `winnability`) work on
 * separate worker instances precisely so terminating one never drops the other.
 */
function handle(req: SolverRequest): SolverResponse {
  try {
    switch (req.method) {
      case 'solve': {
        const settings = req.params.settings ?? DEFAULT_GAME_SETTINGS
        const state = fold(
          req.params.seed,
          req.params.difficulty,
          req.params.moveLog,
          settings,
        )
        const budget: SolveBudget = { ...SOLVE_PROFILES.RESCUE, ...req.params.budget }
        return { id: req.id, result: solveDeal(state, budget, settings) }
      }

      case 'hint': {
        const settings = req.params.settings ?? DEFAULT_GAME_SETTINGS
        const candidates = hintableMoves(req.params.state, settings)
        return {
          id: req.id,
          result: rankedHints(
            req.params.state,
            req.params.limit ?? 3,
            settings,
            candidates,
          ),
        }
      }

      case 'mine':
        return {
          id: req.id,
          result: mineSeeds(
            req.params.difficulty,
            req.params.budgetMs,
            req.params.limit,
            req.params.startSeed,
          ),
        }

      case 'winnability': {
        const settings = req.params.settings ?? DEFAULT_GAME_SETTINGS
        return {
          id: req.id,
          result: winnability(
            req.params.seed,
            req.params.difficulty,
            req.params.moveLog,
            settings,
          ),
        }
      }

      case 'lastWinnable': {
        const settings = req.params.settings ?? DEFAULT_GAME_SETTINGS
        return {
          id: req.id,
          result: findLastWinnableIndex(
            req.params.seed,
            req.params.difficulty,
            req.params.moveLog,
            settings,
          ),
        }
      }
    }
  } catch (e) {
    return { id: req.id, error: e instanceof Error ? e.message : String(e) }
  }
}

self.onmessage = (ev: MessageEvent<SolverRequest>) => {
  ;(self as unknown as Worker).postMessage(handle(ev.data))
}
