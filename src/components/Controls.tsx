import { useState, useRef, useEffect } from 'react'
import { Undo2, Redo2, Lightbulb, Play, Flag, Sparkles, GitBranch, HelpCircle, MoreHorizontal } from 'lucide-react'
import type { GameMode } from '../types'

interface ControlsProps {
  hasUndo: boolean
  hasRedo: boolean
  canAutoComplete: boolean
  canSplit: boolean
  gameInProgress: boolean
  onUndo: () => void
  onRedo: () => void
  onHint: () => void
  onAutoComplete: () => void
  onResign: () => void
  onSplitTimeline: () => void
  onHelp: () => void
  onNewGame: (mode: GameMode) => void
  selectedMode: GameMode | null
  onSelectMode: (mode: GameMode) => void
}

const MODE_LABELS: Record<GameMode, string> = {
  easy: '1 Suit',
  medium: '2 Suits',
  hard: '4 Suits',
}

const MODE_SHORT: Record<GameMode, string> = {
  easy: '1S',
  medium: '2S',
  hard: '4S',
}

const MODE_COLORS: Record<GameMode, string> = {
  easy: 'bg-emerald-600 hover:bg-emerald-500',
  medium: 'bg-amber-600 hover:bg-amber-500',
  hard: 'bg-red-600 hover:bg-red-500',
}

