import { Clock, Hash } from 'lucide-react'
import { formatTime } from '../store/statsStore'
import type { GameStatus } from '../types'

interface ScorePanelProps {
  moves: number
  timeMs: number
  gameStatus: GameStatus
}

export default function ScorePanel({ moves, timeMs, gameStatus }: ScorePanelProps) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-indigo-950/40 border border-indigo-800/30 px-3 py-1.5">
      {gameStatus === 'won' && (
        <span className="text-[#ffd700] font-bold text-xs">Victory!</span>
      )}
      {gameStatus === 'lost' && (
        <span className="text-red-400 font-bold text-xs">Game Over</span>
      )}
      {gameStatus === 'playing' && (
        <>
          <div className="flex items-center gap-1 text-[11px] text-indigo-300/80 font-mono">
            <Hash className="w-3 h-3 text-[#00f0ff]" />
            <span>{moves}</span>
          </div>
          <div className="w-px h-3 bg-indigo-700/50" />
          <div className="flex items-center gap-1 text-[11px] text-indigo-300/80 font-mono">
            <Clock className="w-3 h-3 text-[#b44dff]" />
            <span>{formatTime(timeMs)}</span>
          </div>
        </>
      )}
      {gameStatus === 'idle' && (
        <span className="text-[11px] text-indigo-300/60 font-mono">Ready</span>
      )}
    </div>
  )
}
