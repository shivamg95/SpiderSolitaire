import { describe, expect, it } from 'vitest'
import {
  computeScore,
  createTimer,
  elapsedMs,
  pauseTimer,
  resumeTimer,
  VEGAS_BUY_IN,
} from './scoring'
import type { Clock } from './scoring'
import {
  decodeMoveLog,
  decodeShareCode,
  encodeMoveLog,
  encodeShareCode,
  migrateSave,
} from './serialize'
import type { Move } from './types'
import fc from 'fast-check'

function fakeClock(start = 1_000_000): Clock & { advance: (ms: number) => void } {
  let t = start
  return {
    now: () => t,
    advance: (ms) => {
      t += ms
    },
  }
}

describe('scoring', () => {
  it('computes standard score', () => {
    expect(
      computeScore({
        mode: 'standard',
        moveCount: 10,
        undoCount: 2,
        foundations: 1,
        undoPenalty: true,
      }),
    ).toBe(500 - 10 - 2 + 100)
    expect(
      computeScore({
        mode: 'standard',
        moveCount: 10,
        undoCount: 2,
        foundations: 1,
        undoPenalty: false,
      }),
    ).toBe(500 - 10 + 100)
  })

  it('computes vegas score with time tiers', () => {
    expect(
      computeScore({
        mode: 'vegas',
        bankroll: 1000,
        foundations: 2,
        elapsedMs: 3 * 60_000,
      }),
    ).toBe(1000 - VEGAS_BUY_IN + 200 + 150)
  })

  it('timer accrues only while running', () => {
    const clock = fakeClock()
    let timer = createTimer(clock)
    clock.advance(5000)
    expect(elapsedMs(timer, clock)).toBe(5000)
    timer = pauseTimer(timer, clock)
    clock.advance(10_000)
    expect(elapsedMs(timer, clock)).toBe(5000)
    timer = resumeTimer(timer, clock)
    clock.advance(2000)
    expect(elapsedMs(timer, clock)).toBe(7000)
  })
})

describe('serialize', () => {
  it('round-trips move logs', () => {
    const moves: Move[] = [
      { kind: 'moveRun', from: 0, to: 3, count: 2 },
      { kind: 'dealStock' },
      { kind: 'moveRun', from: 9, to: 1, count: 13 },
    ]
    const encoded = encodeMoveLog(moves)
    expect(decodeMoveLog(encoded)).toEqual(moves)
  })

  it('round-trips share codes and rejects corrupt input', () => {
    for (const d of [1, 2, 4] as const) {
      const code = encodeShareCode({ seed: 42, difficulty: d })
      expect(decodeShareCode(code)).toEqual({ ok: true, seed: 42, difficulty: d })
    }
    expect(decodeShareCode('SHORT').ok).toBe(false)
    expect(decodeShareCode('!!!!!!!!').ok).toBe(false)
    const good = encodeShareCode({ seed: 1, difficulty: 1 })
    const flipped = `${good.slice(0, 8)}0`
    if (flipped !== good) {
      expect(decodeShareCode(flipped).ok).toBe(false)
    }
  })

  it('fuzzes share-code garbage', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 20 }), (s) => {
        const result = decodeShareCode(s)
        expect(typeof result.ok).toBe('boolean')
      }),
      { numRuns: 50 },
    )
  })

  it('migrates v1 saves', () => {
    const save = migrateSave({
      version: 1,
      seed: 1,
      difficulty: 1,
      moveLog: '',
      undoCount: 0,
      scoringMode: 'standard',
      bankroll: 0,
      elapsedMs: 0,
      createdAt: 0,
      updatedAt: 0,
    })
    expect(save.version).toBe(1)
    expect(() => migrateSave(null)).toThrow()
    expect(() => migrateSave({ version: 99 })).toThrow()
  })
})
