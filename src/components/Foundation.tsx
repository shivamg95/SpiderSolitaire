import { Trophy } from 'lucide-react'
import { MAX_FOUNDATIONS } from '../types'

interface FoundationProps {
  completed: number
}

export default function Foundation({ completed }: FoundationProps) {
  return (
    <div className="flex gap-2">
      {Array.from({ length: MAX_FOUNDATIONS }).map((_, i) => {
        const isComplete = i < completed

        return (
          <div
            key={i}
            className={`
              w-8 h-10 rounded-md border transition-all duration-300
              ${isComplete
                ? 'border-[#ffd700]/60 bg-gradient-to-b from-yellow-900/40 to-amber-900/20 shadow-[0_0_8px_rgba(255,215,0,0.3)]'
                : 'border-indigo-800/30 bg-transparent'
              }
            `}
          >
            {isComplete && (
              <div className="w-full h-full flex items-center justify-center">
                <Trophy className="w-3.5 h-3.5 text-[#ffd700]" />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
