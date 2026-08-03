import type { ColumnIndex, Difficulty, Move } from './types'

export interface SaveV1 {
  readonly version: 1
  readonly seed: number
  readonly difficulty: Difficulty
  readonly moveLog: string
  readonly undoCount: number
  readonly scoringMode: 'standard' | 'vegas'
  readonly bankroll: number
  readonly elapsedMs: number
  readonly createdAt: number
  readonly updatedAt: number
}

export type SaveBlob = SaveV1

type Migration = (old: Record<string, unknown>) => Record<string, unknown>

export const MIGRATIONS: Record<number, Migration> = {
  // Future: 1 -> 2 goes here
}

export function migrateSave(raw: unknown): SaveV1 {
  if (!raw || typeof raw !== 'object') {
    throw new Error('invalid save')
  }
  let current = raw as Record<string, unknown>
  let version = typeof current.version === 'number' ? current.version : 0
  while (version < 1) {
    const migrate = MIGRATIONS[version]
    if (!migrate) break
    current = migrate(current)
    version = typeof current.version === 'number' ? current.version : version + 1
  }
  if (current.version !== 1) {
    throw new Error(`unsupported save version: ${String(current.version)}`)
  }
  return current as unknown as SaveV1
}

/** Pack moveLog: moveRun → 2 base64url chars; dealStock → `.` */
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

function encodeTriplet(from: number, to: number, count: number): string {
  // from:4 bits (0-9), to:4 bits, count:4 bits (1-13) → 12 bits → 2 chars of 6 bits
  const value = ((from & 0xf) << 8) | ((to & 0xf) << 4) | (count & 0xf)
  return B64[(value >> 6) & 63]! + B64[value & 63]!
}

function decodeTriplet(
  a: string,
  b: string,
): { from: number; to: number; count: number } {
  const hi = B64.indexOf(a)
  const lo = B64.indexOf(b)
  if (hi < 0 || lo < 0) throw new Error('bad move encoding')
  const value = (hi << 6) | lo
  return {
    from: (value >> 8) & 0xf,
    to: (value >> 4) & 0xf,
    count: value & 0xf,
  }
}

export function encodeMoveLog(moves: readonly Move[]): string {
  let out = ''
  for (const move of moves) {
    if (move.kind === 'dealStock') {
      out += '.'
    } else {
      out += encodeTriplet(move.from, move.to, move.count)
    }
  }
  return out
}

export function decodeMoveLog(encoded: string): Move[] {
  const moves: Move[] = []
  let i = 0
  while (i < encoded.length) {
    const ch = encoded[i]!
    if (ch === '.') {
      moves.push({ kind: 'dealStock' })
      i += 1
      continue
    }
    const b = encoded[i + 1]
    if (!b) throw new Error('truncated move encoding')
    const { from, to, count } = decodeTriplet(ch, b)
    if (from > 9 || to > 9 || count < 1 || count > 13) {
      throw new Error('invalid packed move')
    }
    moves.push({
      kind: 'moveRun',
      from: from as ColumnIndex,
      to: to as ColumnIndex,
      count,
    })
    i += 2
  }
  return moves
}

/** Crockford Base32 alphabet (no I L O U). */
const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

function checksum(n: number): number {
  let x = n >>> 0
  x = ((x >>> 16) ^ x) * 0x45d9f3b
  x = ((x >>> 16) ^ x) * 0x45d9f3b
  x = (x >>> 16) ^ x
  return x & 0x1f
}

export function encodeShareCode(input: {
  readonly seed: number
  readonly difficulty: Difficulty
}): string {
  const seed = input.seed >>> 0
  const diffBits = input.difficulty === 1 ? 0 : input.difficulty === 2 ? 1 : 2
  // 32-bit seed + 2-bit difficulty + 5-bit checksum packed into Crockford
  const payload = BigInt(seed) | (BigInt(diffBits) << 32n)
  const cs = checksum(seed ^ (diffBits << 16))
  let n = payload
  let body = ''
  for (let i = 0; i < 8; i++) {
    body = CROCKFORD[Number(n & 31n)]! + body
    n >>= 5n
  }
  return `${body}${CROCKFORD[cs]!}`
}

export type ShareDecodeResult =
  | { readonly ok: true; readonly seed: number; readonly difficulty: Difficulty }
  | { readonly ok: false; readonly reason: string }

export function decodeShareCode(code: string): ShareDecodeResult {
  const cleaned = code
    .trim()
    .toUpperCase()
    .replace(/['"\s-]/g, '')
  if (cleaned.length !== 9) {
    return { ok: false, reason: 'bad_length' }
  }
  let payload = 0n
  for (let i = 0; i < 8; i++) {
    const idx = CROCKFORD.indexOf(cleaned[i]!)
    if (idx < 0) return { ok: false, reason: 'bad_char' }
    payload = (payload << 5n) | BigInt(idx)
  }
  const csIdx = CROCKFORD.indexOf(cleaned[8]!)
  if (csIdx < 0) return { ok: false, reason: 'bad_char' }
  const seed = Number(payload & 0xffffffffn)
  const diffBits = Number((payload >> 32n) & 3n)
  if (diffBits > 2) return { ok: false, reason: 'bad_difficulty' }
  if (csIdx !== checksum(seed ^ (diffBits << 16))) {
    return { ok: false, reason: 'bad_checksum' }
  }
  const difficulty: Difficulty = diffBits === 0 ? 1 : diffBits === 1 ? 2 : 4
  return { ok: true, seed, difficulty }
}
