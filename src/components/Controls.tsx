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

const toolbarBtn = 'flex items-center gap-1.5 px-2.5 py-2 rounded-md text-xs font-medium transition-colors'
const toolbarBtnDisabled = ' opacity-30 cursor-not-allowed'
const iconBase = 'w-4 h-4'

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
    <div className="flex gap-1">
      {(Object.keys(MODE_LABELS) as GameMode[]).map((mode) => (
        <button
          key={mode}
          className={`${short ? 'px-2 py-1.5 text-[10px]' : 'px-3 py-1.5 text-xs'} rounded-md transition-colors font-medium
            ${selectedMode === mode
              ? `${MODE_COLORS[mode]} text-white shadow-[0_0_10px_rgba(0,240,255,0.15)]`
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
    <div className="flex items-center justify-between w-full max-w-4xl gap-2">
      {/* Left: Mode + New Game */}
      <div className="flex items-center gap-2">
        <div className="hidden md:flex">{modeButtons(false)}</div>
        <div className="md:hidden">{modeButtons(true)}</div>

        <button
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all
            ${selectedMode
              ? 'bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/40 hover:bg-[#00f0ff]/30'
              : 'bg-indigo-900/50 text-indigo-300 hover:bg-indigo-800/60'
            }
          `}
          onClick={() => selectedMode && onNewGame(selectedMode)}
        >
          <Play className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Game</span>
          <span className="sm:hidden">New</span>
        </button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5">
        {/* Undo / Redo */}
        <div className="flex items-center gap-1 rounded-lg bg-indigo-950/40 p-1 border border-indigo-800/20">
          <button
            className={`${toolbarBtn} bg-indigo-900/50 text-indigo-300 hover:bg-indigo-800/60${(!hasUndo || !gameInProgress) ? toolbarBtnDisabled : ''}`}
            onClick={onUndo}
            disabled={!hasUndo || !gameInProgress}
            title="Undo"
          >
            <Undo2 className={iconBase} />
            <span className="hidden lg:inline">Undo</span>
          </button>
          <button
            className={`${toolbarBtn} bg-indigo-900/50 text-indigo-300 hover:bg-indigo-800/60${(!hasRedo || !gameInProgress) ? toolbarBtnDisabled : ''}`}
            onClick={onRedo}
            disabled={!hasRedo || !gameInProgress}
            title="Redo"
          >
            <Redo2 className={iconBase} />
            <span className="hidden lg:inline">Redo</span>
          </button>
        </div>

        {/* Desktop action buttons */}
        <div className="hidden md:flex items-center gap-1">
          <button
            className={`${toolbarBtn} bg-indigo-900/50 text-indigo-300 hover:bg-indigo-800/60${!gameInProgress ? toolbarBtnDisabled : ''}`}
            onClick={onHint}
            disabled={!gameInProgress}
            title="Hint"
          >
            <Lightbulb className={iconBase} />
            <span className="hidden lg:inline">Hint</span>
          </button>

          {canAutoComplete && (
            <button
              className={`${toolbarBtn} bg-[#4dff88]/20 text-[#4dff88] hover:bg-[#4dff88]/30 animate-pulse`}
              onClick={onAutoComplete}
              title="Auto Complete!"
            >
              <Sparkles className={iconBase} />
              <span className="hidden lg:inline">Auto</span>
            </button>
          )}

          {gameInProgress && canSplit && (
            <button
              className={`${toolbarBtn} bg-[#b44dff]/20 text-[#b44dff] hover:bg-[#b44dff]/30`}
              onClick={onSplitTimeline}
              title="Split Timeline"
            >
              <GitBranch className={iconBase} />
              <span className="hidden lg:inline">Split</span>
            </button>
          )}

          {gameInProgress && (
            <button
              className={`${toolbarBtn} bg-red-900/30 text-red-400/80 hover:bg-red-900/50 hover:text-red-400`}
              onClick={onResign}
              title="Resign"
            >
              <Flag className={iconBase} />
              <span className="hidden lg:inline">Resign</span>
            </button>
          )}

          <button
            className={`${toolbarBtn} bg-indigo-900/50 text-indigo-300/80 hover:text-indigo-300 hover:bg-indigo-800/60`}
            onClick={onHelp}
            title="How to Play"
          >
            <HelpCircle className={iconBase} />
            <span className="hidden lg:inline">Help</span>
          </button>
        </div>

        {/* Mobile "More" dropdown */}
        <div className="md:hidden relative" ref={menuRef}>
          <button
            className="flex items-center gap-1 px-2 py-1.5 rounded-md bg-indigo-900/50 text-indigo-300 hover:bg-indigo-800/60 transition-colors text-xs font-medium"
            onClick={() => setMenuOpen(!menuOpen)}
            title="More"
          >
            <MoreHorizontal className="w-4 h-4" />
            <span>More</span>
          </button>
          {menuOpen && (
            <div className="absolute top-full right-0 mt-1 py-1 rounded-md bg-indigo-950/95 border border-indigo-800/50 shadow-xl z-50 min-w-[140px]">
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
    </div>
  )
}
