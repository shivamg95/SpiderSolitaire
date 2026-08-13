import { afterEach, describe, expect, it, vi } from 'vitest'
import { createGame, fold } from '@/engine/game'
import { deadBoard, wonBoard } from '@/engine/testing/boards'
import type { Difficulty, GameState, Move } from '@/engine/types'
import { findLastWinnableIndex, winnability, winnabilityOf } from './rescue'
import { SEED_POOL } from './seedPool.generated'
import { SOLVE_PROFILES, solveDeal, type SolveResult } from './solve'
import { VERIFY_SETTINGS, replayWins } from './verify'
import * as solveMod from './solve'
import * as verifyMod from './verify'

function pooled(difficulty: Difficulty): number | null {
  return SEED_POOL.pools[difficulty].seeds[0] ?? null
}

describe('winnabilityOf', () => {
  it('calls a won board winnable without searching', () => {
    expect(winnabilityOf(wonBoard())).toEqual({
      verdict: 'winnable',
      nodes: 0,
      deadEnd: false,
    })
  })

  /**
   * A board with no legal move is the clearest possible `lost`, and the report
   * flags it as a visible dead end so the UI can say so plainly.
   */
  it('calls a board with no legal moves lost, and flags the dead end', () => {
    const report = winnabilityOf(deadBoard())
    expect(report.verdict).toBe('lost')
    expect(report.deadEnd).toBe(true)
  })

  it('proves a fresh pooled deal winnable', () => {
    const seed = pooled(2)
    if (seed === null) return
    expect(winnability(seed, 2, [], VERIFY_SETTINGS).verdict).toBe('winnable')
  })
})

describe('findLastWinnableIndex', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('solves a fresh deal and returns its continuation', () => {
    const line: Move[] = [{ kind: 'dealStock' }]
    vi.spyOn(solveMod, 'solveDeal').mockReturnValue({
      status: 'solved',
      moves: line,
      nodes: 1,
    })
    vi.spyOn(verifyMod, 'replayWins').mockReturnValue(true)

    expect(findLastWinnableIndex(1, 1, [], VERIFY_SETTINGS)).toEqual({
      index: 0,
      checked: 1,
      continuation: line,
    })
  })

  it('probes the current prefix first and keeps its continuation', () => {
    const line: Move[] = [{ kind: 'dealStock' }]
    const solve = vi.spyOn(solveMod, 'solveDeal').mockReturnValue({
      status: 'solved',
      moves: line,
      nodes: 10,
    })
    vi.spyOn(verifyMod, 'replayWins').mockReturnValue(true)

    const log: Move[] = [{ kind: 'dealStock' }, { kind: 'dealStock' }]
    const result = findLastWinnableIndex(1, 1, log, VERIFY_SETTINGS)
    expect(result).toEqual({
      index: 2,
      checked: 1,
      continuation: line,
    })
    expect(solve).toHaveBeenCalledTimes(1)
  })

  it('solves the deal when every later prefix misses', () => {
    const line: Move[] = [{ kind: 'dealStock' }]
    vi.spyOn(solveMod, 'solveDeal').mockImplementation(
      (state: GameState): SolveResult => {
        if (state.moveCount === 0) {
          return { status: 'solved', moves: line, nodes: 1 }
        }
        return { status: 'unknown', nodes: 1, reason: 'time' }
      },
    )
    vi.spyOn(verifyMod, 'replayWins').mockReturnValue(true)

    const log: Move[] = [{ kind: 'dealStock' }, { kind: 'dealStock' }]
    const result = findLastWinnableIndex(1, 1, log, VERIFY_SETTINGS)
    expect(result.index).toBe(0)
    expect(result.continuation).toEqual(line)
    expect(result.checked).toBeGreaterThan(1)
  })

  it('returns an empty continuation when the deal cannot be proven', () => {
    vi.spyOn(solveMod, 'solveDeal').mockReturnValue({
      status: 'unknown',
      nodes: 1,
      reason: 'time',
    })

    const result = findLastWinnableIndex(99, 4, [{ kind: 'dealStock' }], VERIFY_SETTINGS)
    expect(result.index).toBe(0)
    expect(result.continuation).toEqual([])
  })

  /**
   * Every prefix of a winning line is by definition still winnable, so given one
   * the answer has to be "you are fine where you are" — the full log length.
   * That is the property that stops the panel offering a pointless rewind.
   */
  it('keeps the whole log when every position on it is still winnable', () => {
    const seed = pooled(1)
    if (seed === null) return

    const { state } = createGame(seed, 1, VERIFY_SETTINGS)
    const solved = solveDeal(state, SOLVE_PROFILES.VERIFY, VERIFY_SETTINGS)
    expect(solved.status).toBe('solved')
    if (solved.status !== 'solved') return

    const prefix = solved.moves.slice(0, 10)
    const result = findLastWinnableIndex(seed, 1, prefix, VERIFY_SETTINGS)
    expect(result.index).toBe(prefix.length)
    expect(result.checked).toBe(1)
    expect(result.continuation.length).toBeGreaterThan(0)
    expect(
      replayWins(
        fold(seed, 1, prefix, VERIFY_SETTINGS),
        result.continuation,
        VERIFY_SETTINGS,
      ),
    ).toBe(true)
  })

  it('accepts a complete winning line', () => {
    const seed = pooled(1)
    if (seed === null) return

    const { state } = createGame(seed, 1, VERIFY_SETTINGS)
    const solved = solveDeal(state, SOLVE_PROFILES.VERIFY, VERIFY_SETTINGS)
    if (solved.status !== 'solved') return

    const result = findLastWinnableIndex(seed, 1, solved.moves, VERIFY_SETTINGS)
    expect(result.index).toBe(solved.moves.length)
    expect(result.continuation).toEqual([])
    expect(fold(seed, 1, solved.moves, VERIFY_SETTINGS).foundations).toHaveLength(8)
  })

  /**
   * The rescue point must be a real index into the log. Anything past the end
   * would mean "rewind forwards", and anything below zero has no board.
   */
  it('always returns an index inside the move log', () => {
    const seed = pooled(2)
    if (seed === null) return

    const moveLog: Move[] = [
      { kind: 'dealStock' },
      { kind: 'dealStock' },
      { kind: 'dealStock' },
    ]
    const result = findLastWinnableIndex(seed, 2, moveLog, VERIFY_SETTINGS)
    expect(result.index).toBeGreaterThanOrEqual(0)
    expect(result.index).toBeLessThanOrEqual(moveLog.length)
    expect(Array.isArray(result.continuation)).toBe(true)
  })
})
