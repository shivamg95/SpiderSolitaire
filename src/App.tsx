import { useGameStore } from './store/gameStore'
import { getRankName, SUIT_SYMBOLS } from './types'

function App() {
  const { columns, stock, foundations, moves, gameStatus, gameMode, newGame, moveCard, dealStock, undo, redo, hint, hasUndo, hasRedo } = useGameStore()

  return (
    <div className="h-screen flex flex-col text-white p-4">
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <button
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors"
          onClick={() => newGame('easy')}
        >
          New Game (Easy)
        </button>
        <button
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors"
          onClick={() => newGame('medium')}
        >
          New Game (Medium)
        </button>
        <button
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors"
          onClick={() => newGame('hard')}
        >
          New Game (Hard)
        </button>
        <button
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors"
          onClick={dealStock}
        >
          Deal Stock ({stock.length} left)
        </button>
        <button
          className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors disabled:opacity-40"
          onClick={undo}
          disabled={!hasUndo()}
        >
          Undo
        </button>
        <button
          className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors disabled:opacity-40"
          onClick={redo}
          disabled={!hasRedo()}
        >
          Redo
        </button>
        <button
          className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg transition-colors"
          onClick={hint}
        >
          Hint
        </button>
        <span className="text-sm text-gray-400">
          Moves: {moves} | Foundations: {foundations}/8 | Status: {gameStatus} | Mode: {gameMode}
        </span>
      </div>

      {gameStatus === 'idle' ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-400 text-lg">Select a game mode to start</p>
        </div>
      ) : (
        <div className="flex-1 flex gap-1 overflow-hidden">
          {columns.map((col, colIdx) => (
            <div
              key={colIdx}
              className="flex-1 flex flex-col items-center min-w-0"
            >
              <div className="text-xs text-gray-500 mb-1">#{colIdx + 1}</div>
              <div className="flex-1 w-full relative">
                {col.map((card, cardIdx) => (
                  <div
                    key={card.id}
                    className={`
                      absolute left-0 w-full h-10 rounded-md border text-xs flex items-center justify-center transition-all cursor-pointer
                      ${card.faceUp
                        ? card.suit === 'hearts' || card.suit === 'diamonds'
                          ? 'bg-white/90 text-red-500 border-red-300 hover:border-yellow-400'
                          : 'bg-white/90 text-gray-900 border-gray-300 hover:border-yellow-400'
                        : 'bg-gradient-to-br from-blue-900 to-purple-900 border-blue-700 text-transparent'
                      }
                    `}
                    style={{
                      top: `${cardIdx * 12}px`,
                      zIndex: cardIdx,
                    }}
                    onClick={() => {
                      if (!card.faceUp) return
                      if (colIdx < 9) {
                        moveCard(colIdx, colIdx + 1, col.length - cardIdx)
                      }
                    }}
                  >
                    {card.faceUp && (
                      <span className={card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-500' : 'text-gray-900'}>
                        {getRankName(card.rank)}{SUIT_SYMBOLS[card.suit]}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default App
