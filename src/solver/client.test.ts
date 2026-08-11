import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createGame } from '@/engine/game'
import { SolverClient } from './client'

/**
 * A stand-in for the real Worker that records what it was sent and never
 * answers unless the test tells it to. Real cancellation is `terminate()`, so
 * the thing worth asserting is that terminate happens and the promise rejects.
 */
class FakeWorker {
  static instances: FakeWorker[] = []

  onmessage: ((ev: MessageEvent<unknown>) => void) | null = null
  onerror: ((ev: unknown) => void) | null = null
  readonly sent: { id: string; method: string }[] = []
  terminated = false

  constructor() {
    FakeWorker.instances.push(this)
  }

  postMessage(msg: unknown): void {
    this.sent.push(msg as { id: string; method: string })
  }

  terminate(): void {
    this.terminated = true
  }

  /** Deliver a reply for the nth message this worker received. */
  reply(index: number, result: unknown): void {
    const req = this.sent[index]
    if (!req) throw new Error(`no message at ${index}`)
    this.onmessage?.({ data: { id: req.id, result } } as MessageEvent<unknown>)
  }

  replyError(index: number, error: string): void {
    const req = this.sent[index]
    if (!req) throw new Error(`no message at ${index}`)
    this.onmessage?.({ data: { id: req.id, error } } as MessageEvent<unknown>)
  }
}

beforeEach(() => {
  FakeWorker.instances = []
  vi.stubGlobal('Worker', FakeWorker)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('SolverClient', () => {
  it('resolves a hint round trip', async () => {
    const client = new SolverClient()
    const promise = client.hint(createGame(1, 1).state, 3)
    const worker = FakeWorker.instances[0]!
    expect(worker.sent[0]?.method).toBe('hint')
    worker.reply(0, [])
    await expect(promise).resolves.toEqual([])
  })

  it('rejects when the worker reports an error', async () => {
    const client = new SolverClient()
    const promise = client.hint(createGame(1, 1).state)
    FakeWorker.instances[0]!.replyError(0, 'boom')
    await expect(promise).rejects.toThrow('boom')
  })

  it('cancels an in-flight job by terminating its worker', async () => {
    const client = new SolverClient()
    const call = client.winnability(1, 4, [])
    const worker = FakeWorker.instances[0]!
    expect(worker.terminated).toBe(false)

    call.cancel()
    expect(worker.terminated).toBe(true)
    await expect(call.promise).rejects.toThrow('cancelled')
  })

  /**
   * The reason hints and long jobs are on separate channels: terminating a
   * multi-second search must not drop a hint the player is waiting on.
   */
  it('keeps hints alive when a long job is cancelled', async () => {
    const client = new SolverClient()
    const hint = client.hint(createGame(2, 1).state)
    const job = client.winnability(2, 4, [])

    expect(FakeWorker.instances).toHaveLength(2)
    const [hintWorker, jobWorker] = FakeWorker.instances as [FakeWorker, FakeWorker]

    job.cancel()
    expect(jobWorker.terminated).toBe(true)
    expect(hintWorker.terminated).toBe(false)

    hintWorker.reply(0, [])
    await expect(hint).resolves.toEqual([])
    await expect(job.promise).rejects.toThrow('cancelled')
  })

  it('cancelling a settled call is a no-op', async () => {
    const client = new SolverClient()
    const call = client.winnability(3, 2, [])
    const worker = FakeWorker.instances[0]!
    worker.reply(0, { verdict: 'winnable', nodes: 1, deadEnd: false })
    await expect(call.promise).resolves.toMatchObject({ verdict: 'winnable' })

    call.cancel()
    expect(worker.terminated).toBe(false)
  })

  it('reuses one worker per channel across calls', () => {
    const client = new SolverClient()
    client.mine(4, 100, 1)
    client.winnability(1, 4, [])
    client.lastWinnable(1, 4, [])
    expect(FakeWorker.instances).toHaveLength(1)
    expect(FakeWorker.instances[0]!.sent.map((m) => m.method)).toEqual([
      'mine',
      'winnability',
      'lastWinnable',
    ])
  })

  it('rejects everything outstanding when a worker errors', async () => {
    const client = new SolverClient()
    const a = client.winnability(1, 4, [])
    const b = client.mine(4, 100, 1)
    FakeWorker.instances[0]!.onerror?.({})
    await expect(a.promise).rejects.toThrow('solver worker error')
    await expect(b.promise).rejects.toThrow('solver worker error')
  })

  it('starts a fresh worker after termination', async () => {
    const client = new SolverClient()
    const first = client.winnability(1, 4, [])
    first.cancel()
    await expect(first.promise).rejects.toThrow('cancelled')

    const second = client.winnability(1, 4, [])
    expect(FakeWorker.instances).toHaveLength(2)
    FakeWorker.instances[1]!.reply(0, { verdict: 'unknown', nodes: 0, deadEnd: false })
    await expect(second.promise).resolves.toMatchObject({ verdict: 'unknown' })
  })
})
