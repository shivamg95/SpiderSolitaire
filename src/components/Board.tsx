import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { useGameStore } from '../store/gameStore'
import { useStatsStore } from '../store/statsStore'
import { HelpCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import Starfield from './Starfield'
import Column, { getPointerColumnIndex, getCardOffset, computeCompressedOffsets } from './Column'
import StockPile from './StockPile'
import Foundation from './Foundation'
import Controls from './Controls'
import ScorePanel from './ScorePanel'
import TimelineBar from './TimelineBar'
import WinScreen from './WinScreen'
import StatsDashboard from './StatsDashboard'
import PostGameReview from './PostGameReview'
import HowToPlay from './HowToPlay'
import { getValidRunFrom, findAllValidMoves, canAutoComplete, findBestTarget } from '../engine/rules'
import { getRankName, SUIT_SYMBOLS } from '../types'
import { useCardDimensions } from '../hooks/useCardDimensions'
import { TABLEAU_COLUMNS, CONTAINER_PADDING_X } from '../constants'
import type { GameMode, Card as CardType, Move, GameSnapshot, MoveRecord, GameStatus, Suit } from '../types'

const MAX_TIMELINES = 3
const TIMELINE_NAMES = ['Alpha', 'Beta', 'Gamma']
const SIDEBAR_WIDTH = 176

interface TimelineEntry {
  columns: GameSnapshot['columns']
  stock: GameSnapshot['stock']
  foundations: number
  completedSuits: Suit[]
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
    completedSuits,
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
  const [hintAnimId, setHintAnimId] = useState(0)
  const [hintAnimData, setHintAnimData] = useState<{
    sourceX: number; sourceY: number
    targetX: number; targetY: number
    card: CardType
  } | null>(null)
  const [hintSourceCard, setHintSourceCard] = useState<string | null>(null)
  const [hasRecorded, setHasRecorded] = useState(false)
  const [elapsedDisplay, setElapsedDisplay] = useState(0)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Timeline state
  const [timelines, setTimelines] = useState<TimelineEntry[]>([])
  const [activeTimelineIndex, setActiveTimelineIndex] = useState(0)

  const prevFoundations = useRef(foundations)
  const prevGameStatus = useRef(gameStatus)
  const hintTimeoutRef = useRef<number>(0)
  const dims = useCardDimensions((typeof window !== 'undefined' ? window.innerWidth : 1024) < 768 ? 0 : SIDEBAR_WIDTH)
  const [clearParticles, setClearParticles] = useState<{ id: number; x: number; y: number; size: number; color: string }[]>([])

  const availableHeight = dims.viewportH - 32
  const sidebarStockCardWidth = 76
  const isSmallScreen = dims.viewportW < 768

  const { faceDownOffset: dynamicFaceDown, faceUpOffset: dynamicFaceUp } = gameStatus !== 'idle'
    ? computeCompressedOffsets(columns, dims.faceDownOffset, dims.faceUpOffset, dims.cardHeight, availableHeight)
    : { faceDownOffset: dims.faceDownOffset, faceUpOffset: dims.faceUpOffset }

  useEffect(() => {
    if (gameMode) setSelectedMode(gameMode)
  }, [gameMode])

  useEffect(() => {
    if (gameStatus !== 'playing' || !startTime) {
      setElapsedDisplay(startTime ? Date.now() - startTime : 0)
      return
    }
    const id = setInterval(() => setElapsedDisplay(Date.now() - startTime), 1000)
    return () => clearInterval(id)
  }, [gameStatus, startTime])

  useEffect(() => {
    if (foundations > prevFoundations.current) {
      const count = foundations - prevFoundations.current
      const particles = Array.from({ length: count * 18 }, (_, i) => ({
        id: Date.now() + i,
        x: Math.random() * 60 + 20,
        y: Math.random() * 40 + 10,
        size: 2 + Math.random() * 3,
        color: ['#ffd700', '#00f0ff', '#b44dff', '#4dff88'][i % 4],
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
      completedSuits: [...completedSuits],
      moves,
      gameMode,
      gameStatus,
      startTime: startTime ?? 0,
      undoStack: undoStack.map(snap => ({
        columns: snap.columns.map(col => col.map(c => ({ ...c }))),
        stock: snap.stock.map(c => ({ ...c })),
        foundations: snap.foundations,
        completedSuits: snap.completedSuits ?? [],
        moves: snap.moves,
      })),
      redoStack: redoStack.map(snap => ({
        columns: snap.columns.map(col => col.map(c => ({ ...c }))),
        stock: snap.stock.map(c => ({ ...c })),
        foundations: snap.foundations,
        completedSuits: snap.completedSuits ?? [],
        moves: snap.moves,
      })),
      moveHistory: moveHistory.map(r => ({ ...r })),
    }
    setTimelines(prev => prev.map((t, i) =>
      i === activeTimelineIndex ? state : t
    ))
  }, [timelines, activeTimelineIndex, columns, stock, foundations, completedSuits, moves, gameMode, gameStatus, startTime, undoStack, redoStack, moveHistory])

  const handleSplitTimeline = useCallback(() => {
    if (timelines.length >= MAX_TIMELINES) return
    saveCurrentTimeline()
    const state: TimelineEntry = {
      columns: columns.map(col => col.map(c => ({ ...c }))),
      stock: stock.map(c => ({ ...c })),
      foundations,
      completedSuits: [...completedSuits],
      moves,
      gameMode,
      gameStatus,
      startTime: startTime ?? 0,
      undoStack: undoStack.map(snap => ({
        columns: snap.columns.map(col => col.map(c => ({ ...c }))),
        stock: snap.stock.map(c => ({ ...c })),
        foundations: snap.foundations,
        completedSuits: snap.completedSuits ?? [],
        moves: snap.moves,
      })),
      redoStack: redoStack.map(snap => ({
        columns: snap.columns.map(col => col.map(c => ({ ...c }))),
        stock: snap.stock.map(c => ({ ...c })),
        foundations: snap.foundations,
        completedSuits: snap.completedSuits ?? [],
        moves: snap.moves,
      })),
      moveHistory: moveHistory.map(r => ({ ...r })),
    }
    setTimelines(prev => [...prev, state])
    setActiveTimelineIndex(timelines.length)
  }, [timelines, saveCurrentTimeline, columns, stock, foundations, completedSuits, moves, gameMode, gameStatus, startTime, undoStack, redoStack, moveHistory])

  const handleSwitchTimeline = useCallback((index: number) => {
    if (index === activeTimelineIndex) return
    saveCurrentTimeline()
    const target = timelines[index]
    if (!target) return
    restoreTimeline(
      target.columns,
      target.stock,
      target.foundations,
      target.completedSuits ?? [],
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
    setHintSourceCard(null)
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
        completedSuits: [],
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
      if (isSmallScreen) setSidebarCollapsed(true)

      const srcCol = columns[colIndex]
      const runSize = getValidRunFrom(srcCol, cardIndex)
      if (runSize === 0) return

      if (runSize !== srcCol.length - cardIndex) return

      setHintMoves([])
      setHintIndex(0)
      setHintAnimData(null)
      setHintSourceCard(null)

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
    [columns, gameStatus, isSmallScreen]
  )

  const handleDeal = useCallback(() => {
    setHintMoves([])
    setHintIndex(0)
    setHintAnimData(null)
    setHintSourceCard(null)
    dealStock()
  }, [dealStock])

  const handleHint = useCallback(() => {
    if (gameStatus !== 'playing') return

    const allMoves = findAllValidMoves(columns)
    if (allMoves.length === 0) return

    let index: number
    if (hintMoves.length === 0 || hintIndex >= allMoves.length) {
      setHintMoves(allMoves)
      setHintIndex(0)
      index = 0
    } else {
      const next = (hintIndex + 1) % allMoves.length
      setHintIndex(next)
      index = next
    }

    const move = allMoves[index]
    if (move.fromColumn === 'stock') return

    const fromCol = columns[move.fromColumn]
    const cardIndex = fromCol.length - move.cardCount
    const card = fromCol[cardIndex]

    const sourceEl = document.querySelector(`[data-column-index="${move.fromColumn}"]`)
    const targetEl = document.querySelector(`[data-column-index="${move.toColumn}"]`)

    if (!sourceEl || !targetEl) return

    const sourceRect = sourceEl.getBoundingClientRect()
    const targetRect = targetEl.getBoundingClientRect()
    const cardOffset = getCardOffset(fromCol, cardIndex, dynamicFaceDown, dynamicFaceUp)

    const id = Date.now()
    setHintAnimData({
      sourceX: sourceRect.left + sourceRect.width / 2 - dims.cardWidth / 2,
      sourceY: sourceRect.top + cardOffset,
      targetX: targetRect.left + targetRect.width / 2 - dims.cardWidth / 2,
      targetY: targetRect.top + targetRect.height - dims.cardHeight - 12,
      card,
    })
    setHintAnimId(id)
    setHintSourceCard(card.id)

    if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current)
    hintTimeoutRef.current = window.setTimeout(() => {
      setHintAnimData(prev => prev && prev.card.id === card.id ? null : prev)
      setHintSourceCard(prev => prev === card.id ? null : prev)
    }, 1500)
  }, [columns, gameStatus, hintMoves.length, hintIndex, dims, dynamicFaceDown, dynamicFaceUp])

  const handleAutoComplete = useCallback(() => {
    if (gameStatus !== 'playing') return
    autoComplete()
  }, [autoComplete, gameStatus])

  const isAutoCompletable = gameStatus === 'playing' && canAutoComplete(columns, stock)
  const showBoard = gameStatus !== 'idle'
  const elapsedMs = startTime ? Date.now() - startTime : 0
  const timelineNames = timelines.map((_, i) => ({ name: TIMELINE_NAMES[i] || `T${i + 1}` }))

  const validDragTargets = new Set<number>()
  if (drag) {
    for (let i = 0; i < columns.length; i++) {
      if (i === drag.column) continue
      const targetCol = columns[i]
      if (targetCol.length === 0) {
        validDragTargets.add(i)
      } else {
        const topCard = targetCol[targetCol.length - 1]
        if (drag.card.rank === topCard.rank - 1) {
          validDragTargets.add(i)
        }
      }
    }
  }

  return (
    <div className="fixed inset-0 flex flex-row bg-transparent text-white">
      <Starfield />

      {/* Main game area */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">

        {!showBoard ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <motion.h1
                className="text-3xl font-bold bg-gradient-to-r from-[#00f0ff] to-[#b44dff] bg-clip-text text-transparent mb-4"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              >
                Spider Solitaire
              </motion.h1>
              <motion.p
                className="text-indigo-300/80 mb-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15, duration: 0.4 }}
              >
                Select a difficulty and start a new game
              </motion.p>
              <div className="flex gap-3 justify-center mb-4">
                {(['easy', 'medium', 'hard'] as GameMode[]).map((mode, i) => (
                  <motion.button
                    key={mode}
                    className="px-6 py-3 rounded-lg bg-indigo-900/60 border border-indigo-700/50
                               hover:border-[#00f0ff]/40 hover:shadow-[0_0_15px_rgba(0,240,255,0.1)]
                               transition-all text-white font-medium"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 + i * 0.1, duration: 0.4, ease: 'easeOut' }}
                    onClick={() => handleNewGame(mode)}
                  >
                    {mode === 'easy' ? '1 Suit (Easy)' : mode === 'medium' ? '2 Suits (Medium)' : '4 Suits (Hard)'}
                  </motion.button>
                ))}
              </div>
              <motion.button
                className="px-5 py-2 rounded-lg text-indigo-300/80 hover:text-indigo-300 border border-indigo-700/30 hover:border-indigo-600/50 transition-all text-sm"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55, duration: 0.4 }}
                onClick={() => setShowHelp(true)}
              >
                <HelpCircle className="w-4 h-4 inline mr-1.5" />
                How to Play
              </motion.button>
            </div>
          </div>
        ) : (
          <main className="flex-1 flex p-2 overflow-hidden">
            <LayoutGroup>
              <div
                className="flex-1 flex overflow-x-auto overflow-y-hidden rounded-xl"
                style={{
                  touchAction: 'pan-x',
                  background: `
                    radial-gradient(circle at 50% 50%, rgba(15,16,48,0.6) 0%, rgba(10,10,30,0.8) 100%),
                    repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,240,255,0.015) 2px, rgba(0,240,255,0.015) 4px),
                    repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(180,77,255,0.015) 2px, rgba(180,77,255,0.015) 4px)
                  `,
                }}
              >
                <div
                  className="flex px-2 py-2"
                  style={{ gap: dims.columnGap, minWidth: TABLEAU_COLUMNS * dims.cardWidth + (TABLEAU_COLUMNS - 1) * dims.columnGap + CONTAINER_PADDING_X }}
                >
                  {columns.map((col, idx) => (
                    <Column
                      key={`col-${idx}`}
                      cards={col}
                      columnIndex={idx}
                      isDragTarget={dragTargetColumn === idx}
                      isSource={drag !== null && drag.column === idx}
                      isValidDropTarget={drag !== null && validDragTargets.has(idx)}
                      hintCardId={hintSourceCard}
                      faceDownOffset={dynamicFaceDown}
                      faceUpOffset={dynamicFaceUp}
                      cardWidthOverride={dims.cardWidth}
                      cardHeightOverride={dims.cardHeight}
                      onCardPointerDown={(cardIndex, e) => handleCardPointerDown(idx, cardIndex, e)}
                    />
                  ))}
                </div>
              </div>
            </LayoutGroup>
          </main>
        )}

        {/* Clear particles */}
        <AnimatePresence>
          {clearParticles.map((p) => (
            <motion.div
              key={p.id}
              className="absolute rounded-full pointer-events-none z-50"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                background: p.color,
                boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
              }}
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: 2, opacity: 0, y: -50 - Math.random() * 40, x: (Math.random() - 0.5) * 60 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2 + Math.random() * 0.8, ease: 'easeOut' }}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Sidebar collapse toggle — only on small screens */}
      {showBoard && isSmallScreen && (
        <button
          className="fixed top-1/2 -translate-y-1/2 z-30 w-6 h-12 bg-black/40 backdrop-blur-sm border border-indigo-700/30 rounded-l-md flex items-center justify-center hover:bg-black/60 transition-colors"
          style={{ right: sidebarCollapsed ? 0 : SIDEBAR_WIDTH }}
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        >
          {sidebarCollapsed ? (
            <ChevronLeft className="w-4 h-4 text-indigo-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-indigo-400" />
          )}
        </button>
      )}

      {/* Right sidebar */}
      <AnimatePresence>
        {showBoard && (!isSmallScreen || !sidebarCollapsed) && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: SIDEBAR_WIDTH, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="flex-shrink-0 flex flex-col gap-2 px-3 py-2.5 bg-black/30 backdrop-blur-sm border-l border-indigo-800/20 overflow-y-auto z-10 overflow-hidden"
          >
            <div style={{ width: SIDEBAR_WIDTH - 24 }}>
              <StockPile
                stockCount={stock.length}
                canDeal={stock.length >= 10 && gameStatus === 'playing'}
                onDeal={handleDeal}
                cardWidth={sidebarStockCardWidth}
              />

              <div className="border-t border-indigo-800/20 my-1" />

              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] uppercase tracking-wider text-indigo-400/60 font-semibold">Completed</span>
                <Foundation completedSuits={completedSuits} cardWidth={sidebarStockCardWidth} vertical />
              </div>

              <div className="border-t border-indigo-800/20 my-1" />

              <ScorePanel
                moves={moves}
                timeMs={elapsedDisplay}
                gameStatus={gameStatus}
              />

              <div className="border-t border-indigo-800/20 my-1" />

              <Controls
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
                vertical
              />

              <TimelineBar
                timelines={timelineNames}
                activeIndex={activeTimelineIndex}
                maxTimelines={MAX_TIMELINES}
                onSwitch={handleSwitchTimeline}
                onSplit={handleSplitTimeline}
                visible={showBoard && timelines.length > 1}
                vertical
              />
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

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
          const stackOffset = Math.round(gw * 0.06)
          const stackCount = Math.min(drag.runSize, 4)

          return (
          <motion.div
            className="fixed pointer-events-none z-50 overflow-hidden"
            style={{
              width: gw,
              aspectRatio: '5 / 7',
              borderRadius: gRadius,
              x: drag.currentX - dims.halfWidth,
              y: drag.currentY - dims.halfHeight,
              rotate: Math.max(-4, Math.min(4, (drag.currentX - drag.startX) * 0.03)),
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.95, scale: 1.03 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            {stackCount > 1 && Array.from({ length: stackCount - 1 }).map((_, si) => (
              <div
                key={si}
                className="absolute rounded-md overflow-hidden"
                style={{
                  width: gw,
                  aspectRatio: '5 / 7',
                  top: (si + 1) * stackOffset,
                  left: (si + 1) * stackOffset,
                  borderRadius: gRadius,
                  background: 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)',
                  boxShadow: `0 1px 4px rgba(0,0,0,0.2)`,
                  opacity: 0.4 - si * 0.1,
                }}
              />
            ))}
            <div
              className="absolute inset-0 rounded-md"
              style={{
                background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                boxShadow: `0 ${gShadowY}px ${gShadowBlur}px rgba(0,0,0,0.4), 0 0 ${gGlowBlur}px rgba(0,240,255,0.12)`,
              }}
            />
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

      {/* Flying hint ghost */}
      <AnimatePresence>
        {hintAnimData && (() => {
          const hw = dims.cardWidth
          const hCornerSize = Math.max(9, Math.min(24, Math.round(hw * 0.15)))
          const hCenterSize = Math.max(16, Math.min(45, Math.round(hw * 0.28)))
          const hCornerTop = Math.round(hw * 0.031)
          const hCornerSide = Math.round(hw * 0.062)
          const hRadius = Math.round(hw * 0.094)
          const isRed = hintAnimData.card.suit === 'hearts' || hintAnimData.card.suit === 'diamonds'
          const hSuitColor = isRed ? 'text-red-500' : 'text-gray-900'
          const dx = hintAnimData.targetX - hintAnimData.sourceX
          const dy = hintAnimData.targetY - hintAnimData.sourceY

          return (
            <motion.div
              key={hintAnimId}
              className="fixed pointer-events-none z-50 overflow-hidden"
              style={{
                width: hw,
                aspectRatio: '5 / 7',
                left: hintAnimData.sourceX,
                top: hintAnimData.sourceY,
                borderRadius: hRadius,
                background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                boxShadow: '0 0 18px rgba(0,240,255,0.7), 0 4px 16px rgba(0,0,0,0.4)',
              }}
              initial={{ opacity: 1, x: 0, y: 0 }}
              animate={{ opacity: [1, 0.9, 0], x: dx, y: dy }}
              transition={{ duration: 0.7, ease: 'easeInOut', times: [0, 0.6, 1] }}
            >
              <div
                className="absolute flex flex-col items-center leading-none"
                style={{ top: hCornerTop, left: hCornerSide }}
              >
                <span className={`font-bold ${hSuitColor}`} style={{ fontSize: hCornerSize }}>
                  {getRankName(hintAnimData.card.rank)}
                </span>
                <span className={hSuitColor} style={{ fontSize: hCornerSize }}>
                  {SUIT_SYMBOLS[hintAnimData.card.suit]}
                </span>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={hSuitColor} style={{ fontSize: hCenterSize }}>
                  {SUIT_SYMBOLS[hintAnimData.card.suit]}
                </span>
              </div>
            </motion.div>
          )
        })()}
      </AnimatePresence>

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
