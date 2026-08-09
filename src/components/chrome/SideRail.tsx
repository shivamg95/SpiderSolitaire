import { useEffect, useState } from 'react'
import clsx from 'clsx'
import { Stock } from '@/components/board/Stock'
import { FOUNDATION_SLOTS } from '@/layout/constants'
import type { BoardMetrics } from '@/layout/computeLayout'
import { useGameStore } from '@/state/gameStore'
import { useUiStore } from '@/state/uiStore'
import './SideRail.css'

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, '0')}`
}

type IconName = 'undo' | 'redo' | 'hint' | 'menu'

function RailIcon({ name }: { name: IconName }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="side-rail__icon"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {name === 'undo' ? (
        <>
          <path d="M4.5 9h9.3a5.6 5.6 0 0 1 0 11.2H8.3" />
          <path d="M8.6 4.4 4 9l4.6 4.6" />
        </>
      ) : null}
      {name === 'redo' ? (
        <>
          <path d="M19.5 9h-9.3a5.6 5.6 0 0 0 0 11.2h5.5" />
          <path d="M15.4 4.4 20 9l-4.6 4.6" />
        </>
      ) : null}
      {name === 'hint' ? (
        <>
          <path d="M12 2.8a6.3 6.3 0 0 0-3.7 11.4c.6.43.97 1.08 1.02 1.8H14.7c.05-.72.42-1.37 1.02-1.8A6.3 6.3 0 0 0 12 2.8Z" />
          <path d="M9.5 19.1h5" />
          <path d="M10.5 21.5h3" />
        </>
      ) : null}
      {name === 'menu' ? (
        <>
          <path d="M4 7h16" />
          <path d="M4 12h16" />
          <path d="M4 17h16" />
        </>
      ) : null}
    </svg>
  )
}

export interface SideRailProps {
  readonly metrics: BoardMetrics
  readonly foundationsFilled: number
  readonly panelOpen: boolean
  readonly pulseDeal?: boolean
}

export function SideRail({
  metrics,
  foundationsFilled,
  panelOpen,
  pulseDeal = false,
}: SideRailProps) {
  const handle = useGameStore((s) => s.handle)
  const startedAt = useGameStore((s) => s.startedAt)
  const undo = useGameStore((s) => s.undo)
  const redo = useGameStore((s) => s.redo)
  const canUndo = useGameStore((s) => s.canUndo)
  const canRedo = useGameStore((s) => s.canRedo)
  const requestHint = useGameStore((s) => s.requestHint)
  const dealStock = useGameStore((s) => s.dealStock)
  const canDealStock = useGameStore((s) => s.canDealStock)
  const dealsLeft = useGameStore((s) => s.dealsLeft)
  const openPanelById = useUiStore((s) => s.openPanelById)
  const hintPlaying = useUiStore((s) => s.hintPlaying)

  const [now, setNow] = useState(() => startedAt)
  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(Date.now())
    }, 1000)
    return () => {
      window.clearInterval(id)
    }
  }, [startedAt])

  const elapsed = Math.max(0, now - startedAt)
  const isBottom = metrics.layoutMode === 'bottom'
  const pileTop =
    foundationsFilled > 0
      ? (metrics.foundationYs[foundationsFilled - 1] ?? metrics.columnsY) +
        metrics.railCardHeight
      : metrics.padY
  const foundationReserve = isBottom ? 0 : Math.max(metrics.padY, pileTop - metrics.railY)

  const remaining = dealsLeft()
  const dealDisabled = panelOpen || !canDealStock()

  return (
    <aside
      className={clsx('side-rail', isBottom && 'side-rail--bottom')}
      style={{
        left: metrics.railX,
        top: metrics.railY,
        width: metrics.railWidth,
        height: metrics.railHeight,
        ['--rail-h' as string]: `${metrics.railHeight}px`,
        ['--foundation-reserve' as string]: `${foundationReserve}px`,
      }}
      aria-label="Game controls"
    >
      {!isBottom ? (
        <div
          className="side-rail__foundations"
          style={{ height: foundationReserve }}
          aria-live="polite"
          aria-label={`Foundations ${foundationsFilled} of ${FOUNDATION_SLOTS}`}
        />
      ) : (
        <div
          className="side-rail__foundations side-rail__foundations--inline"
          aria-live="polite"
          aria-label={`Foundations ${foundationsFilled} of ${FOUNDATION_SLOTS}`}
        />
      )}

      <div className="side-rail__middle">
        <div className="side-rail__stats" aria-live="polite">
          <span title="Score">
            <em>S</em> {handle.state.score}
          </span>
          <span title="Moves">
            <em>M</em> {handle.state.moveCount}
          </span>
          <span title="Time">{formatTime(elapsed)}</span>
        </div>
        <div className="side-rail__actions">
          <button
            type="button"
            className="side-rail__btn"
            onClick={() => undo()}
            disabled={!canUndo()}
            aria-label="Undo"
            title="Undo"
          >
            <RailIcon name="undo" />
          </button>
          <button
            type="button"
            className="side-rail__btn"
            onClick={() => redo()}
            disabled={!canRedo()}
            aria-label="Redo"
            title="Redo"
          >
            <RailIcon name="redo" />
          </button>
          <button
            type="button"
            className={clsx(
              'side-rail__btn',
              'side-rail__btn--hint',
              hintPlaying && 'side-rail__btn--active',
            )}
            onClick={() => requestHint()}
            aria-label={hintPlaying ? 'Stop hint' : 'Hint'}
            aria-pressed={hintPlaying}
            title="Hint"
          >
            <RailIcon name="hint" />
          </button>
          <button
            type="button"
            className="side-rail__btn side-rail__btn--menu"
            onClick={() => {
              openPanelById('settings')
            }}
            aria-label="Menu"
            title="Menu"
          >
            <RailIcon name="menu" />
          </button>
        </div>
      </div>

      <div className="side-rail__stock">
        <Stock
          dealsLeft={remaining}
          x={metrics.stockX - metrics.railX}
          y={metrics.stockY - metrics.railY}
          width={metrics.railCardWidth}
          height={metrics.railCardHeight}
          disabled={dealDisabled}
          pulse={pulseDeal}
          onDeal={() => {
            if (panelOpen) return
            dealStock()
          }}
        />
      </div>
    </aside>
  )
}
