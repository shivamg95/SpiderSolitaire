import { useSettingsStore } from '@/state/settingsStore'
import { useGameStore } from '@/state/gameStore'
import type { Difficulty } from '@/engine/types'
import { THEMES, type ThemeId } from '@/theme/themes'
import { Panel } from '@/components/panels/Panel'
import { useUiStore } from '@/state/uiStore'

export function SettingsPanel() {
  const open = useUiStore((s) => s.openPanel === 'settings')
  const closePanel = useUiStore((s) => s.closePanel)
  const openPanelById = useUiStore((s) => s.openPanelById)
  const difficulty = useSettingsStore((s) => s.difficulty)
  const setDifficulty = useSettingsStore((s) => s.setDifficulty)
  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)
  const allowDealWithEmptyColumn = useSettingsStore((s) => s.allowDealWithEmptyColumn)
  const setAllowDealWithEmptyColumn = useSettingsStore(
    (s) => s.setAllowDealWithEmptyColumn,
  )
  const undoPenalty = useSettingsStore((s) => s.undoPenalty)
  const setUndoPenalty = useSettingsStore((s) => s.setUndoPenalty)
  const reducedMotion = useSettingsStore((s) => s.reducedMotion)
  const setReducedMotion = useSettingsStore((s) => s.setReducedMotion)
  const soundMuted = useSettingsStore((s) => s.soundMuted)
  const setSoundMuted = useSettingsStore((s) => s.setSoundMuted)
  const newGame = useGameStore((s) => s.newGame)
  const restartDeal = useGameStore((s) => s.restartDeal)

  return (
    <Panel title="Settings" open={open} onClose={closePanel}>
      <label className="settings-row">
        <span>Difficulty</span>
        <select
          value={difficulty}
          onChange={(e) => {
            const d = Number(e.target.value) as Difficulty
            setDifficulty(d)
            newGame({ difficulty: d })
          }}
        >
          <option value={1}>1 suit</option>
          <option value={2}>2 suits</option>
          <option value={4}>4 suits</option>
        </select>
      </label>
      <label className="settings-row">
        <span>Theme</span>
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
      <label className="settings-row settings-row--check">
        <input
          type="checkbox"
          checked={allowDealWithEmptyColumn}
          onChange={(e) => {
            setAllowDealWithEmptyColumn(e.target.checked)
          }}
        />
        <span>Allow deal with empty column</span>
      </label>
      <label className="settings-row settings-row--check">
        <input
          type="checkbox"
          checked={undoPenalty}
          onChange={(e) => {
            setUndoPenalty(e.target.checked)
          }}
        />
        <span>Undo penalty</span>
      </label>
      <label className="settings-row settings-row--check">
        <input
          type="checkbox"
          checked={reducedMotion}
          onChange={(e) => {
            setReducedMotion(e.target.checked)
          }}
        />
        <span>Reduced motion</span>
      </label>
      <label className="settings-row settings-row--check">
        <input
          type="checkbox"
          checked={soundMuted}
          onChange={(e) => {
            setSoundMuted(e.target.checked)
          }}
        />
        <span>Mute sound</span>
      </label>
      <div className="settings-actions">
        <button type="button" onClick={() => restartDeal()}>
          Restart deal
        </button>
        <button type="button" onClick={() => newGame()}>
          New game
        </button>
        <button
          type="button"
          onClick={() => {
            openPanelById('share')
          }}
        >
          Share deal
        </button>
      </div>
    </Panel>
  )
}
