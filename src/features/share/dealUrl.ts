import { decodeShareCode, encodeShareCode } from '@/engine/serialize'
import type { Difficulty } from '@/engine/types'

export interface SharedDeal {
  readonly seed: number
  readonly difficulty: Difficulty
}

function isDifficulty(n: number): n is Difficulty {
  return n === 1 || n === 2 || n === 4
}

/** Parse a shared deal from a URL search string (`?seed=&d=` or `?deal=`). */
export function parseDealFromSearch(search: string): SharedDeal | null {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)

  const dealCode = params.get('deal')
  if (dealCode) {
    const decoded = decodeShareCode(dealCode)
    if (decoded.ok) {
      return { seed: decoded.seed, difficulty: decoded.difficulty }
    }
  }

  const seedRaw = params.get('seed')
  if (seedRaw === null) return null
  const seedNum = Number(seedRaw)
  if (!Number.isFinite(seedNum) || seedNum < 0 || seedNum > 0xffffffff) {
    return null
  }

  const dRaw = params.get('d')
  const difficulty = dRaw === null ? 1 : Number(dRaw)
  if (!isDifficulty(difficulty)) return null

  return { seed: seedNum >>> 0, difficulty }
}

/** Build an absolute share URL for the current deal (`?seed=&d=`). */
export function buildDealShareUrl(
  seed: number,
  difficulty: Difficulty,
  baseHref: string = typeof window !== 'undefined' ? window.location.href : '',
): string {
  const url = new URL(baseHref || 'http://localhost/')
  url.search = ''
  url.hash = ''
  url.searchParams.set('seed', String(seed >>> 0))
  url.searchParams.set('d', String(difficulty))
  return url.toString()
}

/** Compact share code (Crockford base32 + checksum) for the deal. */
export function buildDealShareCode(seed: number, difficulty: Difficulty): string {
  return encodeShareCode({ seed, difficulty })
}
