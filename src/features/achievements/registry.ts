import type { GameResult, StatsSummary } from '@/features/stats/computeStats'

export interface Achievement {
  readonly id: string
  readonly title: string
  readonly description: string
  readonly test: (
    result: GameResult,
    stats: StatsSummary,
    history: readonly GameResult[],
  ) => boolean
}

export const ACHIEVEMENTS: readonly Achievement[] = [
  {
    id: 'first-win',
    title: 'First Blood',
    description: 'Win your first game',
    test: (r) => r.won,
  },
  {
    id: 'win-1suit',
    title: 'One Suit Master',
    description: 'Win a 1-suit game',
    test: (r) => r.won && r.difficulty === 1,
  },
  {
    id: 'win-2suit',
    title: 'Two Suit Master',
    description: 'Win a 2-suit game',
    test: (r) => r.won && r.difficulty === 2,
  },
  {
    id: 'win-4suit',
    title: 'Four Suit Master',
    description: 'Win a 4-suit game',
    test: (r) => r.won && r.difficulty === 4,
  },
  {
    id: 'clean-hints',
    title: 'No Hints Needed',
    description: 'Win without using hints',
    test: (r) => r.won && r.hintsUsed === 0,
  },
  {
    id: 'clean-undos',
    title: 'No Take-Backs',
    description: 'Win without undoing',
    test: (r) => r.won && r.undosUsed === 0,
  },
  {
    id: 'speed-1suit',
    title: 'Speed Demon',
    description: 'Win 1-suit in under 4 minutes',
    test: (r) => r.won && r.difficulty === 1 && r.elapsedMs < 4 * 60_000,
  },
  {
    id: 'under-120',
    title: 'Efficient',
    description: 'Win in under 120 moves',
    test: (r) => r.won && r.moves < 120,
  },
  {
    id: 'streak-5',
    title: 'On a Roll',
    description: 'Win 5 games in a row',
    test: (_r, stats) => stats.currentStreak >= 5,
  },
  {
    id: 'few-deals',
    title: 'Stock Saver',
    description: 'Win using at most 2 stock deals',
    test: (r) => r.won && r.stockDealsUsed <= 2,
  },
]

export function unlockedAchievements(
  result: GameResult,
  stats: StatsSummary,
  history: readonly GameResult[],
  already: ReadonlySet<string>,
): string[] {
  return ACHIEVEMENTS.filter(
    (a) => !already.has(a.id) && a.test(result, stats, history),
  ).map((a) => a.id)
}
