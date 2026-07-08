import { motion, AnimatePresence } from 'framer-motion'
import { X, MousePointer2, GripHorizontal, Undo2, Lightbulb, Sparkles, GitBranch, Target, Trophy, Play } from 'lucide-react'
import { useState } from 'react'

interface HowToPlayProps {
  visible: boolean
  onClose: () => void
}

const sections = [
  {
    id: 'basics',
    title: 'Basics',
    icon: Play,
    color: '#00f0ff',
    content: (
      <div className="space-y-2 text-sm text-indigo-300/80">
        <p>Spider Solitaire uses <strong className="text-white">2 decks</strong> (104 cards) dealt across <strong className="text-white">10 columns</strong>.</p>
        <p>Build sequences from <strong className="text-white">King down to Ace</strong> in the same suit.</p>
        <p>Complete a full K-to-A sequence to <strong className="text-[#ffd700]">clear</strong> it from the board. Clear all <strong className="text-white">8 sequences</strong> to win!</p>
        <div className="mt-2 p-2 rounded bg-white/5 border border-indigo-700/20">
          <p className="text-xs text-indigo-400/60 mb-1">Game Modes:</p>
          <div className="flex gap-2 text-xs">
            <span className="px-2 py-0.5 rounded bg-emerald-600/30 text-emerald-400">Easy: 1 Suit (Spades)</span>
            <span className="px-2 py-0.5 rounded bg-amber-600/30 text-amber-400">Medium: 2 Suits</span>
            <span className="px-2 py-0.5 rounded bg-red-600/30 text-red-400">Hard: 4 Suits</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'movement',
    title: 'Moving Cards',
    icon: MousePointer2,
    color: '#b44dff',
    content: (
      <div className="space-y-2 text-sm text-indigo-300/80">
        <p><strong className="text-white">Two ways to move cards:</strong></p>

        <div className="flex items-start gap-2 p-2 rounded bg-white/5 border border-indigo-700/20">
          <GripHorizontal className="w-4 h-4 text-[#b44dff] mt-0.5 flex-shrink-0" />
          <div className="text-xs">
            <p className="text-white font-medium mb-0.5">Drag & Drop</p>
            <p>Press and drag any face-up card. A ghost card follows your cursor. Drop onto a valid column (it glows cyan) to move.</p>
          </div>
        </div>

        <div className="flex items-start gap-2 p-2 rounded bg-white/5 border border-indigo-700/20">
          <MousePointer2 className="w-4 h-4 text-[#00f0ff] mt-0.5 flex-shrink-0" />
          <div className="text-xs">
            <p className="text-white font-medium mb-0.5">Click to Move</p>
            <p>Click a card to select it (cyan glow). Click another column to move the selected cards there. Click the same card again to deselect.</p>
          </div>
        </div>

        <ul className="space-y-1 text-xs list-disc pl-4">
          <li>Cards can be placed on a card <strong className="text-white">1 rank higher</strong> (any suit)</li>
          <li>Groups can only move together if <strong className="text-white">same suit + descending order</strong></li>
          <li>Empty columns accept <strong className="text-white">any card or valid run</strong></li>
        </ul>
      </div>
    ),
  },
  {
    id: 'stock',
    title: 'Stock & Dealing',
    icon: Play,
    color: '#4dff88',
    content: (
      <div className="space-y-2 text-sm text-indigo-300/80">
        <p>The <strong className="text-white">stock pile</strong> (top-left) contains 50 cards.</p>
        <p>Click to <strong className="text-white">deal 1 card face-up to each column</strong>.</p>
        <p className="text-xs text-amber-400/80">Cannot deal if any column is empty — fill empty columns first!</p>
        <p className="text-xs text-indigo-400/60">5 total deals available (each deals 10 cards).</p>
      </div>
    ),
  },
  {
    id: 'tools',
    title: 'Tools & Hints',
    icon: Lightbulb,
    color: '#ffd700',
    content: (
      <div className="space-y-2 text-sm text-indigo-300/80">
        <div className="flex items-center gap-2">
          <Undo2 className="w-4 h-4 text-indigo-400" />
          <span className="text-xs"><strong className="text-white">Undo / Redo</strong> — unlimited, goes back through your entire move history</span>
        </div>
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-[#ffd700]" />
          <span className="text-xs"><strong className="text-white">Hint</strong> — highlights a suggested move. Press again to cycle through all valid moves (prioritizes same-suit moves)</span>
        </div>
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#4dff88]" />
          <span className="text-xs"><strong className="text-white">Auto-Complete</strong> — appears when all cards are face-up and stock is empty. Finishes the game automatically</span>
        </div>
      </div>
    ),
  },
  {
    id: 'quantum',
    title: 'The Quantum Deck',
    icon: GitBranch,
    color: '#b44dff',
    content: (
      <div className="space-y-2 text-sm text-indigo-300/80">
        <p className="text-white font-medium">An industry-first feature!</p>
        <p>Hit a tough decision? <strong className="text-white">Split your timeline</strong> to explore a different strategy.</p>
        
        <div className="p-2 rounded bg-white/5 border border-indigo-700/20 space-y-1 text-xs">
          <p><strong className="text-white">1.</strong> Click <GitBranch className="w-3 h-3 inline text-[#b44dff]" /> <strong className="text-white">Split Timeline</strong> in the controls bar</p>
          <p><strong className="text-white">2.</strong> A new tab appears above the board (Alpha, Beta, Gamma)</p>
          <p><strong className="text-white">3.</strong> Play down your new timeline — your original is saved</p>
          <p><strong className="text-white">4.</strong> Click any tab to <strong className="text-white">instantly switch</strong> between parallel universes</p>
          <p><strong className="text-white">5.</strong> Compare outcomes and pick the best path!</p>
        </div>
        
        <p className="text-xs text-indigo-400/60">Up to 3 parallel timelines simultaneously.</p>
      </div>
    ),
  },
  {
    id: 'insights',
    title: 'Nebula Insights',
    icon: Target,
    color: '#ffd700',
    content: (
      <div className="space-y-2 text-sm text-indigo-300/80">
        <p>When a game ends, you&apos;ll see a <strong className="text-white">post-game review</strong> analyzing every move:</p>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs">
            <Sparkles className="w-3 h-3 text-[#ffd700]" />
            <span><strong className="text-[#ffd700]">Brilliant</strong> — only move to reveal a hidden card</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Sparkles className="w-3 h-3 text-[#4dff88]" />
            <span><strong className="text-[#4dff88]">Excellent</strong> — top-tier strategic play</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Sparkles className="w-3 h-3 text-[#00f0ff]" />
            <span><strong className="text-[#00f0ff]">Good</strong> — solid progression</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span><strong className="text-amber-400">Inaccuracy</strong> — suboptimal, better move available</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Sparkles className="w-3 h-3 text-red-400" />
            <span><strong className="text-red-400">Blunder</strong> — significant strategic mistake</span>
          </div>
        </div>

        <p className="text-xs text-indigo-400/60">Includes accuracy %, win-probability graph, and clickable move-by-move review with board snapshots.</p>
      </div>
    ),
  },
]

export default function HowToPlay({ visible, onClose }: HowToPlayProps) {
  const [activeSection, setActiveSection] = useState('basics')

  const active = sections.find(s => s.id === activeSection) || sections[0]

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
                       rounded-2xl max-w-xl w-full mx-4 max-h-[85vh] overflow-hidden
                       shadow-[0_0_60px_rgba(0,240,255,0.08)] flex flex-col"
            initial={{ scale: 0.9, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 30 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-indigo-800/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#00f0ff]/10 border border-[#00f0ff]/20 flex items-center justify-center">
                  <Trophy className="w-4 h-4 text-[#00f0ff]" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">How to Play</h2>
                  <p className="text-xs text-indigo-400/60">Spider Solitaire — Quantum Edition</p>
                </div>
              </div>
              <button
                className="p-1.5 rounded-md hover:bg-white/10 text-indigo-400 transition-colors"
                onClick={onClose}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Section tabs */}
            <div className="px-4 py-2 border-b border-indigo-800/10 flex gap-1 overflow-x-auto">
              {sections.map(s => {
                const Icon = s.icon
                const isActive = activeSection === s.id
                return (
                  <button
                    key={s.id}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap
                      ${isActive
                        ? 'bg-white/10 text-white'
                        : 'text-indigo-400/60 hover:text-indigo-300 hover:bg-white/[0.04]'
                      }
                    `}
                    onClick={() => setActiveSection(s.id)}
                  >
                    <Icon className="w-3.5 h-3.5" style={{ color: isActive ? s.color : undefined }} />
                    {s.title}
                  </button>
                )
              })}
            </div>

            {/* Content */}
            <div className="px-6 py-4 overflow-y-auto flex-1">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                {active.content}
              </motion.div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-indigo-800/20 flex items-center justify-between">
              <p className="text-xs text-indigo-400/40">Quantum Timeline & Nebula Insights</p>
              <button
                className="px-4 py-2 rounded-lg bg-[#00f0ff]/20 border border-[#00f0ff]/40
                           text-[#00f0ff] font-medium hover:bg-[#00f0ff]/30 transition-all text-sm"
                onClick={onClose}
              >
                Got it!
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