export default function Controls({
  hasUndo,
  hasRedo,
  canAutoComplete,
  canSplit,
  gameInProgress,
  onUndo,
  onRedo,
  onHint,
  onAutoComplete,
  onResign,
  onSplitTimeline,
  onHelp,
  onNewGame,
  selectedMode,
  onSelectMode,
}: ControlsProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const modeButtons = (short: boolean) => (
    <div className="flex gap-0.5">
      {(Object.keys(MODE_LABELS) as GameMode[]).map((mode) => (
        <button
          key={mode}
          className={`${short ? 'px-2 py-1.5 text-xs' : 'px-4 py-2 text-sm'} rounded-md transition-colors font-medium
            ${selectedMode === mode
              ? `${MODE_COLORS[mode]} text-white shadow-[0_0_8px_rgba(0,240,255,0.15)]`
              : 'bg-indigo-900/50 text-indigo-300 hover:bg-indigo-800/60'
            }
          `}
          onClick={() => {
            if (selectedMode === mode) {
              onNewGame(mode)
            } else {
              onSelectMode(mode)
            }
          }}
        >
          {short ? MODE_SHORT[mode] : MODE_LABELS[mode]}
        </button>
      ))}
    </div>
  )

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Desktop mode buttons */}
      <div className="hidden md:flex">{modeButtons(false)}</div>
      {/* Mobile mode buttons */}
      <div className="md:hidden">{modeButtons(true)}</div>

      <button
        className={`px-3 md:px-5 py-1.5 md:py-2 text-xs md:text-sm rounded-md font-medium transition-all
          ${selectedMode
            ? 'bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/40 hover:bg-[#00f0ff]/30 shadow-[0_0_10px_rgba(0,240,255,0.15)]'
            : 'bg-indigo-900/50 text-indigo-300 hover:bg-indigo-800/60'
          }
        `}
        onClick={() => selectedMode && onNewGame(selectedMode)}
      >
        <Play className="w-4 h-4 md:w-5 md:h-5 inline mr-0.5 md:mr-1" />
        <span className="hidden md:inline">New Game</span>
      </button>

      <div className="w-px h-5 bg-indigo-700/50" />

      <button
        className="p-2 md:p-2.5 rounded-md bg-indigo-900/50 text-indigo-300 hover:bg-indigo-800/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
        onClick={onUndo}
        disabled={!hasUndo || !gameInProgress}
        title="Undo"
      >
        <Undo2 className="w-4 h-4 md:w-5 md:h-5" />
        <span className="hidden md:inline text-xs">Undo</span>
      </button>
      <button
        className="p-2 md:p-2.5 rounded-md bg-indigo-900/50 text-indigo-300 hover:bg-indigo-800/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
        onClick={onRedo}
        disabled={!hasRedo || !gameInProgress}
        title="Redo"
      >
        <Redo2 className="w-4 h-4 md:w-5 md:h-5" />
        <span className="hidden md:inline text-xs">Redo</span>
      </button>

      {/* Desktop: always-visible controls */}
      <div className="hidden md:flex items-center gap-2">
        <button
          className="p-2.5 rounded-md bg-indigo-900/50 text-indigo-300 hover:bg-indigo-800/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
          onClick={onHint}
          disabled={!gameInProgress}
          title="Hint"
        >
          <Lightbulb className="w-5 h-5" />
          <span className="text-xs">Hint</span>
        </button>

        {canAutoComplete && (
          <button
            className="p-2.5 rounded-md bg-[#4dff88]/20 text-[#4dff88] hover:bg-[#4dff88]/30 transition-colors animate-pulse flex items-center gap-1.5"
            onClick={onAutoComplete}
            title="Auto Complete!"
          >
            <Sparkles className="w-5 h-5" />
            <span className="text-xs">Auto</span>
          </button>
        )}

        {gameInProgress && canSplit && (
          <button
            className="p-2.5 rounded-md bg-[#b44dff]/20 text-[#b44dff] hover:bg-[#b44dff]/30 transition-colors flex items-center gap-1.5"
            onClick={onSplitTimeline}
            title="Split Timeline"
          >
            <GitBranch className="w-5 h-5" />
            <span className="text-xs">Split</span>
          </button>
        )}

        {gameInProgress && (
          <button
            className="p-2.5 rounded-md bg-red-900/30 text-red-400/60 hover:bg-red-900/50 hover:text-red-400 transition-colors flex items-center gap-1.5"
            onClick={onResign}
            title="Resign"
          >
            <Flag className="w-5 h-5" />
            <span className="text-xs">Resign</span>
          </button>
        )}

        <div className="w-px h-5 bg-indigo-700/50" />

        <button
          className="p-2.5 rounded-md bg-indigo-900/50 text-indigo-300/80 hover:text-indigo-300 hover:bg-indigo-800/60 transition-colors flex items-center gap-1.5"
          onClick={onHelp}
          title="How to Play"
        >
          <HelpCircle className="w-5 h-5" />
          <span className="text-xs">Help</span>
        </button>
      </div>

      {/* Mobile: "More" dropdown */}
      <div className="md:hidden relative" ref={menuRef}>
        <button
          className="p-2 rounded-md bg-indigo-900/50 text-indigo-300 hover:bg-indigo-800/60 transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
          title="More"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
        {menuOpen && (
          <div className="absolute top-full right-0 mt-1 py-1 rounded-md bg-indigo-950/95 border border-indigo-800/50 shadow-xl z-50 min-w-[120px]">
            <button
              className="w-full px-3 py-2 text-xs text-left text-indigo-300 hover:bg-indigo-800/40 transition-colors flex items-center gap-2 disabled:opacity-30"
              onClick={() => { onHint(); setMenuOpen(false) }}
              disabled={!gameInProgress}
            >
              <Lightbulb className="w-3.5 h-3.5" />
              Hint
            </button>
            {canAutoComplete && (
              <button
                className="w-full px-3 py-2 text-xs text-left text-[#4dff88] hover:bg-indigo-800/40 transition-colors flex items-center gap-2"
                onClick={() => { onAutoComplete(); setMenuOpen(false) }}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Auto Complete
              </button>
            )}
            {gameInProgress && canSplit && (
              <button
                className="w-full px-3 py-2 text-xs text-left text-[#b44dff] hover:bg-indigo-800/40 transition-colors flex items-center gap-2"
                onClick={() => { onSplitTimeline(); setMenuOpen(false) }}
              >
                <GitBranch className="w-3.5 h-3.5" />
                Split Timeline
              </button>
            )}
            {gameInProgress && (
              <button
                className="w-full px-3 py-2 text-xs text-left text-red-400/70 hover:bg-indigo-800/40 transition-colors flex items-center gap-2"
                onClick={() => { onResign(); setMenuOpen(false) }}
              >
                <Flag className="w-3.5 h-3.5" />
                Resign
              </button>
            )}
            <div className="border-t border-indigo-800/30 my-0.5" />
            <button
              className="w-full px-3 py-2 text-xs text-left text-indigo-300/80 hover:bg-indigo-800/40 transition-colors flex items-center gap-2"
              onClick={() => { onHelp(); setMenuOpen(false) }}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              How to Play
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
