import { Undo2, Redo2, Lightbulb, Play, Flag, Sparkles, GitBranch, HelpCircle } from 'lucide-react'
import type { GameMode } from '../types'

interface ControlsProps {
  moves: number
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

const MODE_COLORS: Record<GameMode, string> = {
  easy: 'bg-emerald-600 hover:bg-emerald-500',
  medium: 'bg-amber-600 hover:bg-amber-500',
  hard: 'bg-red-600 hover:bg-red-500',
}

export default function Controls({
  moves,
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
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex gap-1">
        {(Object.keys(MODE_LABELS) as GameMode[]).map((mode) => (
          <button
            key={mode}
            className={`px-4 py-2 text-sm rounded-md transition-colors font-medium
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
            {MODE_LABELS[mode]}
          </button>
        ))}
      </div>

      <button
        className={`px-5 py-2 text-sm rounded-md font-medium transition-all
          ${selectedMode
            ? 'bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/40 hover:bg-[#00f0ff]/30 shadow-[0_0_10px_rgba(0,240,255,0.15)]'
            : 'bg-indigo-900/50 text-indigo-300 hover:bg-indigo-800/60'
          }
        `}
        onClick={() => selectedMode && onNewGame(selectedMode)}
      >
        <Play className="w-5 h-5 inline mr-1" />
        New Game
      </button>

      <div className="w-px h-5 bg-indigo-700/50" />

      <button
        className="p-2.5 rounded-md bg-indigo-900/50 text-indigo-300 hover:bg-indigo-800/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
        onClick={onUndo}
        disabled={!hasUndo || !gameInProgress}
        title="Undo"
      >
        <Undo2 className="w-5 h-5" />
        <span className="hidden md:inline text-xs">Undo</span>
      </button>
      <button
        className="p-2.5 rounded-md bg-indigo-900/50 text-indigo-300 hover:bg-indigo-800/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
        onClick={onRedo}
        disabled={!hasRedo || !gameInProgress}
        title="Redo"
      >
        <Redo2 className="w-5 h-5" />
        <span className="hidden md:inline text-xs">Redo</span>
      </button>
      <button
        className="p-2.5 rounded-md bg-indigo-900/50 text-indigo-300 hover:bg-indigo-800/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
        onClick={onHint}
        disabled={!gameInProgress}
        title="Hint"
      >
        <Lightbulb className="w-5 h-5" />
        <span className="hidden md:inline text-xs">Hint</span>
      </button>

      {canAutoComplete && (
        <button
          className="p-2.5 rounded-md bg-[#4dff88]/20 text-[#4dff88] hover:bg-[#4dff88]/30 transition-colors animate-pulse flex items-center gap-1.5"
          onClick={onAutoComplete}
          title="Auto Complete!"
        >
          <Sparkles className="w-5 h-5" />
          <span className="hidden md:inline text-xs">Auto</span>
        </button>
      )}

      {gameInProgress && canSplit && (
        <button
          className="p-2.5 rounded-md bg-[#b44dff]/20 text-[#b44dff] hover:bg-[#b44dff]/30 transition-colors flex items-center gap-1.5"
          onClick={onSplitTimeline}
          title="Split Timeline"
        >
          <GitBranch className="w-5 h-5" />
          <span className="hidden md:inline text-xs">Split</span>
        </button>
      )}

      {gameInProgress && (
        <button
          className="p-2.5 rounded-md bg-red-900/30 text-red-400/60 hover:bg-red-900/50 hover:text-red-400 transition-colors flex items-center gap-1.5"
          onClick={onResign}
          title="Resign"
        >
          <Flag className="w-5 h-5" />
          <span className="hidden md:inline text-xs">Resign</span>
        </button>
      )}

      <div className="w-px h-5 bg-indigo-700/50" />

      <button
        className="p-2.5 rounded-md bg-indigo-900/50 text-indigo-300/80 hover:text-indigo-300 hover:bg-indigo-800/60 transition-colors flex items-center gap-1.5"
        onClick={onHelp}
        title="How to Play"
      >
        <HelpCircle className="w-5 h-5" />
        <span className="hidden md:inline text-xs">Help</span>
      </button>

      <span className="text-[11px] text-indigo-300/80 font-mono">
        Moves: {moves}
      </span>
    </div>
  )
}
