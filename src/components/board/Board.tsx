import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import type { Card as CardModel, ColumnIndex } from '@/engine/types'
import { MOVE_MS, RUN_STAGGER_MAX_MS, RUN_STAGGER_MS } from '@/animation/springs'
import { useMotionPreset } from '@/animation/useMotionPreset'
import { CardLayer } from '@/components/cards/CardLayer'
import { HintGhostLayer } from '@/components/cards/HintGhostLayer'
import { ColumnDropZones } from '@/components/board/ColumnDropZones'
import type { ColumnDropZonesHandle } from '@/components/board/ColumnDropZones'
import { BURST_MS, FoundationBurst } from '@/components/board/FoundationBurst'
import { SideRail } from '@/components/chrome/SideRail'
import { usePointerDrag } from '@/interaction/usePointerDrag'
import { useKeyboardShortcuts } from '@/interaction/useKeyboardShortcuts'
import {
  computeBoardMetrics,
  computeLayout,
  type ViewportSize,
} from '@/layout/computeLayout'
import { readViewportSize } from '@/layout/viewport'
import { FOUNDATION_SLOTS } from '@/layout/constants'
import { useGameStore } from '@/state/gameStore'
import { useSettingsStore } from '@/state/settingsStore'
import { useUiStore } from '@/state/uiStore'
import './Board.css'

const EMPTY_FLIGHT: ReadonlyMap<string, number> = new Map()

/**
 * Fires once each time a new foundation set is completed, held back by `delayMs`
 * so the celebration breaks over the cards as they arrive rather than over an
 * empty slot they are still flying towards.
 */
function useFoundationBurst(
  foundationsFilled: number,
  delayMs: number,
): { key: number; index: number } | null {
  const [seen, setSeen] = useState(foundationsFilled)
  const [pending, setPending] = useState<number | null>(null)
  const [burst, setBurst] = useState<{ key: number; index: number } | null>(null)

  if (seen !== foundationsFilled) {
    setSeen(foundationsFilled)
    if (foundationsFilled > seen) {
      setPending(foundationsFilled)
    } else {
      setPending(null)
      setBurst(null)
    }
  }

  useEffect(() => {
    if (pending === null) return
    const id = window.setTimeout(() => {
      setBurst({ key: pending, index: pending - 1 })
      setPending(null)
    }, delayMs)
    return () => {
      window.clearTimeout(id)
    }
  }, [pending, delayMs])

  useEffect(() => {
    if (!burst) return
    const id = window.setTimeout(() => {
      setBurst(null)
    }, BURST_MS)
    return () => {
      window.clearTimeout(id)
    }
  }, [burst])

  return burst
}

function useViewport(): ViewportSize {
  const [vp, setVp] = useState<ViewportSize>(() =>
    typeof window !== 'undefined' ? readViewportSize() : { width: 1280, height: 800 },
  )
  useEffect(() => {
    const sync = () => {
      setVp(readViewportSize())
    }
    sync()
    window.addEventListener('resize', sync)
    document.addEventListener('fullscreenchange', sync)
    const visual = window.visualViewport
    visual?.addEventListener('resize', sync)
    visual?.addEventListener('scroll', sync)
    return () => {
      window.removeEventListener('resize', sync)
      document.removeEventListener('fullscreenchange', sync)
      visual?.removeEventListener('resize', sync)
      visual?.removeEventListener('scroll', sync)
    }
  }, [])
  return vp
}

