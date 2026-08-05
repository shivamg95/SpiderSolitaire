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

export interface SideRailProps {
  readonly metrics: BoardMetrics
  readonly foundationsFilled: number
  readonly panelOpen: boolean
}

export function SideRail({ metrics, foundationsFilled, panelOpen }: SideRailProps) {
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
            ↶
          </button>
          <button
            type="button"
            className="side-rail__btn"
            onClick={() => redo()}
            disabled={!canRedo()}
            aria-label="Redo"
            title="Redo"
          >
            ↷
          </button>
          <button
            type="button"
            className="side-rail__btn"
            onClick={() => requestHint()}
            aria-label="Hint"
            title="Hint"
          >
            ?
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
            ⋯
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
          pulse={false}
          onDeal={() => {
            if (panelOpen) return
            dealStock()
          }}
        />
      </div>
    </aside>
  )
}
