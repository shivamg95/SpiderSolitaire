import { describe, expect, it } from 'vitest'
import { createGame, fold } from '@/engine/game'
import { deadBoard, wonBoard } from '@/engine/testing/boards'
import type { Difficulty, Move } from '@/engine/types'
import { findLastWinnableIndex, winnability, winnabilityOf } from './rescue'
import { SEED_POOL } from './seedPool.generated'
import { SOLVE_PROFILES, solveDeal } from './solve'
import { VERIFY_SETTINGS } from './verify'

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
  it('returns 0 for a deal with no moves played', () => {
    const seed = pooled(1)
    if (seed === null) return
    expect(findLastWinnableIndex(seed, 1, [], VERIFY_SETTINGS)).toEqual({
      index: 0,
      checked: 0,
    })
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
    expect(result.checked).toBeGreaterThan(0)
  })

  it('accepts a complete winning line', () => {
    const seed = pooled(1)
    if (seed === null) return

    const { state } = createGame(seed, 1, VERIFY_SETTINGS)
    const solved = solveDeal(state, SOLVE_PROFILES.VERIFY, VERIFY_SETTINGS)
    if (solved.status !== 'solved') return

    const result = findLastWinnableIndex(seed, 1, solved.moves, VERIFY_SETTINGS)
    expect(result.index).toBe(solved.moves.length)
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
  })
})
