import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Clock, Hash, RotateCcw, BarChart3 } from 'lucide-react'
import type { GameMode } from '../types'
import { formatTime } from '../store/statsStore'

interface WinScreenProps {
  visible: boolean
  gameMode: GameMode
  moves: number
  timeMs: number
  onNewGame: () => void
  onViewStats: () => void
}

const MODE_NAMES: Record<GameMode, string> = {
  easy: '1 Suit',
  medium: '2 Suits',
  hard: '4 Suits',
}

export default function WinScreen({ visible, gameMode, moves, timeMs, onNewGame, onViewStats }: WinScreenProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          <motion.div
            className="relative bg-gradient-to-b from-[#0f1030] to-[#0a0a1a] border border-indigo-700/40
                       rounded-2xl p-8 max-w-sm w-full mx-4 shadow-[0_0_60px_rgba(0,240,255,0.1)]"
            initial={{ scale: 0.8, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: -20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            <div className="text-center mb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 500 }}
                className="inline-flex items-center justify-center w-16 h-16 rounded-full
                           bg-gradient-to-br from-[#ffd700]/20 to-[#ffd700]/5 border border-[#ffd700]/30 mb-4"
              >
                <Trophy className="w-8 h-8 text-[#ffd700]" />
              </motion.div>

              <h2 className="text-2xl font-bold text-white mb-1">Victory!</h2>
              <p className="text-indigo-400/60 text-sm">{MODE_NAMES[gameMode]} Mode</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-white/5 rounded-lg p-3 text-center border border-indigo-700/20">
                <Hash className="w-4 h-4 text-[#00f0ff] mx-auto mb-1" />
                <div className="text-lg font-bold text-white">{moves}</div>
                <div className="text-[10px] text-indigo-400/60">Moves</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-center border border-indigo-700/20">
                <Clock className="w-4 h-4 text-[#b44dff] mx-auto mb-1" />
                <div className="text-lg font-bold text-white">{formatTime(timeMs)}</div>
                <div className="text-[10px] text-indigo-400/60">Time</div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-lg
                           bg-[#00f0ff]/20 border border-[#00f0ff]/40                            text-[#00f0ff] font-medium
                           hover:bg-[#00f0ff]/30 transition-all text-base"
                onClick={onNewGame}
              >
                <RotateCcw className="w-4 h-4" />
                New Game
              </button>
              <button
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-lg
                           bg-white/5 border border-indigo-700/40                            text-indigo-300 font-medium
                           hover:bg-white/10 transition-all text-base"
                onClick={onViewStats}
              >
                <BarChart3 className="w-4 h-4" />
                Stats
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
