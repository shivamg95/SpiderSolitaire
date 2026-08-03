export interface GameResult {
  readonly seed: number
  readonly difficulty: 1 | 2 | 4
  readonly won: boolean
  readonly moves: number
  readonly elapsedMs: number
  readonly score: number
  readonly foundations: number
  readonly hintsUsed: number
  readonly undosUsed: number
  readonly stockDealsUsed: number
  readonly at: number
}

export interface StatsSummary {
  readonly games: number
  readonly wins: number
  readonly winRate: number
  readonly currentStreak: number
  readonly longestStreak: number
  readonly bestTimeMs: number | null
  readonly avgMoves: number | null
  readonly totalFoundations: number
}

export function computeStats(results: readonly GameResult[]): StatsSummary {
  const games = results.length
  const wins = results.filter((r) => r.won).length
  let currentStreak = 0
  let longestStreak = 0
  let run = 0
  for (const r of results) {
    if (r.won) {
      run += 1
      longestStreak = Math.max(longestStreak, run)
    } else {
      run = 0
    }
  }
  for (const r of results) {
    if (!r.won) break
    currentStreak += 1
  }
  const won = results.filter((r) => r.won)
  const bestTimeMs = won.length === 0 ? null : Math.min(...won.map((r) => r.elapsedMs))
  const avgMoves =
    won.length === 0 ? null : won.reduce((s, r) => s + r.moves, 0) / won.length
  return {
    games,
    wins,
    winRate: games === 0 ? 0 : wins / games,
    currentStreak,
    longestStreak,
    bestTimeMs,
    avgMoves,
    totalFoundations: results.reduce((s, r) => s + r.foundations, 0),
  }
}
