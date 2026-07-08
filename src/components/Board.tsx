import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { useGameStore } from '../store/gameStore'
import { useStatsStore } from '../store/statsStore'
import { HelpCircle } from 'lucide-react'
import Starfield from './Starfield'
import Column, { getPointerColumnIndex } from './Column'
import StockPile from './StockPile'
import Foundation from './Foundation'
import Controls from './Controls'
import TimelineBar from './TimelineBar'
import WinScreen from './WinScreen'
import StatsDashboard from './StatsDashboard'
import PostGameReview from './PostGameReview'
import HowToPlay from './HowToPlay'
import { getValidRunFrom, findAllValidMoves, canAutoComplete, findBestTarget } from '../engine/rules'
import { getRankName, SUIT_SYMBOLS } from '../types'
import { useCardDimensions } from '../hooks/useCardDimensions'
import { TABLEAU_COLUMNS, COLUMN_GAP, CONTAINER_PADDING_X } from '../constants'
import type { GameMode, Card as CardType, Move, GameSnapshot, MoveRecord, GameStatus } from '../types'

const MAX_TIMELINES = 3
const TIMELINE_NAMES = ['Alpha', 'Beta', 'Gamma']

interface TimelineEntry {
  columns: GameSnapshot['columns']
  stock: GameSnapshot['stock']
  foundations: number
  moves: number
  gameMode: GameMode
  gameStatus: GameStatus
  startTime: number
  undoStack: GameSnapshot[]
  redoStack: GameSnapshot[]
  moveHistory: MoveRecord[]
}

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
  const gameStore = useGameStore()
  const {
    columns,
    stock,
    foundations,
    moves,
    gameMode,
    gameStatus,
    startTime,
    undoStack,
    redoStack,
    moveHistory,
    moveCard,
    dealStock,
    undo,
    redo,
    hasUndo,
    hasRedo,
    newGame,
    resign,
    autoComplete,
    restoreTimeline,
    getMoveHistory,
  } = gameStore

  const recordGame = useStatsStore(s => s.recordGame)

  const [selectedMode, setSelectedMode] = useState<GameMode | null>(gameMode || 'easy')
  const [drag, setDrag] = useState<DragState | null>(null)
  const [dragTargetColumn, setDragTargetColumn] = useState<number | null>(null)
  const [showWinScreen, setShowWinScreen] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [showPostGameReview, setShowPostGameReview] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [hintIndex, setHintIndex] = useState(0)
  const [hintMoves, setHintMoves] = useState<Move[]>([])
  const [hasRecorded, setHasRecorded] = useState(false)

  // Timeline state
  const [timelines, setTimelines] = useState<TimelineEntry[]>([])
  const [activeTimelineIndex, setActiveTimelineIndex] = useState(0)

  const prevFoundations = useRef(foundations)
  const prevGameStatus = useRef(gameStatus)
  const dims = useCardDimensions()
  const [clearParticles, setClearParticles] = useState<{ id: number; x: number; y: number }[]>([])

  useEffect(() => {
    if (gameMode) setSelectedMode(gameMode)
  }, [gameMode])

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

  useEffect(() => {
    if (prevGameStatus.current === 'playing' && (gameStatus === 'won' || gameStatus === 'lost') && !hasRecorded) {
      const elapsed = startTime ? Date.now() - startTime : 0
      const won = gameStatus === 'won'
      recordGame(gameMode, won, moves, elapsed)
      setHasRecorded(true)

      // Update timeline status
      setTimelines(prev => prev.map((t, i) =>
        i === activeTimelineIndex ? { ...t, gameStatus } : t
      ))

      setTimeout(() => {
        setShowPostGameReview(true)
      }, 400)
    }
    prevGameStatus.current = gameStatus
  }, [gameStatus, gameMode, moves, startTime, recordGame, hasRecorded, activeTimelineIndex])

  // Save current timeline before any state change
  const saveCurrentTimeline = useCallback(() => {
    if (timelines.length === 0) return
    const state: TimelineEntry = {
      columns: columns.map(col => col.map(c => ({ ...c }))),
      stock: stock.map(c => ({ ...c })),
      foundations,
      moves,
      gameMode,
      gameStatus,
      startTime: startTime ?? 0,
      undoStack: undoStack.map(snap => ({
        columns: snap.columns.map(col => col.map(c => ({ ...c }))),
        stock: snap.stock.map(c => ({ ...c })),
        foundations: snap.foundations,
        moves: snap.moves,
      })),
      redoStack: redoStack.map(snap => ({
        columns: snap.columns.map(col => col.map(c => ({ ...c }))),
        stock: snap.stock.map(c => ({ ...c })),
        foundations: snap.foundations,
        moves: snap.moves,
      })),
      moveHistory: moveHistory.map(r => ({ ...r })),
    }
    setTimelines(prev => prev.map((t, i) =>
      i === activeTimelineIndex ? state : t
    ))
  }, [timelines, activeTimelineIndex, columns, stock, foundations, moves, gameMode, gameStatus, startTime, undoStack, redoStack, moveHistory])

  const handleSplitTimeline = useCallback(() => {
    if (timelines.length >= MAX_TIMELINES) return
    saveCurrentTimeline()
    const state: TimelineEntry = {
      columns: columns.map(col => col.map(c => ({ ...c }))),
      stock: stock.map(c => ({ ...c })),
      foundations,
      moves,
      gameMode,
      gameStatus,
      startTime: startTime ?? 0,
      undoStack: undoStack.map(snap => ({
        columns: snap.columns.map(col => col.map(c => ({ ...c }))),
        stock: snap.stock.map(c => ({ ...c })),
        foundations: snap.foundations,
        moves: snap.moves,
      })),
      redoStack: redoStack.map(snap => ({
        columns: snap.columns.map(col => col.map(c => ({ ...c }))),
        stock: snap.stock.map(c => ({ ...c })),
        foundations: snap.foundations,
        moves: snap.moves,
      })),
      moveHistory: moveHistory.map(r => ({ ...r })),
    }
    setTimelines(prev => [...prev, state])
    setActiveTimelineIndex(timelines.length)
  }, [timelines, saveCurrentTimeline, columns, stock, foundations, moves, gameMode, gameStatus, startTime, undoStack, redoStack, moveHistory])

  const handleSwitchTimeline = useCallback((index: number) => {
    if (index === activeTimelineIndex) return
    saveCurrentTimeline()
    const target = timelines[index]
    if (!target) return
    restoreTimeline(
      target.columns,
      target.stock,
      target.foundations,
      target.moves,
      target.gameMode,
      target.gameStatus,
      target.startTime,
      target.undoStack,
      target.redoStack,
    )
    setActiveTimelineIndex(index)
    if (target.gameStatus === 'won' || target.gameStatus === 'lost') {
      setShowPostGameReview(true)
    }
  }, [activeTimelineIndex, timelines, saveCurrentTimeline, restoreTimeline])

  const handleResign = useCallback(() => {
    const elapsed = startTime ? Date.now() - startTime : 0
    recordGame(gameMode, false, moves, elapsed)
    resign()
  }, [resign, recordGame, gameMode, moves, startTime])

  const handleNewGame = useCallback((mode: GameMode) => {
    setShowWinScreen(false)
    setShowStats(false)
    setShowPostGameReview(false)
    setHasRecorded(false)
    setHintMoves([])
    setHintIndex(0)
    setTimelines([])
    setActiveTimelineIndex(0)
    newGame(mode)
  }, [newGame])

  // Create initial timeline on new game
  useEffect(() => {
    if (gameStatus === 'playing' && timelines.length === 0 && columns.length > 0) {
      const state: TimelineEntry = {
        columns: columns.map(col => col.map(c => ({ ...c }))),
        stock: stock.map(c => ({ ...c })),
        foundations,
        moves,
        gameMode,
        gameStatus: 'playing',
        startTime: startTime ?? Date.now(),
        undoStack: [],
        redoStack: [],
        moveHistory: [],
      }
      setTimelines([state])
      setActiveTimelineIndex(0)
    }
    if (gameStatus === 'idle') {
      setTimelines([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameStatus, columns.length])

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
      }
    } else {
      const best = findBestTarget(columns, drag.column, drag.cardIndex)
      if (best) {
        moveCard(best.fromColumn as number, best.toColumn, best.cardCount)
      }
    }

    setDrag(null)
    setDragTargetColumn(null)
  }, [drag, moveCard, columns])

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

      e.preventDefault()

      const srcCol = columns[colIndex]
      const runSize = getValidRunFrom(srcCol, cardIndex)
      if (runSize === 0) return

      if (runSize !== srcCol.length - cardIndex) return

      setHintMoves([])
      setHintIndex(0)

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

      const target = e.currentTarget
      if (target instanceof Element && target.setPointerCapture) {
        target.setPointerCapture(e.pointerId)
      }
    },
    [columns, gameStatus]
  )

  const handleDeal = useCallback(() => {
    setHintMoves([])
    setHintIndex(0)
    dealStock()
  }, [dealStock])

  const handleHint = useCallback(() => {
    if (gameStatus !== 'playing') return

    const allMoves = findAllValidMoves(columns)
    if (allMoves.length === 0) return

    if (hintMoves.length === 0 || hintIndex >= allMoves.length) {
      setHintMoves(allMoves)
      setHintIndex(0)
    } else {
      setHintIndex(prev => (prev + 1) % allMoves.length)
    }
  }, [columns, gameStatus, hintMoves.length, hintIndex])

  const currentHint = hintMoves.length > 0 && hintIndex < hintMoves.length
    ? hintMoves[hintIndex]
    : null

  const handleAutoComplete = useCallback(() => {
    if (gameStatus !== 'playing') return
    autoComplete()
  }, [autoComplete, gameStatus])

  const isAutoCompletable = gameStatus === 'playing' && canAutoComplete(columns, stock)
  const showBoard = gameStatus !== 'idle'
  const elapsedMs = startTime ? Date.now() - startTime : 0
  const timelineNames = timelines.map((_, i) => ({ name: TIMELINE_NAMES[i] || `T${i + 1}` }))

  return (
    <div className="fixed inset-0 flex flex-col bg-transparent text-white">
      <Starfield />

      <div className="relative z-10 flex flex-col h-full">
        <header className="flex flex-col md:flex-row md:items-center gap-2 px-3 py-2 bg-black/30 backdrop-blur-sm border-b border-indigo-800/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <StockPile
                stockCount={stock.length}
                canDeal={stock.length >= 10 && gameStatus === 'playing'}
                onDeal={handleDeal}
                cardWidth={dims.cardWidth}
              />
              {showBoard && (
                <Foundation completed={foundations} />
              )}
            </div>
            <div className="md:hidden text-[11px] text-indigo-400/60 font-mono">
              {gameStatus === 'won' && (
                <span className="text-[#ffd700] font-bold">Victory!</span>
              )}
              {gameStatus === 'lost' && (
                <span className="text-red-400 font-bold">Game Over</span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-center flex-1">
            <Controls
              moves={moves}
              hasUndo={hasUndo()}
              hasRedo={hasRedo()}
              canAutoComplete={isAutoCompletable}
              canSplit={gameStatus === 'playing' && timelines.length < MAX_TIMELINES}
              gameInProgress={gameStatus === 'playing'}
              onUndo={undo}
              onRedo={redo}
              onHint={handleHint}
              onAutoComplete={handleAutoComplete}
              onResign={handleResign}
              onSplitTimeline={handleSplitTimeline}
              onHelp={() => setShowHelp(true)}
              onNewGame={handleNewGame}
              selectedMode={selectedMode}
              onSelectMode={setSelectedMode}
            />
          </div>

          <div className="hidden md:block text-[11px] text-indigo-400/60 font-mono min-w-[60px] text-right">
            {gameStatus === 'won' && (
              <span className="text-[#ffd700] font-bold">Victory!</span>
            )}
            {gameStatus === 'lost' && (
              <span className="text-red-400 font-bold">Game Over</span>
            )}
          </div>
        </header>

        <TimelineBar
          timelines={timelineNames}
          activeIndex={activeTimelineIndex}
          maxTimelines={MAX_TIMELINES}
          onSwitch={handleSwitchTimeline}
          onSplit={handleSplitTimeline}
          visible={showBoard && timelines.length > 0}
        />

        <main className="flex-1 flex flex-col px-2 pt-2 pb-2 overflow-hidden relative">
          {!showBoard ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-[#00f0ff] to-[#b44dff] bg-clip-text text-transparent mb-4">
                  Spider Solitaire
                </h1>
                <p className="text-indigo-400/60 mb-6">Select a difficulty and start a new game</p>
                <div className="flex gap-3 justify-center mb-4">
                  {(['easy', 'medium', 'hard'] as GameMode[]).map((mode) => (
                    <button
                      key={mode}
                      className="px-6 py-3 rounded-lg bg-indigo-900/60 border border-indigo-700/50
                                 hover:border-[#00f0ff]/40 hover:shadow-[0_0_15px_rgba(0,240,255,0.1)]
                                 transition-all text-white font-medium"
                      onClick={() => handleNewGame(mode)}
                    >
                      {mode === 'easy' ? '1 Suit (Easy)' : mode === 'medium' ? '2 Suits (Medium)' : '4 Suits (Hard)'}
                    </button>
                  ))}
                </div>
                <button
                  className="px-5 py-2 rounded-lg text-indigo-400/60 hover:text-indigo-300 border border-indigo-700/30 hover:border-indigo-600/50 transition-all text-sm"
                  onClick={() => setShowHelp(true)}
                >
                  <HelpCircle className="w-4 h-4 inline mr-1.5" />
                  How to Play
                </button>
              </div>
            </div>
          ) : (
            <LayoutGroup>
              <div className="flex-1 flex min-h-0 overflow-auto" style={{ touchAction: 'pan-y' }}>
                <div
                  className="flex gap-1.5 px-1"
                  style={{ minWidth: Math.max(window.innerWidth, TABLEAU_COLUMNS * dims.cardWidth + (TABLEAU_COLUMNS - 1) * COLUMN_GAP + CONTAINER_PADDING_X) }}
                >
                  {columns.map((col, idx) => {
                    const isHintSource = currentHint?.fromColumn === idx
                    const isHintTarget = currentHint?.toColumn === idx

                    return (
                      <Column
                        key={`col-${idx}`}
                        cards={col}
                        columnIndex={idx}
                        isDragTarget={dragTargetColumn === idx}
                        isHintTarget={isHintTarget}
                        isHintSource={isHintSource}
                        onCardPointerDown={(cardIndex, e) => handleCardPointerDown(idx, cardIndex, e)}
                      />
                    )
                  })}
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
          {drag && (() => {
            const gw = dims.cardWidth
            const gCornerSize = Math.max(9, Math.min(24, Math.round(gw * 0.15)))
            const gCenterSize = Math.max(16, Math.min(45, Math.round(gw * 0.28)))
            const gCornerTop = Math.round(gw * 0.031)
            const gCornerSide = Math.round(gw * 0.062)
            const gRadius = Math.round(gw * 0.094)
            const gShadowY = Math.round(gw * 0.125)
            const gShadowBlur = Math.round(gw * 0.5)
            const gGlowBlur = Math.round(gw * 0.31)
            const isRed = drag.card.suit === 'hearts' || drag.card.suit === 'diamonds'
            const gSuitColor = isRed ? 'text-red-500' : 'text-gray-900'

            return (
            <motion.div
              className="fixed pointer-events-none z-50 overflow-hidden"
              style={{
                width: gw,
                aspectRatio: '5 / 7',
                left: drag.currentX - dims.halfWidth,
                top: drag.currentY - dims.halfHeight,
                borderRadius: gRadius,
                background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                boxShadow: `0 ${gShadowY}px ${gShadowBlur}px rgba(0,240,255,0.4), 0 0 ${gGlowBlur}px rgba(180,77,255,0.3)`,
              }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 0.95, scale: 1.03 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ type: 'spring', stiffness: 600, damping: 25 }}
            >
              <div
                className="absolute flex flex-col items-center leading-none"
                style={{ top: gCornerTop, left: gCornerSide }}
              >
                <span className={`font-bold ${gSuitColor}`} style={{ fontSize: gCornerSize }}>
                  {getRankName(drag.card.rank)}
                </span>
                <span className={gSuitColor} style={{ fontSize: gCornerSize }}>
                  {SUIT_SYMBOLS[drag.card.suit]}
                </span>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={gSuitColor} style={{ fontSize: gCenterSize }}>
                  {SUIT_SYMBOLS[drag.card.suit]}
                </span>
              </div>
            </motion.div>
            )
          })()}
        </AnimatePresence>

      </div>

      <WinScreen
        visible={showWinScreen && !showPostGameReview}
        gameMode={gameMode}
        moves={moves}
        timeMs={elapsedMs}
        onNewGame={() => handleNewGame(selectedMode || gameMode)}
        onViewStats={() => setShowStats(true)}
      />

      <PostGameReview
        visible={showPostGameReview}
        moveHistory={getMoveHistory()}
        onClose={() => setShowPostGameReview(false)}
        onNewGame={() => handleNewGame(selectedMode || gameMode)}
      />

      <StatsDashboard
        visible={showStats}
        onClose={() => setShowStats(false)}
      />

      <HowToPlay
        visible={showHelp}
        onClose={() => setShowHelp(false)}
      />
    </div>
  )
}
