import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { parseBoard } from '@/engine/testing/ascii'
import type { GameHandle } from '@/engine/types'
import { DEFAULT_GAME_SETTINGS } from '@/engine/types'
import { useGameStore } from './gameStore'

/** An ace one tap away from completing the spade set in column 1. */
function nearlyCompleteHandle(): GameHandle {
  const state = parseBoard(`
    difficulty: 1
    c0: [1] SA
    c1: [0] SK SQ SJ S10 S9 S8 S7 S6 S5 S4 S3 S2
    c2: [0] SK
    c3: [0] SK
    c4: [0] SK
    c5: [0] SK
    c6: [0] SK
    c7: [0] SK
    c8: [0] SK
    stock: 50
    found: 0
  `)
  return {
    seed: 1,
    difficulty: 1,
    moveLog: [],
    redoLog: [],
    state,
    settings: DEFAULT_GAME_SETTINGS,
  }
}

describe('completing a set', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useGameStore.setState({
      handle: nearlyCompleteHandle(),
      undoCount: 0,
      movingIds: [],
      moveSeq: 0,
      collecting: false,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('lands the run before sweeping it to the foundation', () => {
    expect(useGameStore.getState().tapMove(0, 1)).toBe(true)

    const landed = useGameStore.getState()
    expect(landed.collecting).toBe(true)
    expect(landed.movingIds).toHaveLength(1)
    expect(landed.handle.state.columns[1]).toHaveLength(13)
    expect(landed.handle.state.foundations).toHaveLength(0)

    vi.advanceTimersByTime(1000)

    const swept = useGameStore.getState()
    expect(swept.collecting).toBe(false)
    expect(swept.movingIds).toHaveLength(13)
    expect(swept.handle.state.columns[1]).toHaveLength(0)
    expect(swept.handle.state.foundations).toHaveLength(1)
    // Two transitions, so the view replays the flight for each leg.
    expect(swept.moveSeq).toBe(2)
  })

  it('refuses input until the set has been collected', () => {
    useGameStore.getState().tapMove(0, 1)

    const mid = useGameStore.getState()
    expect(mid.dealStock()).toBe(false)
    expect(mid.canDealStock()).toBe(false)
    expect(mid.canUndo()).toBe(false)
    mid.undo()
    expect(useGameStore.getState().handle.moveLog).toHaveLength(1)

    vi.advanceTimersByTime(1000)
    expect(useGameStore.getState().canDealStock()).toBe(true)
  })

  it('drops a pending sweep when a new game starts', () => {
    useGameStore.getState().tapMove(0, 1)
    useGameStore.getState().newGame({ seed: 42, difficulty: 1 })
    vi.advanceTimersByTime(1000)

    const state = useGameStore.getState()
    expect(state.collecting).toBe(false)
    expect(state.handle.seed).toBe(42)
    expect(state.handle.state.foundations).toHaveLength(0)
  })
})
