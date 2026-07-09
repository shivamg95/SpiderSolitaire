import { motion, AnimatePresence } from 'framer-motion'
import { X, Trophy, Hash, Clock, TrendingUp, Zap, Target } from 'lucide-react'
import type { GameMode } from '../types'
import { useStatsStore, getWinRate, getAvgMoves, formatTime } from '../store/statsStore'

interface StatsDashboardProps {
  visible: boolean
  onClose: () => void
}

const MODE_LABELS: Record<GameMode, string> = {
  easy: '1 Suit',
  medium: '2 Suits',
  hard: '4 Suits',
}

const MODE_COLORS: Record<GameMode, string> = {
  easy: 'text-emerald-400',
  medium: 'text-amber-400',
  hard: 'text-red-400',
}

const MODE_BORDERS: Record<GameMode, string> = {
  easy: 'border-emerald-700/30',
  medium: 'border-amber-700/30',
  hard: 'border-red-700/30',
}

export default function StatsDashboard({ visible, onClose }: StatsDashboardProps) {
  const stats = useStatsStore()
  const modes: GameMode[] = ['easy', 'medium', 'hard']

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

          <motion.div
            className="relative bg-gradient-to-b from-[#0f1030] to-[#0a0a1a] border border-indigo-700/40
                       rounded-2xl p-6 max-w-lg w-full mx-4 max-h-[85vh] overflow-y-auto momentum-scroll
                       shadow-[0_0_60px_rgba(0,240,255,0.08)]"
            initial={{ scale: 0.9, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 30 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <BarChartIcon />
                Statistics
              </h2>
              <button
                className="p-2 rounded-md hover:bg-white/10 text-indigo-400 transition-colors"
                onClick={onClose}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {modes.map((mode) => {
                const s = stats[mode] || { gamesPlayed: 0, gamesWon: 0, currentStreak: 0, bestStreak: 0, fewestMoves: null, fastestTime: null }
                if (s.gamesPlayed === 0) {
                  return (
                    <div key={mode} className={`rounded-lg border ${MODE_BORDERS[mode]} bg-white/[0.02] p-4`}>
                      <div className={`text-sm font-semibold mb-2 ${MODE_COLORS[mode]}`}>{MODE_LABELS[mode]}</div>
                      <p className="text-indigo-300/60 text-xs">No games played yet</p>
                    </div>
                  )
                }

                return (
                  <div key={mode} className={`rounded-lg border ${MODE_BORDERS[mode]} bg-white/[0.02] p-4`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className={`text-sm font-semibold ${MODE_COLORS[mode]}`}>{MODE_LABELS[mode]}</div>
                      <div className="flex items-center gap-1 text-xs text-indigo-300/80">
                        <Target className="w-3 h-3" />
                        {getWinRate(s)}%
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <StatCell icon={<Trophy className="w-3 h-3 text-[#ffd700]" />} label="Won" value={`${s.gamesWon}/${s.gamesPlayed}`} />
                      <StatCell icon={<Hash className="w-3 h-3 text-[#00f0ff]" />} label="Best" value={s.fewestMoves != null ? `${s.fewestMoves}` : '-'} />
                      <StatCell icon={<Clock className="w-3 h-3 text-[#b44dff]" />} label="Best" value={s.fastestTime != null ? formatTime(s.fastestTime) : '-'} />
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <StatCell icon={<TrendingUp className="w-3 h-3 text-[#4dff88]" />} label="Streak" value={`${s.currentStreak}`} />
                      <StatCell icon={<Zap className="w-3 h-3 text-amber-400" />} label="Best Strk" value={`${s.bestStreak}`} />
                      <StatCell icon={<Hash className="w-3 h-3 text-indigo-400" />} label="Avg Moves" value={`${getAvgMoves(s)}`} />
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-6 pt-4 border-t border-indigo-800/30 text-center">
              <button
                className="px-6 py-2 rounded-lg bg-indigo-900/50 border border-indigo-700/40
                           text-indigo-300 hover:bg-indigo-800/50 transition-all text-sm font-medium"
                onClick={() => {
                  if (confirm('Reset all statistics?')) {
                    localStorage.removeItem('spider-solitaire-stats')
                    useStatsStore.getState().loadStats()
                  }
                }}
              >
                Reset Statistics
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function BarChartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#00f0ff]">
      <path d="M3 3v18h18" />
      <path d="M18 17V9" />
      <path d="M13 17V5" />
      <path d="M8 17v-3" />
    </svg>
  )
}

function StatCell({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-black/20 rounded-md p-2 text-center border border-white/5">
      <div className="flex items-center justify-center gap-1 mb-0.5">
        {icon}
        <span className="text-[9px] text-indigo-300/60">{label}</span>
      </div>
      <div className="text-xs font-bold text-white">{value}</div>
    </div>
  )
}
