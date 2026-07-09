import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkles, Zap, ThumbsUp, AlertTriangle, Skull, Target, ChevronLeft, ChevronRight } from 'lucide-react'
import type { MoveRecord } from '../types'
import { analyzeGame, normalizeScore } from '../engine/analysis'
import { getRankName, SUIT_SYMBOLS } from '../types'

interface PostGameReviewProps {
  visible: boolean
  moveHistory: MoveRecord[]
  onClose: () => void
  onNewGame: () => void
}

const CLASSIFICATION_STYLES: Record<string, { icon: typeof Sparkles; color: string; bg: string; label: string }> = {
  brilliant: { icon: Sparkles, color: '#ffd700', bg: 'bg-[#ffd700]/10', label: 'Brilliant' },
  excellent: { icon: Zap, color: '#4dff88', bg: 'bg-[#4dff88]/10', label: 'Excellent' },
  good: { icon: ThumbsUp, color: '#00f0ff', bg: 'bg-[#00f0ff]/10', label: 'Good' },
  inaccuracy: { icon: AlertTriangle, color: '#f59e0b', bg: 'bg-amber-500/10', label: 'Inaccuracy' },
  blunder: { icon: Skull, color: '#ef4444', bg: 'bg-red-500/10', label: 'Blunder' },
}

