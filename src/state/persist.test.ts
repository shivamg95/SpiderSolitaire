import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  __resetPersistForTests,
  flushGameSave,
  listReplays,
  loadCurrentGame,
  pushReplay,
  scheduleGameSave,
} from './persist'

describe('persist', () => {
  beforeEach(() => {
    __resetPersistForTests()
  })

  afterEach(() => {
    vi.useRealTimers()
    __resetPersistForTests()
  })

  it('debounces game saves and caps replays', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const base = {
      version: 1 as const,
      seed: 7,
      difficulty: 1 as const,
      moveLog: '',
      undoCount: 0,
      scoringMode: 'standard' as const,
      bankroll: 0,
      elapsedMs: 0,
      createdAt: 1,
      updatedAt: 1,
    }
    scheduleGameSave({ ...base, moveLog: 'a' })
    scheduleGameSave({ ...base, moveLog: 'ab' })
    await flushGameSave()
    expect((await loadCurrentGame())?.moveLog).toBe('ab')

    for (let i = 0; i < 25; i++) {
      await pushReplay({
        seed: i,
        difficulty: 1,
        moveLog: '',
        won: false,
        savedAt: i,
      })
    }
    expect(await listReplays()).toHaveLength(20)
  })
})
