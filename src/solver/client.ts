import type { Difficulty, GameSettings, GameState, Move } from '@/engine/types'
import type { SearchBudget, SearchStatus } from './search'
import type { RankedHint } from './search'

export type { RankedHint }

interface Pending {
  resolve: (value: unknown) => void
  reject: (err: Error) => void
}

interface SolverResponseOk {
  readonly id: string
  readonly result: unknown
}

interface SolverResponseErr {
  readonly id: string
  readonly error: string
}

type SolverResponse = SolverResponseOk | SolverResponseErr

export class SolverClient {
  private worker: Worker | null = null
  private seq = 0
  private pending = new Map<string, Pending>()

  private ensureWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(new URL('./worker.ts', import.meta.url), {
        type: 'module',
      })
      this.worker.onmessage = (ev: MessageEvent<SolverResponse>) => {
        const msg = ev.data
        const p = this.pending.get(msg.id)
        if (!p) return
        this.pending.delete(msg.id)
        if ('error' in msg) p.reject(new Error(msg.error))
        else p.resolve(msg.result)
      }
      this.worker.onerror = () => {
        for (const p of this.pending.values()) {
          p.reject(new Error('solver worker error'))
        }
        this.pending.clear()
        this.worker?.terminate()
        this.worker = null
      }
    }
    return this.worker
  }

  private call(payload: Record<string, unknown>): Promise<unknown> {
    const id = `r${++this.seq}`
    const worker = this.ensureWorker()
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      worker.postMessage({ ...payload, id })
    })
  }

  solve(
    seed: number,
    difficulty: Difficulty,
    moveLog: readonly Move[],
    budget: SearchBudget,
  ): Promise<SearchStatus> {
    return this.call({
      method: 'solve',
      params: { seed, difficulty, moveLog, budget },
    }) as Promise<SearchStatus>
  }

  hint(state: GameState, limit?: number, settings?: GameSettings): Promise<RankedHint[]> {
    return this.call({
      method: 'hint',
      params: { state, limit, settings },
    }) as Promise<RankedHint[]>
  }

  findWinnable(difficulty: Difficulty, budgetMs: number, startSeed?: number) {
    return this.call({
      method: 'findWinnable',
      params: { difficulty, budgetMs, startSeed },
    })
  }

  cancel(requestId: string): void {
    void this.call({ method: 'cancel', params: { id: requestId } })
  }

  terminate(): void {
    this.worker?.terminate()
    this.worker = null
    for (const p of this.pending.values()) {
      p.reject(new Error('worker terminated'))
    }
    this.pending.clear()
  }
}
