import { useId } from 'react'
import { useSettingsStore } from '@/state/settingsStore'
import { useGameStore } from '@/state/gameStore'
import type { Difficulty } from '@/engine/types'
import {
  APPEARANCES,
  THEME_LABELS,
  THEMES,
  type AppearanceId,
  type ThemeId,
} from '@/theme/themes'
import { Panel } from '@/components/panels/Panel'
import { SegmentedControl, Switch } from '@/components/panels/controls'
import { useUiStore } from '@/state/uiStore'
import './SettingsPanel.css'

const APPEARANCE_LABELS: Record<AppearanceId, string> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
}

const DIFFICULTY_OPTIONS = [
  { value: 1 as Difficulty, label: '1 suit' },
  { value: 2 as Difficulty, label: '2 suits' },
  { value: 4 as Difficulty, label: '4 suits' },
]

const APPEARANCE_OPTIONS = APPEARANCES.map((a) => ({
  value: a,
  label: APPEARANCE_LABELS[a],
}))

export function SettingsPanel() {
  const open = useUiStore((s) => s.openPanel === 'settings')
  const closePanel = useUiStore((s) => s.closePanel)
  const openPanelById = useUiStore((s) => s.openPanelById)
  const difficulty = useSettingsStore((s) => s.difficulty)
  const setDifficulty = useSettingsStore((s) => s.setDifficulty)
  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)
  const appearance = useSettingsStore((s) => s.appearance)
  const setAppearance = useSettingsStore((s) => s.setAppearance)
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

  const dealEmptyId = useId()
  const undoPenaltyId = useId()
  const reducedMotionId = useId()
  const soundId = useId()

  return (
    <Panel
      title="Settings"
      open={open}
      onClose={closePanel}
      footer={
        <>
          <button type="button" className="btn btn--primary" onClick={() => newGame()}>
            New game
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => restartDeal()}>
            Restart deal
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => {
              openPanelById('share')
            }}
          >
            Share deal
          </button>
        </>
      }
    >
      <section className="settings-group" aria-labelledby="settings-game-title">
        <h3 className="settings-group__title" id="settings-game-title">
          Game
        </h3>
        <div className="settings-field">
          <span className="settings-field__label">Difficulty</span>
          <SegmentedControl
            ariaLabel="Difficulty"
            options={DIFFICULTY_OPTIONS}
            value={difficulty}
            onChange={(d) => {
              setDifficulty(d)
              newGame({ difficulty: d })
            }}
          />
          <p className="settings-field__caption">Changing difficulty deals a new game.</p>
        </div>
      </section>

      <section className="settings-group" aria-labelledby="settings-appearance-title">
        <h3 className="settings-group__title" id="settings-appearance-title">
          Appearance
        </h3>
        <div className="settings-field">
          <span className="settings-field__label">Mode</span>
          <SegmentedControl
            ariaLabel="Appearance"
            options={APPEARANCE_OPTIONS}
            value={appearance}
            onChange={(a) => {
              setAppearance(a)
            }}
          />
        </div>
        <div className="settings-field">
          <span className="settings-field__label">Theme</span>
          <div className="theme-swatches" role="radiogroup" aria-label="Theme">
            {THEMES.map((t) => {
              const active = theme === t
              return (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={
                    active ? 'theme-swatch theme-swatch--active' : 'theme-swatch'
                  }
                  data-theme-preview={t}
                  onClick={() => {
                    setTheme(t as ThemeId)
                  }}
                >
                  <span className="theme-swatch__preview">
                    <span className="theme-swatch__accent" />
                    <span className="theme-swatch__check" aria-hidden="true">
                      ✓
                    </span>
                  </span>
                  <span className="theme-swatch__name">{THEME_LABELS[t]}</span>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      <section className="settings-group" aria-labelledby="settings-gameplay-title">
        <h3 className="settings-group__title" id="settings-gameplay-title">
          Gameplay
        </h3>
        <div className="switch-list">
          <div className="switch-row">
            <div className="switch-row__copy">
              <label className="switch-row__label" htmlFor={dealEmptyId}>
                Allow deal with empty column
              </label>
              <span className="switch-row__hint">
                Deal from the stock even when a tableau column is empty.
              </span>
            </div>
            <Switch
              id={dealEmptyId}
              checked={allowDealWithEmptyColumn}
              onChange={setAllowDealWithEmptyColumn}
              ariaLabel="Allow deal with empty column"
            />
          </div>
          <div className="switch-row">
            <div className="switch-row__copy">
              <label className="switch-row__label" htmlFor={undoPenaltyId}>
                Undo penalty
              </label>
              <span className="switch-row__hint">
                Subtract points when undoing a move.
              </span>
            </div>
            <Switch
              id={undoPenaltyId}
              checked={undoPenalty}
              onChange={setUndoPenalty}
              ariaLabel="Undo penalty"
            />
          </div>
          <div className="switch-row">
            <div className="switch-row__copy">
              <label className="switch-row__label" htmlFor={reducedMotionId}>
                Reduced motion
              </label>
              <span className="switch-row__hint">
                Minimize animations and transitions.
              </span>
            </div>
            <Switch
              id={reducedMotionId}
              checked={reducedMotion}
              onChange={setReducedMotion}
              ariaLabel="Reduced motion"
            />
          </div>
          <div className="switch-row">
            <div className="switch-row__copy">
              <label className="switch-row__label" htmlFor={soundId}>
                Sound effects
              </label>
              <span className="switch-row__hint">
                Play audio feedback while you play.
              </span>
            </div>
            <Switch
              id={soundId}
              checked={!soundMuted}
              onChange={(on) => {
                setSoundMuted(!on)
              }}
              ariaLabel="Sound effects"
            />
          </div>
        </div>
      </section>
    </Panel>
  )
}
