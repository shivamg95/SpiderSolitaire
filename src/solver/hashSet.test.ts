import { describe, expect, it } from 'vitest'
import { HashSet53 } from './hashSet'

describe('HashSet53', () => {
  it('remembers a key once', () => {
    const set = new HashSet53(16)
    expect(set.add(12345)).toBe(true)
    expect(set.add(12345)).toBe(false)
    expect(set.has(12345)).toBe(true)
    expect(set.has(12346)).toBe(false)
    expect(set.count).toBe(1)
  })

  /** Zero is the empty-slot marker, so it cannot also be a storable key. */
  it('folds the zero key onto one rather than losing it', () => {
    const set = new HashSet53(16)
    expect(set.add(0)).toBe(true)
    expect(set.has(0)).toBe(true)
    expect(set.add(1)).toBe(false)
  })

  it('keeps every key across the growth it has to do', () => {
    const set = new HashSet53(16)
    const keys: number[] = []
    // Well past the initial 1024 slots, so the table rehashes more than once.
    for (let i = 0; i < 5_000; i++) {
      const key = i * 2_654_435_761 + 7
      keys.push(key)
      expect(set.add(key)).toBe(true)
    }

    expect(set.count).toBe(keys.length)
    for (const key of keys) expect(set.has(key)).toBe(true)
    for (const key of keys) expect(set.add(key)).toBe(false)
  })

  it('holds keys wider than 32 bits apart', () => {
    const set = new HashSet53(16)
    const low = 0x1234567
    const high = low + 2 ** 40
    expect(set.add(low)).toBe(true)
    expect(set.add(high)).toBe(true)
    expect(set.count).toBe(2)
  })

  it('forgets everything on clear', () => {
    const set = new HashSet53(16)
    set.add(99)
    set.clear()
    expect(set.has(99)).toBe(false)
    expect(set.count).toBe(0)
    expect(set.add(99)).toBe(true)
  })
})