export function Board() {
  const handle = useGameStore((s) => s.handle)
  const attemptMove = useGameStore((s) => s.attemptMove)
  const tapMove = useGameStore((s) => s.tapMove)
  const movableLength = useGameStore((s) => s.movableLength)
  const movingIds = useGameStore((s) => s.movingIds)
  const moveSeq = useGameStore((s) => s.moveSeq)
  const collecting = useGameStore((s) => s.collecting)

  const selectedRun = useUiStore((s) => s.selectedRun)
  const setSelectedRun = useUiStore((s) => s.setSelectedRun)
  const clearSelection = useUiStore((s) => s.clearSelection)
  const hintMove = useUiStore((s) => s.hintMove)
  const hintIndex = useUiStore((s) => s.hintIndex)
  const hintPlaying = useUiStore((s) => s.hintPlaying)
  const hintQueue = useUiStore((s) => s.hintQueue)
  const hintExplanation = useUiStore((s) => s.hintExplanation)
  const hintConfidence = useUiStore((s) => s.hintConfidence)
  const advanceHint = useUiStore((s) => s.advanceHint)
  const openPanel = useUiStore((s) => s.openPanel)
  const reducedMotion = useSettingsStore((s) => s.reducedMotion)
  const panelOpen = openPanel !== null

  const viewport = useViewport()
  const preset = useMotionPreset(reducedMotion)
  const metrics = useMemo(() => computeBoardMetrics(viewport), [viewport])
  const placements = useMemo(
    () => computeLayout(handle.state, viewport, {}, metrics),
    [handle.state, viewport, metrics],
  )

  const dropZonesRef = useRef<ColumnDropZonesHandle>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [draggingIds, setDraggingIds] = useState<ReadonlySet<string>>(new Set())
  const [targetColumn, setTargetColumn] = useState<number | null>(null)
  const liftRef = useRef(0)
  const pendingOffsetRef = useRef<{ x: number; y: number } | null>(null)
  const pendingColumnRef = useRef<number | null>(null)
  const dragRafRef = useRef<number | null>(null)

  const flushDragFrame = useCallback(() => {
    dragRafRef.current = null
    if (pendingOffsetRef.current) {
      setDragOffset(pendingOffsetRef.current)
      pendingOffsetRef.current = null
    }
    setTargetColumn(pendingColumnRef.current)
  }, [])

  const scheduleDragFrame = useCallback(() => {
    if (dragRafRef.current !== null) return
    dragRafRef.current = window.requestAnimationFrame(flushDragFrame)
  }, [flushDragFrame])

  const resetDragVisuals = useCallback(() => {
    if (dragRafRef.current !== null) {
      window.cancelAnimationFrame(dragRafRef.current)
      dragRafRef.current = null
    }
    pendingOffsetRef.current = null
    pendingColumnRef.current = null
    setDraggingIds(new Set())
    setDragOffset({ x: 0, y: 0 })
    setTargetColumn(null)
    liftRef.current = 0
  }, [])

  useKeyboardShortcuts()

  useEffect(() => {
    return () => {
      if (dragRafRef.current !== null) {
        window.cancelAnimationFrame(dragRafRef.current)
      }
    }
  }, [])

  // Cards keep an elevated z-index and an arced path until their flight lands,
  // otherwise a move that travels leftwards slides behind the columns it crosses.
  const [landedSeq, setLandedSeq] = useState(0)
  const flightOrder = useMemo<ReadonlyMap<string, number>>(() => {
    if (movingIds.length === 0 || landedSeq >= moveSeq) return EMPTY_FLIGHT
    const order = new Map<string, number>()
    movingIds.forEach((id, i) => order.set(id, i))
    return order
  }, [movingIds, moveSeq, landedSeq])

  useEffect(() => {
    if (movingIds.length === 0) return
    const stagger = Math.min((movingIds.length - 1) * RUN_STAGGER_MS, RUN_STAGGER_MAX_MS)
    const id = window.setTimeout(
      () => {
        setLandedSeq(moveSeq)
      },
      preset.reduced ? 120 : MOVE_MS + stagger + 80,
    )
    return () => {
      window.clearTimeout(id)
    }
  }, [moveSeq, movingIds, preset.reduced])

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
      pendingColumnRef.current = column
      scheduleDragFrame()
    },
    onCommand: (command, state) => {
      if (command.type === 'startDrag') {
        liftRef.current = command.liftY
        setDraggingIds(new Set(command.cardIds))
        if (state.phase === 'dragging') {
          pendingOffsetRef.current = { x: state.dx, y: state.dy + command.liftY }
          scheduleDragFrame()
        }
      } else if (command.type === 'move') {
        pendingOffsetRef.current = { x: command.dx, y: command.dy + liftRef.current }
        scheduleDragFrame()
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
        resetDragVisuals()
      } else if (command.type === 'tap') {
        const from = command.fromColumn as ColumnIndex
        setSelectedRun({
          column: from,
          count: command.count,
          cardIds: command.cardIds as never,
        })
        tapMove(from, command.count)
        resetDragVisuals()
      } else if (command.type === 'cancel') {
        clearSelection()
        resetDragVisuals()
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
      if (panelOpen || collecting) return
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
    [collecting, handle.state.columns, movableLength, onPointerDown, panelOpen],
  )

  const selectedCardIds = useMemo(() => {
    const ids = new Set<string>()
    if (!selectedRun) return ids
    for (const id of selectedRun.cardIds) ids.add(id)
    return ids
  }, [selectedRun])

  const hintCardIds = useMemo(() => {
    const ids = new Set<string>()
    if (!hintPlaying) return ids
    const current = hintQueue[hintIndex]
    if (!current) return ids
    for (const id of current.cardIds) ids.add(id)
    return ids
  }, [hintPlaying, hintQueue, hintIndex])

  const foundationsFilled = handle.state.foundations.length
  const pulseDeal = hintPlaying && hintMove?.kind === 'dealStock'

  const burst = useFoundationBurst(foundationsFilled, preset.reduced ? 0 : MOVE_MS)
  const burstSuit =
    burst !== null ? (handle.state.foundations[burst.index]?.[0]?.suit ?? 'S') : 'S'
  const burstX =
    (metrics.layoutMode === 'bottom'
      ? metrics.foundationX +
        (burst?.index ?? 0) * Math.max(8, metrics.foundationStep * 0.6)
      : metrics.foundationX) +
    metrics.railCardWidth / 2
  const burstY =
    (metrics.foundationYs[burst?.index ?? 0] ?? metrics.columnsY) +
    metrics.railCardHeight / 2

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
          arcTransition={preset.arc}
          flipTransition={preset.flip}
          reducedMotion={reducedMotion || preset.reduced}
          hintCardIds={hintCardIds}
          selectedCardIds={selectedCardIds}
          draggingIds={draggingIds}
          flightOrder={flightOrder}
          dragOffset={dragOffset}
          onCardPointerDown={onCardPointerDown}
        />
        <HintGhostLayer
          state={handle.state}
          move={hintMove}
          hintIndex={hintIndex}
          hintCount={hintQueue.length}
          explanation={hintExplanation}
          confidence={hintConfidence}
          playing={hintPlaying}
          placements={placements}
          metrics={metrics}
          availableColumnHeight={availableColumnHeight}
          transition={preset.hintFlight}
          reducedMotion={reducedMotion || preset.reduced}
          onCycleComplete={advanceHint}
        />
        <SideRail
          metrics={metrics}
          foundationsFilled={foundationsFilled}
          panelOpen={panelOpen}
          pulseDeal={pulseDeal}
        />
        {burst ? (
          <FoundationBurst
            burstKey={burst.key}
            x={burstX}
            y={burstY}
            suit={burstSuit}
            size={metrics.railCardWidth}
            reducedMotion={reducedMotion || preset.reduced}
          />
        ) : null}
      </div>
    </div>
  )
}
