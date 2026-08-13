import { beforeEach, describe, expect, it } from 'vitest'
import { fold } from '@/engine/game'
import type { ColumnIndex, Difficulty, GameState, Move } from '@/engine/types'
import { pooledSeeds } from '@/solver/seedPool'
import { useGameStore } from './gameStore'
import { useSettingsStore } from './settingsStore'
import { __resetSeedSourceForTests } from './seedSource'
import { useUiStore } from './uiStore'

const DIFFICULTY: Difficulty = 1

/**
 * The position without the score. Rewinding charges the undo penalty, exactly as
 * stepping back one move at a time would, so the scores are expected to differ
 * from a plain replay — the cards are what has to match.
 */
function board(state: GameState) {
  const { columns, stock, foundations, moveCount } = state
  return { columns, stock, foundations, moveCount }
}

/** Play `count` legal moves from a fresh deal, returning the log. */
function playSome(count: number): Move[] {
  const store = useGameStore.getState()
  for (let i = 0; i < count; i++) {
    const { handle } = useGameStore.getState()
    const moved = handle.state.columns.some((col, from) => {
      if (col.length === 0) return false
      return handle.state.columns.some(
        (_, to) =>
          from !== to &&
          store.attemptMove({
            kind: 'moveRun',
            from: from as ColumnIndex,
            to: to as ColumnIndex,
            count: 1,
          }),
      )
    })
    if (!moved && !store.dealStock()) break
  }
  return [...useGameStore.getState().handle.moveLog]
}

beforeEach(() => {
  __resetSeedSourceForTests()
  useSettingsStore.setState({ winnableOnly: true, difficulty: DIFFICULTY })
  useUiStore.setState({ rescuePlan: null, rescueSearching: false })
  useGameStore.getState().newGame({ difficulty: DIFFICULTY })
})

describe('newGame with winnableOnly', () => {
  it('always deals a seed from the verified pool', () => {
    const pooled = new Set(pooledSeeds(DIFFICULTY).map((s) => s.seed))
    if (pooled.size === 0) return

    for (let i = 0; i < 8; i++) {
      useGameStore.getState().newGame({ difficulty: DIFFICULTY })
      expect(pooled.has(useGameStore.getState().handle.seed)).toBe(true)
    }
  })

  it('deals outside the pool when the setting is off', () => {
    const pooled = new Set(pooledSeeds(DIFFICULTY).map((s) => s.seed))
    if (pooled.size === 0) return

    useSettingsStore.setState({ winnableOnly: false })
    let sawUnpooled = false
    for (let i = 0; i < 12 && !sawUnpooled; i++) {
      useGameStore.getState().newGame({ difficulty: DIFFICULTY })
      if (!pooled.has(useGameStore.getState().handle.seed)) sawUnpooled = true
    }
    expect(sawUnpooled).toBe(true)
  })

  it('honours an explicit seed, verified or not', () => {
    useGameStore.getState().newGame({ seed: 424_242, difficulty: DIFFICULTY })
    expect(useGameStore.getState().handle.seed).toBe(424_242)
  })
})

describe('rewindTo', () => {
  it('round-trips against fold', () => {
    const log = playSome(6)
    if (log.length < 3) return

    const target = 2
    const { handle } = useGameStore.getState()
    useGameStore.getState().rewindTo(target)

    const after = useGameStore.getState().handle
    expect(after.moveLog).toEqual(log.slice(0, target))
    expect(board(after.state)).toEqual(
      board(fold(handle.seed, handle.difficulty, log.slice(0, target), handle.settings)),
    )
  })

  /**
   * Rescue rewind is a confirmed abandon of the discarded line. Redo must not
   * put the player back on the moves that just lost the deal.
   */
  it('does not keep the discarded moves redoable', () => {
    const log = playSome(6)
    if (log.length < 3) return

    useGameStore.getState().rewindTo(2)
    expect(useGameStore.getState().handle.redoLog).toEqual([])
    expect(useGameStore.getState().canRedo()).toBe(false)
  })

  it('rewinds all the way to the original deal', () => {
    const log = playSome(5)
    if (log.length === 0) return

    useGameStore.getState().rewindTo(0)
    const after = useGameStore.getState().handle
    expect(after.moveLog).toHaveLength(0)
    expect(board(after.state)).toEqual(
      board(fold(after.seed, after.difficulty, [], after.settings)),
    )
  })

  it('does nothing when asked to rewind to the current position', () => {
    const log = playSome(4)
    const before = useGameStore.getState().handle
    useGameStore.getState().rewindTo(log.length)
    expect(useGameStore.getState().handle).toBe(before)
  })

  it('clamps an out-of-range index', () => {
    const log = playSome(4)
    if (log.length === 0) return

    useGameStore.getState().rewindTo(-5)
    expect(useGameStore.getState().handle.moveLog).toHaveLength(0)

    const stable = useGameStore.getState().handle
    useGameStore.getState().rewindTo(9_999)
    expect(useGameStore.getState().handle).toBe(stable)
  })

  it('counts the discarded moves as undos for scoring', () => {
    const log = playSome(6)
    if (log.length < 4) return

    const before = useGameStore.getState().undoCount
    useGameStore.getState().rewindTo(1)
    expect(useGameStore.getState().undoCount).toBe(before + (log.length - 1))
  })

  it('clears any pending rescue offer', () => {
    const log = playSome(4)
    if (log.length < 2) return

    useUiStore.setState({
      rescuePlan: { index: 1, movesBack: log.length - 1, continuation: [] },
    })
    useGameStore.getState().rewindTo(1)
    expect(useUiStore.getState().rescuePlan).toBeNull()
  })
})

describe('rescue continuation', () => {
  const deal: Move = { kind: 'dealStock' }

  it('prefers the continuation for Hint', () => {
    useUiStore.setState({ rescueContinuation: [deal] })
    useGameStore.getState().requestHint()
    expect(useUiStore.getState().hintPlaying).toBe(true)
    expect(useUiStore.getState().hintMove).toEqual(deal)
    expect(useUiStore.getState().hintConfidence).toBe('high')
  })

  it('advances the continuation when the player follows it', () => {
    const next: Move = { kind: 'dealStock' }
    useUiStore.setState({ rescueContinuation: [deal, next] })
    expect(useGameStore.getState().dealStock()).toBe(true)
    expect(useUiStore.getState().rescueContinuation).toEqual([next])
  })

  it('clears the continuation when the player plays something else', () => {
    const log = playSome(1)
    if (log.length === 0) return
    useUiStore.setState({ rescueContinuation: [deal] })
    const moved = useGameStore.getState().handle.state.columns.some((col, from) => {
      if (col.length === 0) return false
      return useGameStore.getState().handle.state.columns.some(
        (_, to) =>
          from !== to &&
          useGameStore.getState().attemptMove({
            kind: 'moveRun',
            from: from as ColumnIndex,
            to: to as ColumnIndex,
            count: 1,
          }),
      )
    })
    if (!moved) return
    expect(useUiStore.getState().rescueContinuation).toEqual([])
  })

  it('clears the continuation on undo', () => {
    useGameStore.getState().dealStock()
    useUiStore.setState({ rescueContinuation: [deal] })
    useGameStore.getState().undo()
    expect(useUiStore.getState().rescueContinuation).toEqual([])
  })
})
