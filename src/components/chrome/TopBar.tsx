import clsx from 'clsx'
import { useEffect, useState } from 'react'
import { useGameStore } from '@/state/gameStore'
import { useSettingsStore } from '@/state/settingsStore'
import { THEMES, type ThemeId } from '@/theme/themes'
import './TopBar.css'

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, '0')}`
}

export function TopBar() {
  const handle = useGameStore((s) => s.handle)
  const startedAt = useGameStore((s) => s.startedAt)
  const undo = useGameStore((s) => s.undo)
  const redo = useGameStore((s) => s.redo)
  const canUndo = useGameStore((s) => s.canUndo)
  const canRedo = useGameStore((s) => s.canRedo)
  const requestHint = useGameStore((s) => s.requestHint)
  const newGame = useGameStore((s) => s.newGame)
  const dealStock = useGameStore((s) => s.dealStock)
  const canDealStock = useGameStore((s) => s.canDealStock)
  const dealsLeft = useGameStore((s) => s.dealsLeft)
  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)
  const difficulty = useSettingsStore((s) => s.difficulty)
  const setDifficulty = useSettingsStore((s) => s.setDifficulty)
  const soundMuted = useSettingsStore((s) => s.soundMuted)
  const toggleMute = useSettingsStore((s) => s.toggleMute)

  const [now, setNow] = useState(() => startedAt)
  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(Date.now())
    }, 1000)
    return () => {
      window.clearInterval(id)
    }
  }, [startedAt])

  const elapsed = Math.max(0, now - startedAt)

  return (
    <header className="top-bar">
      <div className="top-bar__brand">
        <h1>Spider</h1>
      </div>
      <div className="top-bar__stats" aria-live="polite">
        <span>Score {handle.state.score}</span>
        <span>Moves {handle.state.moveCount}</span>
        <span>{formatTime(elapsed)}</span>
        <span>Deals {dealsLeft()}</span>
      </div>
      <div className="top-bar__actions">
        <button type="button" onClick={() => undo()} disabled={!canUndo()}>
          Undo
        </button>
        <button type="button" onClick={() => redo()} disabled={!canRedo()}>
          Redo
        </button>
        <button type="button" onClick={() => requestHint()}>
          Hint
        </button>
        <button type="button" onClick={() => dealStock()} disabled={!canDealStock()}>
          Deal
        </button>
        <button type="button" onClick={() => newGame()}>
          New
        </button>
        <label className="top-bar__select">
          <span className="sr-only">Difficulty</span>
          <select
            value={difficulty}
            onChange={(e) => {
              const d = Number(e.target.value) as 1 | 2 | 4
              setDifficulty(d)
              newGame({ difficulty: d })
            }}
          >
            <option value={1}>1 suit</option>
            <option value={2}>2 suit</option>
            <option value={4}>4 suit</option>
          </select>
        </label>
        <label className="top-bar__select">
          <span className="sr-only">Theme</span>
          <select
            value={theme}
            onChange={(e) => {
              setTheme(e.target.value as ThemeId)
            }}
          >
            {THEMES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className={clsx(soundMuted && 'is-muted')}
          onClick={() => {
            toggleMute()
          }}
        >
          {soundMuted ? 'Unmute' : 'Mute'}
        </button>
      </div>
    </header>
  )
}
