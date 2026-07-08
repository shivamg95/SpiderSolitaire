import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
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

const CONFETTI_COLORS = ['#ffd700', '#00f0ff', '#b44dff', '#4dff88', '#ff4da6', '#ffffff']

export default function WinScreen({ visible, gameMode, moves, timeMs, onNewGame, onViewStats }: WinScreenProps) {
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; color: string; delay: number; dx: number; dy: number }[]>([])

  useEffect(() => {
    if (visible) {
      const newParticles = Array.from({ length: 60 }, (_, i) => ({
        id: Date.now() + i,
        x: 50 + (Math.random() - 0.5) * 10,
        y: 40 + (Math.random() - 0.5) * 5,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        delay: Math.random() * 0.5,
        dx: (Math.random() - 0.5) * 200,
        dy: (Math.random() - 1) * 300,
      }))
      setParticles(newParticles)
    } else {
      setParticles([])
    }
  }, [visible])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Confetti */}
          {particles.map(p => (
            <motion.div
              key={p.id}
              className="absolute w-2 h-2 rounded-sm pointer-events-none"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                backgroundColor: p.color,
              }}
              initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
              animate={{
                opacity: [0, 1, 1, 0],
                scale: [0, 1.2, 0.8, 0],
                x: p.dx,
                y: p.dy,
                rotate: [0, 360 * (Math.random() > 0.5 ? 1 : -1)],
              }}
              transition={{
                duration: 2 + Math.random(),
                delay: p.delay,
                ease: 'easeOut',
              }}
            />
          ))}

          <motion.div
            className="relative bg-gradient-to-b from-[#0f1030] to-[#0a0a1a] border border-indigo-700/40
                       rounded-2xl p-8 max-w-sm w-full mx-4"
            initial={{ scale: 0.8, opacity: 0, y: 40 }}
            animate={{
              scale: 1, opacity: 1, y: 0,
              boxShadow: [
                '0 0 40px rgba(0,240,255,0.1)',
                '0 0 80px rgba(180,77,255,0.2)',
                '0 0 40px rgba(0,240,255,0.1)',
              ],
            }}
            exit={{ scale: 0.9, opacity: 0, y: -20 }}
            transition={{
              default: { type: 'spring', stiffness: 400, damping: 30 },
              boxShadow: { repeat: Infinity, duration: 2 },
            }}
          >
            <div className="text-center mb-6">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 500 }}
                className="inline-flex items-center justify-center w-16 h-16 rounded-full
                           bg-gradient-to-br from-[#ffd700]/20 to-[#ffd700]/5 border border-[#ffd700]/30 mb-4"
              >
                <Trophy className="w-8 h-8 text-[#ffd700]" />
              </motion.div>

              <h2 className="text-2xl font-bold text-white mb-1">Victory!</h2>
              <p className="text-indigo-300/80 text-sm">{MODE_NAMES[gameMode]} Mode</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-white/5 rounded-lg p-3 text-center border border-indigo-700/20">
                <Hash className="w-4 h-4 text-[#00f0ff] mx-auto mb-1" />
                <div className="text-lg font-bold text-white">{moves}</div>
                <div className="text-[10px] text-indigo-300/80">Moves</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-center border border-indigo-700/20">
                <Clock className="w-4 h-4 text-[#b44dff] mx-auto mb-1" />
                <div className="text-lg font-bold text-white">{formatTime(timeMs)}</div>
                <div className="text-[10px] text-indigo-300/80">Time</div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-lg
                           bg-[#00f0ff]/20 border border-[#00f0ff]/40 text-[#00f0ff] font-medium
                           hover:bg-[#00f0ff]/30 transition-all text-base"
                onClick={onNewGame}
              >
                <RotateCcw className="w-4 h-4" />
                New Game
              </button>
              <button
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-lg
                           bg-white/5 border border-indigo-700/40 text-indigo-300 font-medium
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
