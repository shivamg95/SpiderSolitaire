import { create } from 'zustand'
import type { GameMode } from '../types'

const STATS_KEY = 'spider-solitaire-stats'

interface DifficultyStats {
  gamesPlayed: number
  gamesWon: number
  currentStreak: number
  bestStreak: number
  fewestMoves: number | null
  fastestTime: number | null
  totalMoves: number
  totalTime: number
}

type StatsState = Record<GameMode, DifficultyStats> & {
  recordGame: (mode: GameMode, won: boolean, moves: number, timeMs: number) => void
  loadStats: () => void
}

const DEFAULT_STATS: DifficultyStats = {
  gamesPlayed: 0,
  gamesWon: 0,
  currentStreak: 0,
  bestStreak: 0,
  fewestMoves: null,
  fastestTime: null,
  totalMoves: 0,
  totalTime: 0,
}

function loadFromStorage(): Record<GameMode, DifficultyStats> {
  try {
    const raw = localStorage.getItem(STATS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return {
    easy: { ...DEFAULT_STATS },
    medium: { ...DEFAULT_STATS },
    hard: { ...DEFAULT_STATS },
  }
}

function saveToStorage(stats: Record<GameMode, DifficultyStats>) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats))
  } catch {}
}

export const useStatsStore = create<StatsState>((set, get) => ({
  ...loadFromStorage(),

  recordGame: (mode, won, moves, timeMs) => {
    const stats = { ...get() }
    const current = { ...(stats[mode] || DEFAULT_STATS) }

    current.gamesPlayed++
    current.totalMoves += moves
    current.totalTime += timeMs

    if (won) {
      current.gamesWon++
      current.currentStreak++
      if (current.currentStreak > current.bestStreak) {
        current.bestStreak = current.currentStreak
      }
      if (current.fewestMoves === null || moves < current.fewestMoves) {
        current.fewestMoves = moves
      }
      if (current.fastestTime === null || timeMs < current.fastestTime) {
        current.fastestTime = timeMs
      }
    } else {
      current.currentStreak = 0
    }

    const updated = { ...stats, [mode]: current }
    set(updated)
    saveToStorage(updated)
  },

  loadStats: () => {
    set(loadFromStorage())
  },
}))

export function getWinRate(stats: DifficultyStats): number {
  if (stats.gamesPlayed === 0) return 0
  return Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
}

export function getAvgMoves(stats: DifficultyStats): number {
  if (stats.gamesPlayed === 0) return 0
  return Math.round(stats.totalMoves / stats.gamesPlayed)
}

export function formatTime(ms: number): string {
  const secs = Math.floor(ms / 1000)
  const mins = Math.floor(secs / 60)
  const remainingSecs = secs % 60
  return `${mins}:${remainingSecs.toString().padStart(2, '0')}`
}
