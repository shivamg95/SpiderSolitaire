import { describe, expect, it } from 'vitest'
import { encodeShareCode } from '@/engine/serialize'
import { buildDealShareCode, buildDealShareUrl, parseDealFromSearch } from './dealUrl'

describe('dealUrl', () => {
  it('builds and parses seed+d URLs', () => {
    const href = buildDealShareUrl(42, 4, 'https://example.com/spider/')
    expect(href).toBe('https://example.com/spider/?seed=42&d=4')
    expect(parseDealFromSearch(new URL(href).search)).toEqual({
      seed: 42,
      difficulty: 4,
    })
  })

  it('parses deal share codes', () => {
    const code = encodeShareCode({ seed: 99, difficulty: 2 })
    expect(parseDealFromSearch(`?deal=${code}`)).toEqual({
      seed: 99,
      difficulty: 2,
    })
  })

  it('rejects invalid params', () => {
    expect(parseDealFromSearch('')).toBeNull()
    expect(parseDealFromSearch('?seed=abc&d=1')).toBeNull()
    expect(parseDealFromSearch('?seed=1&d=3')).toBeNull()
    expect(parseDealFromSearch('?deal=NOTVALID1')).toBeNull()
  })

  it('defaults difficulty to 1 when d is omitted', () => {
    expect(parseDealFromSearch('?seed=7')).toEqual({ seed: 7, difficulty: 1 })
  })

  it('builds matching share codes', () => {
    expect(buildDealShareCode(1, 1)).toBe(encodeShareCode({ seed: 1, difficulty: 1 }))
  })
})
