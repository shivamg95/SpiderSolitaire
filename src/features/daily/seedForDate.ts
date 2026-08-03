import type { Difficulty } from '@/engine/types'

/** Stable string hash → seed for daily challenge. */
export function seedForDate(dateISO: string, difficulty: Difficulty): number {
  const input = `spider-daily:${dateISO}:d${difficulty}`
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function todayISO(d = new Date()): string {
  return d.toISOString().slice(0, 10)
}
