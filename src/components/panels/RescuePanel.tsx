import { Panel } from '@/components/panels/Panel'
import { useGameStore } from '@/state/gameStore'
import { useUiStore } from '@/state/uiStore'
import '@/components/chrome/RescueBanner.css'

/**
 * The "I'm stuck" flow. Reports how far back the last winnable position was and
 * offers to go there — then shows the next proven winning move.
 */
export function RescuePanel() {
  const open = useUiStore((s) => s.openPanel === 'rescue')
  const searching = useUiStore((s) => s.rescueSearching)
  const plan = useUiStore((s) => s.rescuePlan)
  const closePanel = useUiStore((s) => s.closePanel)
  const cancelRescue = useGameStore((s) => s.cancelRescue)
  const rewindTo = useGameStore((s) => s.rewindTo)
  const restartDeal = useGameStore((s) => s.restartDeal)
  const requestHint = useGameStore((s) => s.requestHint)
  const moveCount = useGameStore((s) => s.handle.moveLog.length)

  const close = (): void => {
    cancelRescue()
    closePanel()
  }

  const hasLine = (plan?.continuation.length ?? 0) > 0
  const stillWinnable = plan?.movesBack === 0 && hasLine
  const needRewind = (plan?.movesBack ?? 0) > 0 && hasLine
  const unproven = plan != null && !searching && !hasLine

  return (
    <Panel
      title="Rescue this deal"
      open={open}
      onClose={close}
      footer={
        <>
          {searching ? (
            <button type="button" className="btn btn--ghost" onClick={close}>
              Keep playing
            </button>
          ) : null}

          {stillWinnable ? (
            <>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => {
                  closePanel()
                  requestHint()
                }}
              >
                Show next winning move
              </button>
              <button type="button" className="btn btn--ghost" onClick={close}>
                Keep playing
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => {
                  cancelRescue()
                  restartDeal()
                }}
              >
                Restart deal
              </button>
            </>
          ) : null}

          {needRewind && plan ? (
            <>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => {
                  rewindTo(plan.index)
                }}
              >
                Rewind {plan.movesBack} {plan.movesBack === 1 ? 'move' : 'moves'}
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => {
                  cancelRescue()
                  restartDeal()
                }}
              >
                Restart deal
              </button>
              <button type="button" className="btn btn--ghost" onClick={close}>
                Keep playing
              </button>
            </>
          ) : null}

          {unproven ? (
            <>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => {
                  cancelRescue()
                  restartDeal()
                }}
              >
                Restart deal
              </button>
              <button type="button" className="btn btn--ghost" onClick={close}>
                Keep playing
              </button>
            </>
          ) : null}
        </>
      }
    >
      <p className="rescue-panel__lead">
        {searching
          ? `Looking through your ${moveCount} ${moveCount === 1 ? 'move' : 'moves'} for a position that can still be won.`
          : stillWinnable
            ? 'This position can still be won. The next move on the winning line is ready.'
            : needRewind && plan
              ? plan.index === 0
                ? 'The last proven win is the fresh deal. Rewinding shows the next winning move from there.'
                : `Rewinding ${plan.movesBack} ${plan.movesBack === 1 ? 'move' : 'moves'} puts you back at a position that can still be won, then shows the next move.`
              : unproven
                ? 'Could not prove a win from this deal. Restart, or keep playing.'
                : `Looking through your ${moveCount} ${moveCount === 1 ? 'move' : 'moves'} for a position that can still be won.`}
      </p>

      {searching ? (
        <div className="rescue-panel__status" role="status" aria-live="polite">
          <span className="rescue-panel__spinner" aria-hidden />
          Searching…
        </div>
      ) : null}

      {!searching && plan ? (
        <div className="rescue-panel__result" role="status" aria-live="polite">
          {stillWinnable ? (
            <>
              <strong>Already at a winnable position</strong>
              <span>
                Nothing to rewind — show the next winning move, or keep playing.
              </span>
            </>
          ) : needRewind ? (
            <>
              <strong>
                {plan.movesBack} {plan.movesBack === 1 ? 'move' : 'moves'} back
              </strong>
              <span>
                {plan.index === 0
                  ? 'The whole game so far; rewinding returns you to the fresh deal.'
                  : `Rewinding puts you back at move ${plan.index}.`}{' '}
                The next winning move will be highlighted.
              </span>
            </>
          ) : (
            <>
              <strong>No proven winning line</strong>
              <span>
                The solver could not prove a win from this deal inside its budget.
              </span>
            </>
          )}
        </div>
      ) : null}
    </Panel>
  )
}
