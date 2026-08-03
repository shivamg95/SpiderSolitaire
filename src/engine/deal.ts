import { buildDeck, withFace } from './cards'
import { mulberry32, shuffle } from './rng'
import { COLUMN_COUNT, type Difficulty, type GameState, INITIAL_SCORE } from './types'

const COLUMN_DEAL_COUNTS = [6, 6, 6, 6, 5, 5, 5, 5, 5, 5] as const

export function deal(seed: number, difficulty: Difficulty): GameState {
  const rng = mulberry32(seed)
  const deck = shuffle(buildDeck(difficulty), rng)
  const columns: (typeof deck)[] = Array.from({ length: COLUMN_COUNT }, () => [])
  let cursor = 0

  for (let col = 0; col < COLUMN_COUNT; col++) {
    const count = COLUMN_DEAL_COUNTS[col]!
    const column = columns[col]!
    for (let i = 0; i < count; i++) {
      const card = deck[cursor]!
      cursor += 1
      column.push(withFace(card, i === count - 1))
    }
  }

  const remaining = deck.slice(cursor)
  const stock: (typeof deck)[] = []
  for (let i = 0; i < 5; i++) {
    stock.push(remaining.slice(i * 10, i * 10 + 10).map((c) => withFace(c, true)))
  }

  return {
    difficulty,
    columns,
    stock,
    foundations: [],
    moveCount: 0,
    score: INITIAL_SCORE,
  }
}
