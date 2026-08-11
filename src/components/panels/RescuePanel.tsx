import { Panel } from '@/components/panels/Panel'
import { useGameStore } from '@/state/gameStore'
import { useUiStore } from '@/state/uiStore'
import '@/components/chrome/RescueBanner.css'

/**
 * The "I'm stuck" flow. Reports how far back the last winnable position was and
 * offers to go there, keeping the discarded moves redoable.
 *
 * There is always an answer to give: the deal came from the verified pool, so
 * move 0 is winnable by construction and the search has a floor.
 */
export function RescuePanel() {
  const open = useUiStore((s) => s.openPanel === 'rescue')
  const searching = useUiStore((s) => s.rescueSearching)
  const plan = useUiStore((s) => s.rescuePlan)
  const closePanel = useUiStore((s) => s.closePanel)
  const cancelRescue = useGameStore((s) => s.cancelRescue)
  const rewindTo = useGameStore((s) => s.rewindTo)
  const restartDeal = useGameStore((s) => s.restartDeal)
  const moveCount = useGameStore((s) => s.handle.moveLog.length)

  const close = (): void => {
    cancelRescue()
    closePanel()
  }

  return (
    <Panel
      title="Rescue this deal"
      open={open}
      onClose={close}
      footer={
        <>
          {plan && plan.movesBack > 0 ? (
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                rewindTo(plan.index)
              }}
            >
              Rewind {plan.movesBack} {plan.movesBack === 1 ? 'move' : 'moves'}
            </button>
          ) : null}
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
      }
    >
      <p className="rescue-panel__lead">
        This deal is winnable — the position on the board is not. Looking back through
        your {moveCount} {moveCount === 1 ? 'move' : 'moves'} for the last one that could
        still be won.
      </p>

      {searching ? (
        <div className="rescue-panel__status" role="status" aria-live="polite">
          <span className="rescue-panel__spinner" aria-hidden />
          Searching…
        </div>
      ) : null}

      {!searching && plan ? (
        <div className="rescue-panel__result" role="status" aria-live="polite">
          {plan.movesBack === 0 ? (
            <>
              <strong>Already at the last winnable position</strong>
              <span>Nothing to rewind — the win is still in front of you.</span>
            </>
          ) : (
            <>
              <strong>
                {plan.movesBack} {plan.movesBack === 1 ? 'move' : 'moves'} back
              </strong>
              <span>
                {plan.index === 0
                  ? 'The whole game so far; rewinding returns you to the fresh deal.'
                  : `Rewinding puts you back at move ${plan.index}.`}{' '}
                The moves you undo stay redoable.
              </span>
            </>
          )}
        </div>
      ) : null}
    </Panel>
  )
}
