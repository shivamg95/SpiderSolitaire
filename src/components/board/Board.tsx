import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import type { Card as CardModel, ColumnIndex } from '@/engine/types'
import { useMotionPreset } from '@/animation/useMotionPreset'
import { CardLayer } from '@/components/cards/CardLayer'
import { HintGhostLayer } from '@/components/cards/HintGhostLayer'
import { ColumnDropZones } from '@/components/board/ColumnDropZones'
import type { ColumnDropZonesHandle } from '@/components/board/ColumnDropZones'
import { SideRail } from '@/components/chrome/SideRail'
import { usePointerDrag } from '@/interaction/usePointerDrag'
import { useKeyboardShortcuts } from '@/interaction/useKeyboardShortcuts'
import {
  computeBoardMetrics,
  computeLayout,
  type ViewportSize,
} from '@/layout/computeLayout'
import { FOUNDATION_SLOTS } from '@/layout/constants'
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
  const movableLength = useGameStore((s) => s.movableLength)

  const selectedRun = useUiStore((s) => s.selectedRun)
  const setSelectedRun = useUiStore((s) => s.setSelectedRun)
  const clearSelection = useUiStore((s) => s.clearSelection)
  const hintMove = useUiStore((s) => s.hintMove)
  const hintIndex = useUiStore((s) => s.hintIndex)
  const hintPlaying = useUiStore((s) => s.hintPlaying)
  const advanceHint = useUiStore((s) => s.advanceHint)
  const openPanel = useUiStore((s) => s.openPanel)
  const reducedMotion = useSettingsStore((s) => s.reducedMotion)
  const panelOpen = openPanel !== null

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
  const [targetColumn, setTargetColumn] = useState<number | null>(null)
  const liftRef = useRef(0)

  useKeyboardShortcuts()

  const emptyColumns = useMemo(() => {
    const empty = new Set<number>()
    for (let i = 0; i < handle.state.columns.length; i++) {
      if ((handle.state.columns[i] ?? []).length === 0) empty.add(i)
    }
    return empty
  }, [handle.state.columns])

  const tableauHeight =
    metrics.layoutMode === 'rail'
      ? metrics.boardHeight - metrics.columnsY
      : Math.max(0, metrics.railY - metrics.columnsY)

  const availableColumnHeight = Math.max(metrics.cardHeight, tableauHeight - metrics.padY)

  const { onPointerDown } = usePointerDrag({
    getColumnRects: () => dropZonesRef.current?.getRects() ?? [],
    maxDropDistance: () => metrics.cardWidth * 1.5,
    onPointerMove: (_point, column) => {
      setTargetColumn(column)
    },
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
        setTargetColumn(null)
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
        setTargetColumn(null)
        liftRef.current = 0
      } else if (command.type === 'cancel') {
        clearSelection()
        setDraggingIds(new Set())
        setDragOffset({ x: 0, y: 0 })
        setTargetColumn(null)
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
      if (panelOpen) return
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
    [handle.state.columns, movableLength, onPointerDown, panelOpen],
  )

  const selectedCardIds = useMemo(() => {
    const ids = new Set<string>()
    if (!selectedRun) return ids
    for (const id of selectedRun.cardIds) ids.add(id)
    return ids
  }, [selectedRun])

  const foundationsFilled = handle.state.foundations.length
  const pulseDeal = hintPlaying && hintMove?.kind === 'dealStock'

  return (
    <div
      className={clsx('board-shell', panelOpen && 'board-shell--modal-open')}
      aria-hidden={panelOpen || undefined}
      inert={panelOpen || undefined}
    >
      <h1 className="sr-only">Spider Solitaire</h1>
      <div
        className="board"
        style={{
          ['--card-w' as string]: `${metrics.cardWidth}px`,
          ['--card-h' as string]: `${metrics.cardHeight}px`,
          height: metrics.boardHeight,
        }}
        onContextMenu={(e) => {
          e.preventDefault()
        }}
      >
        <span className="foundation-live" aria-live="polite">
          Foundations {foundationsFilled} of {FOUNDATION_SLOTS}
        </span>
        <ColumnDropZones
          ref={dropZonesRef}
          columnXs={metrics.columnXs}
          columnsY={metrics.columnsY}
          cardWidth={metrics.cardWidth}
          cardHeight={metrics.cardHeight}
          height={tableauHeight}
          emptyColumns={emptyColumns}
          targetColumn={draggingIds.size > 0 ? targetColumn : null}
        />
        <CardLayer
          state={handle.state}
          placements={placements}
          cardWidth={metrics.cardWidth}
          cardHeight={metrics.cardHeight}
          transition={preset.snap}
          selectedCardIds={selectedCardIds}
          draggingIds={draggingIds}
          dragOffset={dragOffset}
          onCardPointerDown={onCardPointerDown}
        />
        <HintGhostLayer
          state={handle.state}
          move={hintMove}
          hintIndex={hintIndex}
          playing={hintPlaying}
          placements={placements}
          metrics={metrics}
          availableColumnHeight={availableColumnHeight}
          transition={preset.deal}
          reducedMotion={reducedMotion || preset.reduced}
          onCycleComplete={advanceHint}
        />
        <SideRail
          metrics={metrics}
          foundationsFilled={foundationsFilled}
          panelOpen={panelOpen}
          pulseDeal={pulseDeal}
        />
      </div>
    </div>
  )
}
