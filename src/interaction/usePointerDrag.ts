import { useCallback, useEffect, useRef } from 'react'
import type { ColumnIndex } from '@/engine/types'
import {
  DEFAULT_DRAG_CONFIG,
  createDragState,
  pointerKindFromType,
  stepDrag,
  type DragCommand,
  type DragConfig,
  type DragState,
} from './dragMachine'
import { nearestColumn, type ColumnRect } from './hitTest'

export interface DragTarget {
  readonly cardIds: readonly string[]
  readonly fromColumn: ColumnIndex
  readonly count: number
}

export interface UsePointerDragOptions {
  readonly config?: DragConfig
  readonly getColumnRects: () => readonly ColumnRect[]
  /** Max horizontal distance from column center to accept a drop (px). */
  readonly maxDropDistance?: number | (() => number)
  readonly onCommand: (command: DragCommand, state: DragState) => void
  /** Called on every pointer move while pressed/dragging (for hover highlight). */
  readonly onPointerMove?: (
    point: { x: number; y: number },
    targetColumn: number | null,
  ) => void
  readonly enabled?: boolean
}

export interface PointerDragApi {
  readonly onPointerDown: (event: React.PointerEvent, target: DragTarget) => void
  readonly dragStateRef: React.RefObject<DragState>
}

export function usePointerDrag(options: UsePointerDragOptions): PointerDragApi {
  const config = options.config ?? DEFAULT_DRAG_CONFIG
  const enabled = options.enabled ?? true
  const stateRef = useRef<DragState>(createDragState())
  const optionsRef = useRef(options)
  const rectsCacheRef = useRef<readonly ColumnRect[] | null>(null)

  useEffect(() => {
    optionsRef.current = options
  })

  useEffect(() => {
    const invalidate = () => {
      rectsCacheRef.current = null
    }
    window.addEventListener('resize', invalidate)
    return () => {
      window.removeEventListener('resize', invalidate)
    }
  }, [])

  const emit = useCallback((command: DragCommand, state: DragState) => {
    optionsRef.current.onCommand(command, state)
  }, [])

  const apply = useCallback(
    (event: Parameters<typeof stepDrag>[1]) => {
      const step = stepDrag(stateRef.current, event, config)
      stateRef.current = step.state
      if (step.command.type !== 'none') {
        emit(step.command, step.state)
      }
    },
    [config, emit],
  )

  const columnRects = useCallback((): readonly ColumnRect[] => {
    if (rectsCacheRef.current) return rectsCacheRef.current
    const rects = optionsRef.current.getColumnRects()
    rectsCacheRef.current = rects
    return rects
  }, [])

  useEffect(() => {
    const resolveMaxDistance = () => {
      const raw = optionsRef.current.maxDropDistance
      if (raw == null) return Infinity
      return typeof raw === 'function' ? raw() : raw
    }

    const onMove = (e: PointerEvent) => {
      if (stateRef.current.phase !== 'pressed' && stateRef.current.phase !== 'dragging') {
        return
      }
      if (stateRef.current.phase === 'pressed' || stateRef.current.phase === 'dragging') {
        if (e.pointerId !== stateRef.current.pointerId) return
      }
      const point = { x: e.clientX, y: e.clientY }
      apply({
        type: 'pointermove',
        pointerId: e.pointerId,
        point,
        time: e.timeStamp,
      })
      const rects = columnRects()
      const targetColumn = nearestColumn(point, rects, resolveMaxDistance())
      optionsRef.current.onPointerMove?.(point, targetColumn)
    }

    const onUp = (e: PointerEvent) => {
      if (stateRef.current.phase !== 'pressed' && stateRef.current.phase !== 'dragging') {
        return
      }
      if (
        (stateRef.current.phase === 'pressed' || stateRef.current.phase === 'dragging') &&
        e.pointerId !== stateRef.current.pointerId
      ) {
        return
      }
      const rects = columnRects()
      const targetColumn = nearestColumn(
        { x: e.clientX, y: e.clientY },
        rects,
        resolveMaxDistance(),
      )
      apply({
        type: 'pointerup',
        pointerId: e.pointerId,
        point: { x: e.clientX, y: e.clientY },
        time: e.timeStamp,
        targetColumn,
      })
      // Settle after drop/tap
      apply({ type: 'settle' })
      rectsCacheRef.current = null
    }

    const onCancel = (e: PointerEvent) => {
      apply({
        type: 'pointercancel',
        pointerId: e.pointerId,
        time: e.timeStamp,
      })
      apply({ type: 'settle' })
      rectsCacheRef.current = null
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onCancel)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
    }
  }, [apply, columnRects])

  const onPointerDown = useCallback(
    (event: React.PointerEvent, target: DragTarget) => {
      if (!enabled) return
      if (event.button !== 0) return
      event.preventDefault()
      event.currentTarget.setPointerCapture?.(event.pointerId)
      // Snapshot hit targets once per gesture so pointermove never forces layout.
      rectsCacheRef.current = optionsRef.current.getColumnRects()
      apply({
        type: 'pointerdown',
        pointerId: event.pointerId,
        pointerKind: pointerKindFromType(event.pointerType),
        point: { x: event.clientX, y: event.clientY },
        time: event.timeStamp,
        cardIds: target.cardIds,
        fromColumn: target.fromColumn,
        count: target.count,
      })
    },
    [apply, enabled],
  )

  return { onPointerDown, dragStateRef: stateRef }
}
