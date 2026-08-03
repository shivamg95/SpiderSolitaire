import { describe, expect, it } from 'vitest'
import { applyMove } from '@/engine/moves'
import { isWon } from '@/engine/rules'
import { parseBoard } from '@/engine/testing/ascii'
import { createGame } from '@/engine/game'
import { canonicalKey } from './canonical'
import { heuristic } from './heuristics'
import { rankedHints, search } from './search'
import { hashKey, hashState } from './zobrist'

describe('canonical + zobrist', () => {
  it('is identical for column permutations', () => {
    const a = parseBoard(`
      difficulty: 1
      c0: [0] S5
      c1: [0] S6
      stock: 0
      found: 0
    `)
    const b = {
      ...a,
      columns: [...a.columns.slice(0, 2)].reverse().concat(a.columns.slice(2)),
    }
    // Rebuild properly
    const cols = a.columns.map((c) => c.slice())
    const tmp = cols[0]!
    cols[0] = cols[1]!
    cols[1] = tmp
    const swapped = { ...a, columns: cols }
    expect(canonicalKey(a)).toBe(canonicalKey(swapped))
    expect(hashKey(hashState(a))).not.toBe('')
    void b
  })

  it('differs for genuinely different states', () => {
    const a = createGame(1, 1).state
    const b = createGame(2, 1).state
    expect(canonicalKey(a)).not.toBe(canonicalKey(b))
  })
})

describe('search', () => {
  it('solves a near-win foundation fixture', () => {
    const state = parseBoard(`
      difficulty: 1
      c0: [0] SK SQ SJ S10 S9 S8 S7 S6 S5 S4 S3 S2
      c1: [0] SA
      stock: 0
      found: 7
    `)
    const result = search(state, { maxNodes: 100, maxMs: 500 })
    expect(result.status).toBe('solved')
    if (result.status !== 'solved') return
    let s = state
    for (const m of result.moves) {
      const r = applyMove(s, m)
      expect(r.ok).toBe(true)
      if (!r.ok) return
      s = r.state
    }
    expect(isWon(s)).toBe(true)
  })

  it('reports unsolvable/unknown on a dead board', () => {
    const dead = {
      ...createGame(1, 1).state,
      columns: Array.from({ length: 10 }, (_, i) => [
        { id: `S5#${i}` as never, suit: 'S' as const, rank: 5 as const, faceUp: true },
      ]),
      stock: [],
      foundations: [],
    }
    const result = search(dead, { maxNodes: 50, maxMs: 200 })
    expect(['unsolvable', 'unknown']).toContain(result.status)
  })

  it('returns ranked hints', () => {
    const g = createGame(3, 1)
    const hints = rankedHints(g.state, 3)
    expect(hints.length).toBeGreaterThan(0)
    expect(hints[0]?.explanation.length).toBeGreaterThan(0)
    expect(heuristic(g.state)).toBeTypeOf('number')
  })

  it('honors abort', () => {
    const g = createGame(9, 4)
    let calls = 0
    const result = search(g.state, {
      maxNodes: 100_000,
      maxMs: 5_000,
      shouldAbort: () => {
        calls += 1
        return calls > 3
      },
    })
    expect(result.status).toBe('unknown')
  })
})
