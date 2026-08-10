import { Panel } from '@/components/panels/Panel'
import { useGameStore } from '@/state/gameStore'
import { useUiStore } from '@/state/uiStore'
import './SettingsPanel.css'

export function WinPanel() {
  const open = useUiStore((s) => s.openPanel === 'win')
  const closePanel = useUiStore((s) => s.closePanel)
  const score = useGameStore((s) => s.handle.state.score)
  const moves = useGameStore((s) => s.handle.state.moveCount)
  const newGame = useGameStore((s) => s.newGame)
  const restartDeal = useGameStore((s) => s.restartDeal)

  return (
    <Panel
      title="You win"
      open={open}
      onClose={closePanel}
      className="panel--win"
      footer={
        <>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => {
              closePanel()
              newGame()
            }}
          >
            New game
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => {
              closePanel()
              restartDeal()
            }}
          >
            Replay deal
          </button>
        </>
      }
    >
      <p className="win-copy">
        Score <strong>{score}</strong> in <strong>{moves}</strong> moves.
      </p>
    </Panel>
  )
}
