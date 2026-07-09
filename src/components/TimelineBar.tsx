import { Plus, GitBranch } from 'lucide-react'

interface TimelineBarProps {
  timelines: { name: string }[]
  activeIndex: number
  maxTimelines: number
  onSwitch: (index: number) => void
  onSplit: () => void
  visible: boolean
  vertical?: boolean
}

const COLORS = ['#00f0ff', '#b44dff', '#4dff88']

export default function TimelineBar({ timelines, activeIndex, maxTimelines, onSwitch, onSplit, visible, vertical }: TimelineBarProps) {
  if (!visible) return null

  if (vertical) {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        <div className="flex items-center gap-1.5">
          <GitBranch className="w-3 h-3 text-indigo-500/60" />
          <span className="text-[10px] uppercase tracking-wider text-indigo-400/60 font-semibold">Timelines</span>
        </div>
        {timelines.map((tl, idx) => (
          <button
            key={idx}
            className={`
              flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-all text-left w-full
              ${idx === activeIndex
                ? 'bg-white/[0.06] border border-indigo-600/30 text-white'
                : 'bg-transparent border border-transparent text-indigo-300/80 hover:text-indigo-300 hover:bg-white/[0.03]'
              }
            `}
            onClick={() => onSwitch(idx)}
          >
            <span
              className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: COLORS[idx % COLORS.length] }}
            />
            {tl.name}
          </button>
        ))}
        {timelines.length < maxTimelines && (
          <button
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs text-indigo-300/60 hover:text-[#00f0ff] hover:bg-white/[0.05] transition-all"
            onClick={onSplit}
          >
            <Plus className="w-3.5 h-3.5" />
            New Timeline
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-0.5 px-3 py-1 bg-black/20 border-b border-indigo-800/10">
      <GitBranch className="w-3 h-3 text-indigo-500/60 mr-2" />

      {timelines.map((tl, idx) => (
        <button
          key={idx}
          className={`
            relative px-3 py-2 text-xs font-medium rounded-t-md border border-b-0 transition-all
            ${idx === activeIndex
              ? 'bg-white/[0.06] border-indigo-600/30 text-white'
              : 'bg-transparent border-transparent text-indigo-300/80 hover:text-indigo-300 hover:bg-white/[0.03]'
            }
          `}
          onClick={() => onSwitch(idx)}
        >
          <span
            className="inline-block w-1.5 h-1.5 rounded-full mr-1.5"
            style={{ backgroundColor: COLORS[idx % COLORS.length] }}
          />
          {tl.name}
        </button>
      ))}

      {timelines.length < maxTimelines && (
        <button
          className="ml-1 p-2.5 rounded-md text-indigo-300/60 hover:text-[#00f0ff] hover:bg-white/[0.05] transition-all"
          onClick={onSplit}
          title="Split Timeline"
        >
          <Plus className="w-5 h-5" />
        </button>
      )}
    </div>
  )
}
