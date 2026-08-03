import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Card as CardModel, ColumnIndex } from '@/engine/types'
import { useMotionPreset } from '@/animation/useMotionPreset'
import { CardLayer } from '@/components/cards/CardLayer'
import { ColumnDropZones } from '@/components/board/ColumnDropZones'
import type { ColumnDropZonesHandle } from '@/components/board/ColumnDropZones'
import { Foundations } from '@/components/board/Foundations'
import { Stock } from '@/components/board/Stock'
import { TopBar } from '@/components/chrome/TopBar'
import { usePointerDrag } from '@/interaction/usePointerDrag'
import { useKeyboardShortcuts } from '@/interaction/useKeyboardShortcuts'
import {
  computeBoardMetrics,
  computeLayout,
  type ViewportSize,
} from '@/layout/computeLayout'
import { useGameStore } from '@/state/gameStore'
import { useSettingsStore } from '@/state/settingsStore'
import { useUiStore } from '@/state/uiStore'
import './Board.css'

function useViewport(): ViewportSize {
  const [vp, setVp] = useState<ViewportSize>(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1280,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  }))
  useEffect(() => {
    const sync = () => {
      setVp({ width: window.innerWidth, height: window.innerHeight })
    }
    sync()
    window.addEventListener('resize', sync)
    return () => {
      window.removeEventListener('resize', sync)
    }
  }, [])
  return vp
}

export function Board() {
  const handle = useGameStore((s) => s.handle)
  const attemptMove = useGameStore((s) => s.attemptMove)
  const tapMove = useGameStore((s) => s.tapMove)
  const dealStock = useGameStore((s) => s.dealStock)
  const canDealStock = useGameStore((s) => s.canDealStock)
  const dealsLeft = useGameStore((s) => s.dealsLeft)
  const movableLength = useGameStore((s) => s.movableLength)
  const bootstrap = useGameStore((s) => s.newGame)

  const selectedRun = useUiStore((s) => s.selectedRun)
  const setSelectedRun = useUiStore((s) => s.setSelectedRun)
  const clearSelection = useUiStore((s) => s.clearSelection)
  const hintMove = useUiStore((s) => s.hintMove)
  const reducedMotion = useSettingsStore((s) => s.reducedMotion)

  const viewport = useViewport()
  const preset = useMotionPreset(reducedMotion)
  const metrics = useMemo(() => computeBoardMetrics(viewport), [viewport])
  const placements = useMemo(
    () => computeLayout(handle.state, viewport),
    [handle.state, viewport],
  )

  const dropZonesRef = useRef<ColumnDropZonesHandle>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [draggingIds, setDraggingIds] = useState<ReadonlySet<string>>(new Set())
  const liftRef = useRef(0)
  const booted = useRef(false)

  useEffect(() => {
    if (booted.current) return
    booted.current = true
    bootstrap()
  }, [bootstrap])

  useKeyboardShortcuts()

  const { onPointerDown } = usePointerDrag({
    getColumnRects: () => dropZonesRef.current?.getRects() ?? [],
    onCommand: (command, state) => {
      if (command.type === 'startDrag') {
        liftRef.current = command.liftY
        setDraggingIds(new Set(command.cardIds))
        if (state.phase === 'dragging') {
          setDragOffset({ x: state.dx, y: state.dy + command.liftY })
        }
      } else if (command.type === 'move') {
        setDragOffset({ x: command.dx, y: command.dy + liftRef.current })
      } else if (command.type === 'drop') {
        if (
          command.targetColumn !== null &&
          command.targetColumn !== command.fromColumn
        ) {
          attemptMove({
            kind: 'moveRun',
            from: command.fromColumn as ColumnIndex,
            to: command.targetColumn as ColumnIndex,
            count: command.count,
          })
        }
        setDraggingIds(new Set())
        setDragOffset({ x: 0, y: 0 })
        liftRef.current = 0
      } else if (command.type === 'tap') {
        const from = command.fromColumn as ColumnIndex
        setSelectedRun({
          column: from,
          count: command.count,
          cardIds: command.cardIds as never,
        })
        tapMove(from, command.count)
        setDraggingIds(new Set())
        setDragOffset({ x: 0, y: 0 })
        liftRef.current = 0
      } else if (command.type === 'cancel') {
        clearSelection()
        setDraggingIds(new Set())
        setDragOffset({ x: 0, y: 0 })
        liftRef.current = 0
      }
    },
  })

  const onCardPointerDown = useCallback(
    (
      event: React.PointerEvent,
      _card: CardModel,
      column: number,
      indexInColumn: number,
    ) => {
      const col = handle.state.columns[column]
      if (!col) return
      const max = movableLength(column)
      const fromTail = col.length - indexInColumn
      if (fromTail > max || fromTail < 1) return
      const count = fromTail
      const cardIds = col.slice(col.length - count).map((c) => c.id)
      onPointerDown(event, {
        cardIds,
        fromColumn: column as ColumnIndex,
        count,
      })
    },
    [handle.state.columns, movableLength, onPointerDown],
  )

  const hintCardIds = useMemo(() => {
    const ids = new Set<string>()
    if (hintMove?.kind !== 'moveRun') return ids
    const col = handle.state.columns[hintMove.from]
    if (!col) return ids
    for (const c of col.slice(col.length - hintMove.count)) ids.add(c.id)
    return ids
  }, [hintMove, handle.state.columns])

  const selectedCardIds = useMemo(() => {
    const ids = new Set<string>()
    if (!selectedRun) return ids
    for (const id of selectedRun.cardIds) ids.add(id)
    return ids
  }, [selectedRun])

  const portraitNarrow = viewport.width < 900 && viewport.height > viewport.width
  const boardHeight = Math.max(
    200,
    viewport.height - metrics.topBarHeight - metrics.padY * 2,
  )

  return (
    <div className="board-shell">
      <TopBar />
      {portraitNarrow ? <p className="rotate-hint">Rotate for a better view</p> : null}
      <div
        className="board"
        style={{
          ['--card-w' as string]: `${metrics.cardWidth}px`,
          ['--card-h' as string]: `${metrics.cardHeight}px`,
          height: boardHeight,
        }}
        onContextMenu={(e) => {
          e.preventDefault()
        }}
      >
        <Foundations
          filled={handle.state.foundations.length}
          xs={metrics.foundationXs}
          y={metrics.stockY}
          width={metrics.cardWidth}
          height={metrics.cardHeight}
        />
        <Stock
          dealsLeft={dealsLeft()}
          x={metrics.stockX}
          y={metrics.stockY}
          width={metrics.cardWidth}
          height={metrics.cardHeight}
          disabled={!canDealStock()}
          onDeal={() => {
            dealStock()
          }}
        />
        <ColumnDropZones
          ref={dropZonesRef}
          columnXs={metrics.columnXs}
          columnsY={metrics.columnsY}
          cardWidth={metrics.cardWidth}
          height={boardHeight - metrics.columnsY}
        />
        <CardLayer
          state={handle.state}
          placements={placements}
          cardWidth={metrics.cardWidth}
          cardHeight={metrics.cardHeight}
          transition={preset.snap}
          hintCardIds={hintCardIds}
          selectedCardIds={selectedCardIds}
          draggingIds={draggingIds}
          dragOffset={dragOffset}
          onCardPointerDown={onCardPointerDown}
        />
      </div>
    </div>
  )
}
