import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { useGameStore } from '../store/gameStore'
import Starfield from './Starfield'
import Column, { getPointerColumnIndex } from './Column'
import StockPile from './StockPile'
import Foundation from './Foundation'
import Controls from './Controls'
import { getValidRunFrom } from '../engine/rules'
import { getRankName, SUIT_SYMBOLS } from '../types'
import type { GameMode, Card as CardType } from '../types'

interface DragState {
  column: number
  cardIndex: number
  runSize: number
  startX: number
  startY: number
  currentX: number
  currentY: number
  card: CardType
}

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
  const [drag, setDrag] = useState<DragState | null>(null)
  const [dragTargetColumn, setDragTargetColumn] = useState<number | null>(null)

  const prevFoundations = useRef(foundations)
  const [clearParticles, setClearParticles] = useState<{ id: number; x: number; y: number }[]>([])

  useEffect(() => {
    if (gameMode) setSelectedMode(gameMode)
  }, [gameMode])

  useEffect(() => {
    setSelectedColumn(null)
    setSelectedCardIndex(null)
  }, [columns, stock])

  useEffect(() => {
    if (foundations > prevFoundations.current) {
      const count = foundations - prevFoundations.current
      const particles = Array.from({ length: count * 8 }, (_, i) => ({
        id: Date.now() + i,
        x: Math.random() * 60 + 20,
        y: Math.random() * 40 + 10,
      }))
      setClearParticles(prev => [...prev, ...particles])
      setTimeout(() => {
        setClearParticles(prev => prev.filter(p => !particles.includes(p)))
      }, 2000)
    }
    prevFoundations.current = foundations
  }, [foundations])

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!drag) return
    setDrag(prev => prev ? { ...prev, currentX: e.clientX, currentY: e.clientY } : null)

    const targetCol = getPointerColumnIndex(e.clientX)
    if (targetCol !== null && targetCol !== drag.column) {
      const targetColCards = columns[targetCol]
      if (targetColCards.length === 0) {
        setDragTargetColumn(targetCol)
      } else {
        const targetCard = targetColCards[targetColCards.length - 1]
        if (drag.card.rank === targetCard.rank - 1) {
          setDragTargetColumn(targetCol)
        } else {
          setDragTargetColumn(null)
        }
      }
    } else {
      setDragTargetColumn(null)
    }
  }, [drag, columns])

  const handlePointerUp = useCallback((e: PointerEvent) => {
    if (!drag) return

    const targetCol = getPointerColumnIndex(e.clientX)
    const dx = e.clientX - drag.startX
    const dy = e.clientY - drag.startY
    const movedEnough = Math.abs(dx) > 5 || Math.abs(dy) > 5

    if (movedEnough) {
      if (targetCol !== null && targetCol !== drag.column) {
        moveCard(drag.column, targetCol, drag.runSize)
        setSelectedColumn(null)
        setSelectedCardIndex(null)
      }
    } else {
      if (selectedColumn !== null && selectedColumn !== drag.column) {
        const srcCol = columns[selectedColumn]
        const startIndex = selectedCardIndex!
        const runSize = getValidRunFrom(srcCol, startIndex)
        moveCard(selectedColumn, drag.column, runSize)
      } else if (selectedColumn === drag.column && selectedCardIndex === drag.cardIndex) {
        setSelectedColumn(null)
        setSelectedCardIndex(null)
      } else {
        setSelectedColumn(drag.column)
        setSelectedCardIndex(drag.cardIndex)
      }
    }

    setDrag(null)
    setDragTargetColumn(null)
  }, [drag, moveCard, selectedColumn, selectedCardIndex, columns])

  useEffect(() => {
    if (drag) {
      window.addEventListener('pointermove', handlePointerMove)
      window.addEventListener('pointerup', handlePointerUp)
      return () => {
        window.removeEventListener('pointermove', handlePointerMove)
        window.removeEventListener('pointerup', handlePointerUp)
      }
    }
  }, [drag, handlePointerMove, handlePointerUp])

  const handleCardPointerDown = useCallback(
    (colIndex: number, cardIndex: number, e: React.PointerEvent) => {
      if (gameStatus !== 'playing') return

      const srcCol = columns[colIndex]
      const runSize = getValidRunFrom(srcCol, cardIndex)
      if (runSize === 0) return

      setDrag({
        column: colIndex,
        cardIndex,
        runSize,
        startX: e.clientX,
        startY: e.clientY,
        currentX: e.clientX,
        currentY: e.clientY,
        card: srcCol[cardIndex],
      })
    },
    [columns, gameStatus]
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

        <main className="flex-1 flex flex-col px-2 pt-2 pb-2 overflow-hidden relative">
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
            <LayoutGroup>
              <div className="flex-1 flex min-h-0 overflow-x-auto">
                <div className="flex gap-1.5 min-w-full px-1">
                  {columns.map((col, idx) => (
                    <Column
                      key={`col-${idx}`}
                      cards={col}
                      columnIndex={idx}
                      isDragTarget={dragTargetColumn === idx}
                      selectedCardIndex={selectedColumn === idx ? selectedCardIndex : null}
                      onCardPointerDown={(cardIndex, e) => handleCardPointerDown(idx, cardIndex, e)}
                      onColumnClick={() => handleColumnClick(idx)}
                    />
                  ))}
                </div>
              </div>
            </LayoutGroup>
          )}

          {/* Clear particles */}
          <AnimatePresence>
            {clearParticles.map((p) => (
              <motion.div
                key={p.id}
                className="absolute w-1.5 h-1.5 rounded-full pointer-events-none z-50"
                style={{
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  background: `radial-gradient(circle, #ffd700, ${['#00f0ff', '#b44dff', '#4dff88'][p.id % 3]})`,
                }}
                initial={{ scale: 0, opacity: 1 }}
                animate={{ scale: 2, opacity: 0, y: -40 - Math.random() * 30, x: (Math.random() - 0.5) * 40 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.2 + Math.random() * 0.8, ease: 'easeOut' }}
              />
            ))}
          </AnimatePresence>
        </main>

        {/* Drag ghost card */}
        <AnimatePresence>
          {drag && (
            <motion.div
              className="fixed pointer-events-none z-50 rounded-md overflow-hidden"
              style={{
                width: 64,
                aspectRatio: '5 / 7',
                left: drag.currentX - 32,
                top: drag.currentY - 45,
                background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                boxShadow: '0 8px 32px rgba(0,240,255,0.4), 0 0 20px rgba(180,77,255,0.3)',
              }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 0.95, scale: 1.03 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ type: 'spring', stiffness: 600, damping: 25 }}
            >
              <div className="absolute top-0.5 left-1 flex flex-col items-center leading-none">
                <span className={`text-[10px] font-bold ${drag.card.suit === 'hearts' || drag.card.suit === 'diamonds' ? 'text-red-500' : 'text-gray-900'}`}>
                  {getRankName(drag.card.rank)}
                </span>
                <span className={`text-[10px] ${drag.card.suit === 'hearts' || drag.card.suit === 'diamonds' ? 'text-red-500' : 'text-gray-900'}`}>
                  {SUIT_SYMBOLS[drag.card.suit]}
                </span>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-xl ${drag.card.suit === 'hearts' || drag.card.suit === 'diamonds' ? 'text-red-500' : 'text-gray-900'}`}>
                  {SUIT_SYMBOLS[drag.card.suit]}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Selection indicator */}
        <AnimatePresence>
          {selectedColumn !== null && !drag && (
            <motion.div
              className="absolute bottom-3 left-1/2 px-4 py-1.5 rounded-full
                         bg-black/60 backdrop-blur-sm border border-[#00f0ff]/30 text-xs text-[#00f0ff]"
              style={{ x: '-50%' }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
            >
              Selected column {selectedColumn + 1} — click destination or drag
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
