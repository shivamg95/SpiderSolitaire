import { buildDeck, formatCardToken, makeCard, parseRankLabel, withFace } from '../cards'
import type { Card, Difficulty, GameState, Rank, Suit } from '../types'
import { INITIAL_SCORE } from '../types'

interface ParseOptions {
  readonly score?: number
  readonly moveCount?: number
}

function parseToken(token: string): { suit: Suit; rank: Rank } {
  const suit = token[0] as Suit
  const rankPart = token.slice(1)
  if (!['S', 'H', 'D', 'C'].includes(suit)) {
    throw new Error(`bad suit in token ${token}`)
  }
  return { suit, rank: parseRankLabel(rankPart) }
}

function canTakeRun(
  pool: readonly Card[],
  used: ReadonlySet<string>,
  suit: Suit,
): boolean {
  for (let rank = 13; rank >= 1; rank--) {
    const ok = pool.some((c) => c.suit === suit && c.rank === rank && !used.has(c.id))
    if (!ok) return false
  }
  return true
}

function takeRun(pool: readonly Card[], used: Set<string>, suit: Suit): Card[] {
  const run: Card[] = []
  for (let rank = 13; rank >= 1; rank--) {
    const card = pool.find(
      (c) => c.suit === suit && c.rank === (rank as Rank) && !used.has(c.id),
    )
    if (!card) throw new Error(`cannot take ${suit}${rank}`)
    used.add(card.id)
    run.push(withFace(card, true))
  }
  return run
}

/**
 * ASCII board fixture DSL.
 *
 * ```
 * difficulty: 1
 * c0: [2] SK SQ SJ
 * c1: [0] S5
 * c2: -
 * stock: 20
 * found: 3
 * ```
 *
 * Face-down slots (`[n]`) and remaining stock/foundation cards are filled
 * deterministically from the unused pool for the difficulty.
 */
export function parseBoard(ascii: string, options: ParseOptions = {}): GameState {
  const lines = ascii
    .split('\n')
    .map((l) => l.replace(/#.*$/, '').trim())
    .filter(Boolean)

  let difficulty: Difficulty = 1
  const columnSpecs = new Map<number, { faceDown: number; tokens: string[] }>()
  let stockCount = 0
  let foundCount = 0

  for (const line of lines) {
    const diff = /^difficulty:\s*([124])$/.exec(line)
    if (diff) {
      difficulty = Number(diff[1]) as Difficulty
      continue
    }
    const col = /^c(\d):\s*(?:\[(\d+)\]\s*)?(.*)$/.exec(line)
    if (col) {
      const index = Number(col[1])
      const faceDown = col[2] ? Number(col[2]) : 0
      const rest = (col[3] ?? '').trim()
      const tokens = rest === '-' || rest === '' ? [] : rest.split(/\s+/)
      columnSpecs.set(index, { faceDown, tokens })
      continue
    }
    const stock = /^stock:\s*(\d+)$/.exec(line)
    if (stock) {
      stockCount = Number(stock[1])
      continue
    }
    const found = /^found:\s*(\d+)$/.exec(line)
    if (found) {
      foundCount = Number(found[1])
      continue
    }
    throw new Error(`unrecognized board line: ${line}`)
  }

  const pool = buildDeck(difficulty)
  const used = new Set<string>()

  const take = (suit: Suit, rank: Rank, faceUp: boolean): Card => {
    const card = pool.find((c) => c.suit === suit && c.rank === rank && !used.has(c.id))
    if (!card) throw new Error(`no remaining ${suit}${rank}`)
    used.add(card.id)
    return withFace(card, faceUp)
  }

  const takeAny = (faceUp: boolean): Card => {
    const card = pool.find((c) => !used.has(c.id))
    if (!card) throw new Error('card pool exhausted')
    used.add(card.id)
    return withFace(card, faceUp)
  }

  const columns: Card[][] = Array.from({ length: 10 }, () => [])
  for (let i = 0; i < 10; i++) {
    const spec = columnSpecs.get(i) ?? { faceDown: 0, tokens: [] }
    const column = columns[i]
    if (!column) throw new Error('column missing')
    for (let d = 0; d < spec.faceDown; d++) {
      column.push(takeAny(false))
    }
    for (const token of spec.tokens) {
      const { suit, rank } = parseToken(token)
      column.push(take(suit, rank, true))
    }
  }

  const foundations: Card[][] = []
  const suitOrder: Suit[] = ['S', 'H', 'D', 'C']
  for (let f = 0; f < foundCount; f++) {
    const suit = suitOrder.find((s) => canTakeRun(pool, used, s))
    if (!suit) throw new Error(`cannot build foundation ${f} from remaining pool`)
    foundations.push(takeRun(pool, used, suit))
  }

  if (stockCount % 10 !== 0 || stockCount > 50) {
    throw new Error(`stock must be multiple of 10 between 0 and 50, got ${stockCount}`)
  }

  const remaining = pool.filter((c) => !used.has(c.id))
  if (remaining.length < stockCount) {
    throw new Error(
      `not enough cards for stock: need ${stockCount}, have ${remaining.length}`,
    )
  }

  const stockCards = remaining.slice(0, stockCount).map((c) => withFace(c, true))
  const leftover = remaining.slice(stockCount)
  if (leftover.length > 0) {
    // Bury under the highest-index non-empty column so empty columns stay empty
    // and low-index fixtures used in tests remain precise.
    let target = -1
    for (let i = 9; i >= 0; i--) {
      if ((columns[i]?.length ?? 0) > 0) {
        target = i
        break
      }
    }
    if (target < 0) {
      const buried = leftover.slice(0, -1).map((c) => withFace(c, false))
      const top = leftover[leftover.length - 1]!
      columns[0] = [...buried, withFace(top, true)]
    } else {
      const column = columns[target]!
      columns[target] = [...leftover.map((c) => withFace(c, false)), ...column]
    }
  }

  const stock: Card[][] = []
  for (let i = 0; i < stockCount; i += 10) {
    stock.push(stockCards.slice(i, i + 10))
  }

  return {
    difficulty,
    columns,
    stock,
    foundations,
    moveCount: options.moveCount ?? 0,
    score: options.score ?? INITIAL_SCORE,
  }
}

export function printBoard(state: GameState): string {
  const lines: string[] = [`difficulty: ${state.difficulty}`]
  for (let i = 0; i < state.columns.length; i++) {
    const column = state.columns[i]!
    if (column.length === 0) {
      lines.push(`c${i}: -`)
      continue
    }
    let faceDown = 0
    while (faceDown < column.length && !column[faceDown]!.faceUp) faceDown += 1
    const up = column.slice(faceDown).map(formatCardToken).join(' ')
    const prefix = faceDown > 0 ? `[${faceDown}] ` : ''
    lines.push(`c${i}: ${prefix}${up}`.trimEnd())
  }
  lines.push(`stock: ${state.stock.length * 10}`)
  lines.push(`found: ${state.foundations.length}`)
  return lines.join('\n')
}

/** Helper for tests that need an explicit face-up sequence without pool logic. */
export function cardsFromTokens(tokens: string[], faceUp = true): Card[] {
  return tokens.map((token, copy) => {
    const suit = token[0] as Suit
    const rank = parseRankLabel(token.slice(1))
    return makeCard(suit, rank, copy, faceUp)
  })
}
