import { useState, useCallback, useEffect } from 'react'
import { useGameStore } from '../store/gameStore'
import Starfield from './Starfield'
import Column from './Column'
import StockPile from './StockPile'
import Foundation from './Foundation'
import Controls from './Controls'
import { getValidRunFrom } from '../engine/rules'
import type { GameMode } from '../types'

export default function Board() {
  const {
    columns,
    stock,
    foundations,
    moves,
    gameMode,
    gameStatus,
    moveCard,
    dealStock,
    undo,
    redo,
    hint,
    hasUndo,
    hasRedo,
    newGame,
  } = useGameStore()

  const [selectedColumn, setSelectedColumn] = useState<number | null>(null)
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null)
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(gameMode || 'easy')

  useEffect(() => {
    if (gameMode) setSelectedMode(gameMode)
  }, [gameMode])

  useEffect(() => {
    setSelectedColumn(null)
    setSelectedCardIndex(null)
  }, [columns, stock])

  const handleCardClick = useCallback(
    (colIndex: number, cardIndex: number) => {
      if (gameStatus !== 'playing') return

      if (selectedColumn === null) {
        const srcCol = columns[colIndex]
        const runSize = getValidRunFrom(srcCol, cardIndex)
        if (runSize === 0) return

        setSelectedColumn(colIndex)
        setSelectedCardIndex(cardIndex)
      } else if (selectedColumn === colIndex) {
        if (selectedCardIndex === cardIndex) {
          setSelectedColumn(null)
          setSelectedCardIndex(null)
        } else {
          const srcCol = columns[colIndex]
          const runSize = getValidRunFrom(srcCol, cardIndex)
          if (runSize === 0) return
          setSelectedCardIndex(cardIndex)
        }
      } else {
        const srcCol = columns[selectedColumn]
        const startIndex = selectedCardIndex!
        const runSize = getValidRunFrom(srcCol, startIndex)
        moveCard(selectedColumn, colIndex, runSize)
      }
    },
    [selectedColumn, selectedCardIndex, columns, moveCard, gameStatus]
  )

  const handleColumnClick = useCallback(
    (colIndex: number) => {
      if (gameStatus !== 'playing') return

      if (selectedColumn !== null && selectedColumn !== colIndex) {
        const srcCol = columns[selectedColumn]
        const startIndex = selectedCardIndex!
        const runSize = getValidRunFrom(srcCol, startIndex)
        moveCard(selectedColumn, colIndex, runSize)
      }
    },
    [selectedColumn, selectedCardIndex, columns, moveCard, gameStatus]
  )

  const handleDeal = useCallback(() => {
    setSelectedColumn(null)
    setSelectedCardIndex(null)
    dealStock()
  }, [dealStock])

  const handleHint = useCallback(() => {
    const move = hint()
    if (move && move.fromColumn !== 'stock') {
      setSelectedColumn(null)
      setSelectedCardIndex(null)
    }
  }, [hint])

  return (
    <div className="fixed inset-0 flex flex-col bg-transparent text-white">
      <Starfield />

      <div className="relative z-10 flex flex-col h-full">
        {/* Top bar */}
        <header className="flex items-center justify-between px-3 py-2 bg-black/30 backdrop-blur-sm border-b border-indigo-800/20">
          <div className="flex items-center gap-4">
            <StockPile
              stockCount={stock.length}
              canDeal={stock.length >= 10 && gameStatus === 'playing'}
              onDeal={handleDeal}
            />
            {gameStatus !== 'idle' && (
              <Foundation completed={foundations} />
            )}
          </div>

          <Controls
            moves={moves}
            hasUndo={hasUndo()}
            hasRedo={hasRedo()}
            onUndo={undo}
            onRedo={redo}
            onHint={handleHint}
            onNewGame={newGame}
            selectedMode={selectedMode}
            onSelectMode={setSelectedMode}
          />

          <div className="text-[11px] text-indigo-400/60 font-mono min-w-[60px] text-right">
            {gameStatus === 'won' && (
              <span className="text-[#ffd700] font-bold">Victory!</span>
            )}
            {gameStatus === 'lost' && (
              <span className="text-red-400 font-bold">Game Over</span>
            )}
          </div>
        </header>

        {/* Game area */}
        <main className="flex-1 flex flex-col px-2 pt-2 pb-2 overflow-hidden">
          {gameStatus === 'idle' ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-[#00f0ff] to-[#b44dff] bg-clip-text text-transparent mb-4">
                  Spider Solitaire
                </h1>
                <p className="text-indigo-400/60 mb-6">Select a difficulty and start a new game</p>
                <div className="flex gap-3 justify-center">
                  {(['easy', 'medium', 'hard'] as GameMode[]).map((mode) => (
                    <button
                      key={mode}
                      className="px-6 py-3 rounded-lg bg-indigo-900/60 border border-indigo-700/50
                                 hover:border-[#00f0ff]/40 hover:shadow-[0_0_15px_rgba(0,240,255,0.1)]
                                 transition-all text-white font-medium"
                      onClick={() => newGame(mode)}
                    >
                      {mode === 'easy' ? '1 Suit (Easy)' : mode === 'medium' ? '2 Suits (Medium)' : '4 Suits (Hard)'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex min-h-0 overflow-x-auto">
              <div className="flex gap-1.5 min-w-full px-1">
                {columns.map((col, idx) => (
                  <Column
                    key={`col-${idx}`}
                    cards={col}
                    columnIndex={idx}
                    isSelected={selectedColumn === idx}
                    selectedCardIndex={selectedColumn === idx ? selectedCardIndex : null}
                    onCardClick={(cardIndex) => handleCardClick(idx, cardIndex)}
                    onColumnClick={() => handleColumnClick(idx)}
                  />
                ))}
              </div>
            </div>
          )}
        </main>

        {/* Selection indicator */}
        {selectedColumn !== null && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full
                          bg-black/60 backdrop-blur-sm border border-[#00f0ff]/30 text-xs text-[#00f0ff]">
            Selected column {selectedColumn + 1} — click destination column
          </div>
        )}
      </div>
    </div>
  )
}
