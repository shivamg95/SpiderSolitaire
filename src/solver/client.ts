import type { Difficulty, GameSettings, GameState, Move } from '@/engine/types'
import type { MinedSeedResult } from './mine'
import type { WinnabilityReport } from './rescue'
import type { RankedHint } from './search'
import type { SolveBudget, SolveResult } from './solve'
import type { SolverRequest, SolverResponse } from './worker'

export type { RankedHint }

interface Pending {
  resolve: (value: unknown) => void
  reject: (err: Error) => void
}

/**
 * A cancellable request. `cancel()` terminates the worker, which is the only
 * thing that reliably stops an in-flight search: the worker's message handler
 * runs the search synchronously, so a `cancel` message could not be read until
 * the search had already ended.
 */
export interface SolverCall<T> {
  readonly promise: Promise<T>
  cancel: () => void
}

/**
 * One worker channel. Two are kept: a short-job channel for hints, which must
 * stay responsive to a button press, and a long-job channel for mining and
 * winnability checks. Separating them means terminating a multi-second search
 * can never drop a pending hint, and a hint never queues behind one.
 */
class WorkerChannel {
  private worker: Worker | null = null
  private seq = 0
  private pending = new Map<string, Pending>()

  private ensureWorker(): Worker {
    if (this.worker) return this.worker
    const worker = new Worker(new URL('./worker.ts', import.meta.url), {
      type: 'module',
    })
    worker.onmessage = (ev: MessageEvent<SolverResponse>) => {
      const msg = ev.data
      const p = this.pending.get(msg.id)
      if (!p) return
      this.pending.delete(msg.id)
      if ('error' in msg) p.reject(new Error(msg.error))
      else p.resolve(msg.result)
    }
    worker.onerror = () => {
      this.failAll(new Error('solver worker error'))
    }
    this.worker = worker
    return worker
  }

  private failAll(error: Error): void {
    for (const p of this.pending.values()) p.reject(error)
    this.pending.clear()
    this.worker?.terminate()
    this.worker = null
  }

  call<T>(payload: Omit<SolverRequest, 'id'>): SolverCall<T> {
    const id = `r${++this.seq}`
    const worker = this.ensureWorker()
    const promise = new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject })
      worker.postMessage({ ...payload, id })
    })
    return {
      promise,
      cancel: () => {
        if (!this.pending.has(id)) return
        this.failAll(new Error('cancelled'))
      },
    }
  }

  terminate(): void {
    this.failAll(new Error('worker terminated'))
  }
}

export class SolverClient {
  private readonly hints = new WorkerChannel()
  private readonly jobs = new WorkerChannel()

  hint(state: GameState, limit?: number, settings?: GameSettings): Promise<RankedHint[]> {
    return this.hints.call<RankedHint[]>({
      method: 'hint',
      params: { state, limit, settings },
    }).promise
  }

  solve(
    seed: number,
    difficulty: Difficulty,
    moveLog: readonly Move[],
    budget: Partial<SolveBudget> = {},
    settings?: GameSettings,
  ): SolverCall<SolveResult> {
    return this.jobs.call<SolveResult>({
      method: 'solve',
      params: { seed, difficulty, moveLog, budget, settings },
    })
  }

  /** Search for seeds proven winnable, for the background top-up. */
  mine(
    difficulty: Difficulty,
    budgetMs: number,
    limit: number,
    startSeed?: number,
  ): SolverCall<MinedSeedResult> {
    return this.jobs.call<MinedSeedResult>({
      method: 'mine',
      params: { difficulty, budgetMs, limit, startSeed },
    })
  }

  /** Is the position after `moveLog` still winnable? */
  winnability(
    seed: number,
    difficulty: Difficulty,
    moveLog: readonly Move[],
    settings?: GameSettings,
  ): SolverCall<WinnabilityReport> {
    return this.jobs.call<WinnabilityReport>({
      method: 'winnability',
      params: { seed, difficulty, moveLog, settings },
    })
  }

  /** Index of the last position in `moveLog` from which the deal can still be won. */
  lastWinnable(
    seed: number,
    difficulty: Difficulty,
    moveLog: readonly Move[],
    settings?: GameSettings,
  ): SolverCall<{ index: number; checked: number }> {
    return this.jobs.call<{ index: number; checked: number }>({
      method: 'lastWinnable',
      params: { seed, difficulty, moveLog, settings },
    })
  }

  terminate(): void {
    this.hints.terminate()
    this.jobs.terminate()
  }
}