export default function PostGameReview({ visible, moveHistory, onClose, onNewGame }: PostGameReviewProps) {
  const [selectedMoveIndex, setSelectedMoveIndex] = useState<number | null>(null)

  const analysis = useMemo(() => {
    if (moveHistory.length === 0) return null
    return analyzeGame(moveHistory)
  }, [moveHistory])

  const normalizedScores = useMemo(() => {
    if (!analysis) return []
    return normalizeScore(analysis.scoreHistory)
  }, [analysis])

  if (!analysis) return null

  const selectedMove = selectedMoveIndex != null ? analysis.moves[selectedMoveIndex] : null

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

          <motion.div
            className="relative bg-gradient-to-b from-[#0f1030] to-[#0a0a1a] border border-indigo-700/40
                       rounded-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto momentum-scroll
                       shadow-[0_0_80px_rgba(0,240,255,0.08)]"
            initial={{ scale: 0.9, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 30 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            <div className="sticky top-0 bg-[#0f1030] border-b border-indigo-800/20 px-6 py-4 rounded-t-2xl z-10">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Target className="w-5 h-5 text-[#00f0ff]" />
                  Nebula Insights
                </h2>
                <button
                  className="p-2 rounded-md hover:bg-white/10 text-indigo-400 transition-colors"
                  onClick={onClose}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="text-xs text-indigo-300/80 mb-1">Accuracy</div>
                  <div className="text-3xl font-bold text-white">{analysis.accuracy}%</div>
                </div>
                <div className="flex gap-3">
                  {(['brilliant', 'excellent', 'good', 'inaccuracy', 'blunder'] as const).map((c) => {
                    const count = analysis[c]
                    if (count === 0) return null
                    const style = CLASSIFICATION_STYLES[c]
                    const Icon = style.icon
                    return (
                      <div key={c} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${style.bg}`}>
                        <Icon className="w-3.5 h-3.5" style={{ color: style.color }} />
                        <span className="text-xs font-bold" style={{ color: style.color }}>{count}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="px-6 py-4">
              {/* Score graph */}
              <div className="mb-6">
                <div className="text-xs text-indigo-300/80 mb-2">Win Probability Over Moves</div>
                <div className="relative h-32 bg-black/30 rounded-lg border border-indigo-800/20 overflow-hidden">
                  <svg className="w-full h-full" viewBox={`0 0 ${normalizedScores.length - 1 || 1} 100`} preserveAspectRatio="none">
                    {normalizedScores.length > 1 && (
                      <motion.polyline
                        points={normalizedScores.map((s, i) => `${i},${100 - s}`).join(' ')}
                        fill="none"
                        stroke="url(#lineGradient)"
                        strokeWidth="2"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 1.5, ease: 'easeInOut' }}
                      />
                    )}
                    <defs>
                      <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#ef4444" />
                        <stop offset="50%" stopColor="#f59e0b" />
                        <stop offset="100%" stopColor="#4dff88" />
                      </linearGradient>
                    </defs>

                    {/* Clickable regions */}
                    {normalizedScores.map((_s, i) => (
                      <rect
                        key={i}
                        x={i - 9}
                        y={0}
                        width={18}
                        height={100}
                        fill="transparent"
                        className="cursor-pointer hover:fill-white/5"
                        onClick={() => setSelectedMoveIndex(i)}
                      />
                    ))}

                    {/* Move dots */}
                    {analysis.moves.map((m, i) => {
                      const color = CLASSIFICATION_STYLES[m.classification || 'good'].color
                      return (
                        <g key={i} className="cursor-pointer" onClick={() => setSelectedMoveIndex(i)}>
                          <circle
                            cx={i}
                            cy={100 - normalizedScores[i]}
                            r={12}
                            fill="transparent"
                          />
                          <circle
                            cx={i}
                            cy={100 - normalizedScores[i]}
                            r={selectedMoveIndex === i ? 5 : 4}
                            fill={color}
                            stroke={selectedMoveIndex === i ? 'white' : 'none'}
                            strokeWidth="1.5"
                            style={{ pointerEvents: 'none' }}
                          />
                        </g>
                      )
                    })}
                  </svg>
                </div>
                <div className="flex justify-between text-[9px] text-indigo-300/60 mt-1">
                  <span>Move 1</span>
                  <span>Move {analysis.moves.length}</span>
                </div>
              </div>

              {/* Selected move detail */}
              <AnimatePresence mode="wait">
                {selectedMove && (
                  <motion.div
                    key={selectedMoveIndex}
                    className="mb-6 p-4 rounded-lg bg-white/[0.03] border border-indigo-800/20"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-indigo-400">Move {selectedMoveIndex! + 1}</span>
                        {selectedMove.classification && (
                          <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${CLASSIFICATION_STYLES[selectedMove.classification].bg}`}
                               style={{ color: CLASSIFICATION_STYLES[selectedMove.classification].color }}>
                            {(() => {
                              const Icon = CLASSIFICATION_STYLES[selectedMove.classification!].icon
                              return <Icon className="w-3 h-3" />
                            })()}
                            {CLASSIFICATION_STYLES[selectedMove.classification].label}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button
                          className="p-1 rounded hover:bg-white/10 text-indigo-400 disabled:opacity-30"
                          disabled={selectedMoveIndex === 0}
                          onClick={() => setSelectedMoveIndex(prev => Math.max(0, (prev ?? 0) - 1))}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          className="p-1 rounded hover:bg-white/10 text-indigo-400 disabled:opacity-30"
                          disabled={selectedMoveIndex === analysis.moves.length - 1}
                          onClick={() => setSelectedMoveIndex(prev => Math.min(analysis.moves.length - 1, (prev ?? 0) + 1))}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Mini board state */}
                    <div className="flex gap-1 mb-3 overflow-x-auto">
                      {selectedMove.snapshotBefore.columns.map((col, idx) => (
                        <div key={idx} className="flex-1 min-w-[20px] flex flex-col items-center gap-0.5">
                          <div className="text-[8px] text-indigo-500/40">{idx + 1}</div>
                          {col.slice(-3).map((card, ci) => (
                            <div
                              key={ci}
                              className="w-full rounded-sm px-0.5 py-0.5 text-[7px] leading-tight text-center truncate
                                         border border-white/10"
                              style={{
                                backgroundColor: card.faceUp
                                  ? (card.suit === 'hearts' || card.suit === 'diamonds' ? '#fee2e2' : '#f1f5f9')
                                  : '#1e1b4b',
                                color: card.faceUp
                                  ? (card.suit === 'hearts' || card.suit === 'diamonds' ? '#ef4444' : '#1e293b')
                                  : 'transparent',
                              }}
                            >
                              {card.faceUp ? `${getRankName(card.rank)}${SUIT_SYMBOLS[card.suit]}` : '.'}
                            </div>
                          ))}
                          {col.length > 3 && (
                            <div className="text-[7px] text-indigo-300/60">+{col.length - 3}</div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="text-indigo-300/80">
                        Score Δ: <span className={selectedMove.scoreDelta >= 0 ? 'text-[#4dff88]' : 'text-red-400'}>{selectedMove.scoreDelta >= 0 ? '+' : ''}{selectedMove.scoreDelta.toFixed(0)}</span>
                      </div>
                      <div className="text-indigo-300/80">
                        Best Alt: <span className="text-[#00f0ff]">{selectedMove.bestAlternativeDelta >= 0 ? '+' : ''}{selectedMove.bestAlternativeDelta.toFixed(0)}</span>
                      </div>
                      {selectedMove.faceDownRevealed > 0 && (
                        <div className="text-indigo-300/80">
                          Cards revealed: <span className="text-[#ffd700]">{selectedMove.faceDownRevealed}</span>
                        </div>
                      )}
                      <div className="text-indigo-300/80">
                        Alternatives: <span className="text-white">{selectedMove.alternatives.length}</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Move list */}
              <div className="space-y-1 max-h-48 overflow-y-auto momentum-scroll">
                {analysis.moves.map((m, i) => {
                  const style = m.classification ? CLASSIFICATION_STYLES[m.classification] : CLASSIFICATION_STYLES.good
                  const Icon = style.icon
                  return (
                    <button
                      key={i}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors
                        ${selectedMoveIndex === i ? 'bg-white/10' : 'hover:bg-white/[0.03]'}`}
                      onClick={() => setSelectedMoveIndex(i)}
                    >
                      <span className="text-[10px] text-indigo-300/60 w-8">{i + 1}</span>
                      <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: style.color }} />
                      <span className="text-[10px] text-indigo-300/80 flex-1 truncate">
                        {m.move.fromColumn === 'stock'
                          ? 'Deal from stock'
                          : `Col ${m.move.fromColumn + 1} → Col ${m.move.toColumn + 1} (${m.move.cardCount} card${m.move.cardCount > 1 ? 's' : ''})`
                        }
                      </span>
                      <span className={`text-[10px] font-medium ${m.scoreDelta >= 0 ? 'text-[#4dff88]' : 'text-red-400'}`}>
                        {m.scoreDelta >= 0 ? '+' : ''}{m.scoreDelta.toFixed(0)}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="sticky bottom-0 bg-[#0f1030] border-t border-indigo-800/20 px-6 py-3 rounded-b-2xl flex gap-3">
              <button
                className="flex-1 px-4 py-2 rounded-lg bg-[#00f0ff]/20 border border-[#00f0ff]/40
                           text-[#00f0ff] font-medium hover:bg-[#00f0ff]/30 transition-all text-sm"
                onClick={onNewGame}
              >
                New Game
              </button>
              <button
                className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-indigo-700/40
                           text-indigo-300 font-medium hover:bg-white/10 transition-all text-sm"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
