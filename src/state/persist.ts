import { get, set, del, createStore } from 'idb-keyval'
import type { SaveV1 } from '@/engine/serialize'
import { migrateSave } from '@/engine/serialize'

export type PersistKey =
  | 'settings'
  | 'currentGame'
  | 'stats'
  | 'achievements'
  | 'daily'
  | 'replays'
  | 'verifiedSeeds'

const store = createStore('spider-solitaire', 'kv')

export interface ReplayEntry {
  readonly seed: number
  readonly difficulty: 1 | 2 | 4
  readonly moveLog: string
  readonly won: boolean
  readonly savedAt: number
}

const REPLAY_CAP = 20

let debounceTimer: ReturnType<typeof setTimeout> | null = null
let pendingGame: SaveV1 | null = null

export async function loadKey<T>(key: PersistKey): Promise<T | undefined> {
  return get<T>(key, store)
}

export async function saveKey(key: PersistKey, value: unknown): Promise<void> {
  await set(key, value, store)
}

export async function clearKey(key: PersistKey): Promise<void> {
  await del(key, store)
}

export async function loadCurrentGame(): Promise<SaveV1 | undefined> {
  const raw = await loadKey<unknown>('currentGame')
  if (raw === undefined) return undefined
  return migrateSave(raw)
}

export function scheduleGameSave(game: SaveV1, delayMs = 400): void {
  pendingGame = game
  if (debounceTimer !== null) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    void flushGameSave()
  }, delayMs)
}

export async function flushGameSave(): Promise<void> {
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  if (!pendingGame) return
  const game = pendingGame
  pendingGame = null
  await saveKey('currentGame', game)
}

export function bindAutosaveLifecycle(): () => void {
  const flush = () => {
    void flushGameSave()
  }
  document.addEventListener('visibilitychange', flush)
  window.addEventListener('pagehide', flush)
  return () => {
    document.removeEventListener('visibilitychange', flush)
    window.removeEventListener('pagehide', flush)
  }
}

export async function pushReplay(entry: ReplayEntry): Promise<void> {
  const existing = (await loadKey<ReplayEntry[]>('replays')) ?? []
  const next = [entry, ...existing].slice(0, REPLAY_CAP)
  await saveKey('replays', next)
}

export async function listReplays(): Promise<ReplayEntry[]> {
  return (await loadKey<ReplayEntry[]>('replays')) ?? []
}

/** Test helper */
export function __resetPersistForTests(): void {
  if (debounceTimer !== null) clearTimeout(debounceTimer)
  debounceTimer = null
  pendingGame = null
}
