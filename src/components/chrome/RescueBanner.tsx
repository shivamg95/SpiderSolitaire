import { useGameStore } from '@/state/gameStore'
import { useSettingsStore } from '@/state/settingsStore'
import { useUiStore } from '@/state/uiStore'
import './RescueBanner.css'

/**
 * The safety net's only voice.
 *
 * It appears exactly when the solver has *proven* the current position dead —
 * never on a merely hard one. That restraint is the whole point: a warning that
 * fires on every difficult board teaches players to ignore it, and then it is
 * worth nothing on the board where it is true.
 */
export function RescueBanner() {
  const safetyNet = useSettingsStore((s) => s.safetyNet)
  const winnability = useUiStore((s) => s.winnability)
  const dismissed = useUiStore((s) => s.warningDismissed)
  const dismissWarning = useUiStore((s) => s.dismissWarning)
  const openPanelById = useUiStore((s) => s.openPanelById)
  const undo = useGameStore((s) => s.undo)
  const canUndo = useGameStore((s) => s.canUndo)
  const moveCount = useGameStore((s) => s.handle.moveLog.length)
  const findRescue = useGameStore((s) => s.findRescue)

  if (!safetyNet || winnability !== 'lost' || dismissed) return null

  const fresh = moveCount === 0

  return (
    <div className="rescue-banner" role="status" aria-live="polite">
      <div className="rescue-banner__body">
        <span className="rescue-banner__title">
          {fresh ? 'This deal cannot be won' : 'That move made this deal unwinnable'}
        </span>
        <span className="rescue-banner__hint">
          {fresh
            ? 'Turn on "Winnable deals only" in settings to avoid this.'
            : 'Undo it, or rewind to the last position that could still be won.'}
        </span>
      </div>
      <div className="rescue-banner__actions">
        {canUndo() ? (
          <button
            type="button"
            className="btn btn--primary btn--compact"
            onClick={() => {
              undo()
            }}
          >
            Undo
          </button>
        ) : null}
        {!fresh ? (
          <button
            type="button"
            className="btn btn--ghost btn--compact"
            onClick={() => {
              openPanelById('rescue')
              findRescue()
            }}
          >
            Rescue
          </button>
        ) : null}
        <button
          type="button"
          className="rescue-banner__close"
          onClick={dismissWarning}
          aria-label="Dismiss"
          title="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  )
}
