import { describe, expect, it } from 'vitest'
import { makeCard } from '@/engine/cards'
import { createGame } from '@/engine/game'
import { cardsFromTokens, parseBoard } from '@/engine/testing/ascii'
import type { ColumnIndex, GameState, Move, Rank } from '@/engine/types'
import { INITIAL_SCORE } from '@/engine/types'
import { compressWinningLine } from './compressLine'
import { SEED_POOL } from './seedPool.generated'
import { SOLVE_PROFILES, solveDeal } from './solve'
import { VERIFY_SETTINGS, replayWins } from './verify'

function run(from: number, to: number, count: number): Move {
  return {
    kind: 'moveRun',
    from: from as ColumnIndex,
    to: to as ColumnIndex,
    count,
  }
}

/** Seven foundations in, last K→A split so one more placement wins. */
function nearWinBoard() {
  return parseBoard(`
    difficulty: 1
    found: 7
    c0: SK SQ SJ S10 S9 S8 S7 S6 S5 S4 S3 S2
    c1: SA
    stock: 0
  `)
}

describe('compressWinningLine', () => {
  it('leaves a line that does not actually win untouched', () => {
    const state = nearWinBoard()
    const line: Move[] = [run(1, 2, 1)]
    expect(compressWinningLine(state, line)).toEqual(line)
  })

  it('leaves a single winning move alone', () => {
    const state = nearWinBoard()
    const line: Move[] = [run(1, 0, 1)]
    expect(replayWins(state, line)).toBe(true)
    expect(compressWinningLine(state, line)).toEqual(line)
  })

  it('collapses A→B then B→C of the same run into A→C', () => {
    const state = nearWinBoard()
    const line: Move[] = [run(1, 2, 1), run(2, 0, 1)]
    expect(replayWins(state, line)).toBe(true)

    const compressed = compressWinningLine(state, line)
    expect(compressed).toEqual([run(1, 0, 1)])
    expect(replayWins(state, compressed)).toBe(true)
  })

  it('drops a round-trip park before the winning placements', () => {
    const state = parseBoard(`
      difficulty: 1
      found: 7
      c0: SK SQ SJ S10 S9 S8 S7 S6 S5 S4 S3
      c1: S2
      c2: SA
      stock: 0
    `)
    const line: Move[] = [run(1, 3, 1), run(3, 1, 1), run(2, 1, 1), run(1, 0, 2)]
    expect(replayWins(state, line)).toBe(true)

    const compressed = compressWinningLine(state, line)
    expect(compressed).toEqual([run(2, 1, 1), run(1, 0, 2)])
    expect(replayWins(state, compressed)).toBe(true)
  })

  it('sends a parked run straight to its later destination', () => {
    const state = parseBoard(`
      difficulty: 1
      found: 6
      c0: SK SQ SJ S10 S9 S8 S7 S6 S5 S4 S3 S2
      c1: SA
      c2: SK SQ SJ S10 S9 S8 S7 S6 S5 S4 S3 S2
      c3: SA
      stock: 0
    `)
    const line: Move[] = [run(1, 4, 1), run(3, 2, 1), run(4, 0, 1)]
    expect(replayWins(state, line)).toBe(true)

    const compressed = compressWinningLine(state, line)
    expect(compressed).toEqual([run(1, 0, 1), run(3, 2, 1)])
    expect(replayWins(state, compressed)).toBe(true)
  })

  it('does not glue flip-revealed peels into one illegal run move', () => {
    const set = (copy: number) => {
      const cards = []
      for (let rank = 13; rank >= 1; rank--) {
        cards.push(makeCard('S', rank as Rank, copy, true))
      }
      return cards
    }
    const columns = Array.from({ length: 10 }, () => [] as GameState['columns'][number])
    columns[0] = cardsFromTokens(['SK', 'SQ', 'SJ', 'S10', 'S9', 'S8', 'S7', 'S6'])
    columns[1] = [
      makeCard('S', 1, 0, false),
      makeCard('S', 2, 0, false),
      makeCard('S', 3, 0, false),
      makeCard('S', 4, 0, false),
      makeCard('S', 5, 0, true),
    ]
    const state: GameState = {
      difficulty: 1,
      columns,
      stock: [],
      foundations: Array.from({ length: 7 }, (_, i) => set(i + 1)),
      moveCount: 0,
      score: INITIAL_SCORE,
    }
    const line: Move[] = [
      run(1, 0, 1),
      run(1, 0, 1),
      run(1, 0, 1),
      run(1, 0, 1),
      run(1, 0, 1),
    ]
    expect(replayWins(state, line)).toBe(true)
    expect(compressWinningLine(state, line)).toEqual(line)
  })

  it('shortens a real 1-suit rescue line without losing the win', () => {
    const seed = SEED_POOL.pools[1].seeds[0]
    if (seed === undefined) return

    const { state } = createGame(seed, 1, VERIFY_SETTINGS)
    const solved = solveDeal(state, SOLVE_PROFILES.RESCUE, VERIFY_SETTINGS)
    expect(solved.status).toBe('solved')
    if (solved.status !== 'solved') return

    const compressed = compressWinningLine(state, solved.moves, VERIFY_SETTINGS)
    expect(replayWins(state, compressed, VERIFY_SETTINGS)).toBe(true)
    expect(compressed.length).toBeLessThan(solved.moves.length)
    expect(compressed.length).toBeGreaterThan(0)
  })
})
