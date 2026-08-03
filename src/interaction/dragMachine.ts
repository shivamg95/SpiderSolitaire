export type PointerKind = 'mouse' | 'touch' | 'pen' | 'other'

export interface Point {
  readonly x: number
  readonly y: number
}

export interface DragConfig {
  readonly mouseThresholdPx: number
  readonly touchThresholdPx: number
  readonly tapMaxMs: number
  readonly touchLiftPx: number
}

export const DEFAULT_DRAG_CONFIG: DragConfig = {
  mouseThresholdPx: 4,
  touchThresholdPx: 8,
  tapMaxMs: 250,
  touchLiftPx: 24,
}

export type DragPhase = 'idle' | 'pressed' | 'dragging' | 'dropping' | 'cancelling'

export interface DragIdle {
  readonly phase: 'idle'
}

export interface DragPressed {
  readonly phase: 'pressed'
  readonly pointerId: number
  readonly pointerKind: PointerKind
  readonly origin: Point
  readonly startedAt: number
  readonly cardIds: readonly string[]
  readonly fromColumn: number
  readonly count: number
}

export interface DragDragging {
  readonly phase: 'dragging'
  readonly pointerId: number
  readonly pointerKind: PointerKind
  readonly origin: Point
  readonly startedAt: number
  readonly cardIds: readonly string[]
  readonly fromColumn: number
  readonly count: number
  readonly dx: number
  readonly dy: number
  readonly liftY: number
}

export interface DragDropping {
  readonly phase: 'dropping'
  readonly pointerId: number
  readonly pointerKind: PointerKind
  readonly cardIds: readonly string[]
  readonly fromColumn: number
  readonly count: number
  readonly dx: number
  readonly dy: number
  readonly targetColumn: number | null
}

export interface DragCancelling {
  readonly phase: 'cancelling'
  readonly pointerId: number
  readonly cardIds: readonly string[]
  readonly fromColumn: number
  readonly count: number
}

export type DragState =
  DragIdle | DragPressed | DragDragging | DragDropping | DragCancelling

export type DragEvent =
  | {
      readonly type: 'pointerdown'
      readonly pointerId: number
      readonly pointerKind: PointerKind
      readonly point: Point
      readonly time: number
      readonly cardIds: readonly string[]
      readonly fromColumn: number
      readonly count: number
    }
  | {
      readonly type: 'pointermove'
      readonly pointerId: number
      readonly point: Point
      readonly time: number
    }
  | {
      readonly type: 'pointerup'
      readonly pointerId: number
      readonly point: Point
      readonly time: number
      readonly targetColumn: number | null
    }
  | {
      readonly type: 'pointercancel'
      readonly pointerId: number
      readonly time: number
    }
  | { readonly type: 'settle' }

export type DragCommand =
  | { readonly type: 'none' }
  | { readonly type: 'capture'; readonly pointerId: number }
  | {
      readonly type: 'startDrag'
      readonly cardIds: readonly string[]
      readonly liftY: number
    }
  | { readonly type: 'move'; readonly dx: number; readonly dy: number }
  | {
      readonly type: 'tap'
      readonly fromColumn: number
      readonly count: number
      readonly cardIds: readonly string[]
    }
  | {
      readonly type: 'drop'
      readonly fromColumn: number
      readonly count: number
      readonly targetColumn: number | null
      readonly cardIds: readonly string[]
    }
  | {
      readonly type: 'cancel'
      readonly cardIds: readonly string[]
      readonly fromColumn: number
      readonly count: number
    }
  | { readonly type: 'release'; readonly pointerId: number }

export interface DragStep {
  readonly state: DragState
  readonly command: DragCommand
}

function thresholdFor(kind: PointerKind, config: DragConfig): number {
  return kind === 'touch' ? config.touchThresholdPx : config.mouseThresholdPx
}

function liftFor(kind: PointerKind, config: DragConfig): number {
  return kind === 'touch' ? config.touchLiftPx : 0
}

function dist(a: Point, b: Point): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.hypot(dx, dy)
}

export function createDragState(): DragState {
  return { phase: 'idle' }
}

export function stepDrag(
  state: DragState,
  event: DragEvent,
  config: DragConfig = DEFAULT_DRAG_CONFIG,
): DragStep {
  switch (event.type) {
    case 'pointerdown': {
      if (state.phase !== 'idle') {
        return { state, command: { type: 'none' } }
      }
      return {
        state: {
          phase: 'pressed',
          pointerId: event.pointerId,
          pointerKind: event.pointerKind,
          origin: event.point,
          startedAt: event.time,
          cardIds: event.cardIds,
          fromColumn: event.fromColumn,
          count: event.count,
        },
        command: { type: 'capture', pointerId: event.pointerId },
      }
    }
    case 'pointermove': {
      if (state.phase === 'pressed' && state.pointerId === event.pointerId) {
        const d = dist(state.origin, event.point)
        if (d < thresholdFor(state.pointerKind, config)) {
          return { state, command: { type: 'none' } }
        }
        const liftY = liftFor(state.pointerKind, config)
        const dx = event.point.x - state.origin.x
        const dy = event.point.y - state.origin.y - liftY
        return {
          state: {
            phase: 'dragging',
            pointerId: state.pointerId,
            pointerKind: state.pointerKind,
            origin: state.origin,
            startedAt: state.startedAt,
            cardIds: state.cardIds,
            fromColumn: state.fromColumn,
            count: state.count,
            dx,
            dy,
            liftY,
          },
          command: { type: 'startDrag', cardIds: state.cardIds, liftY },
        }
      }
      if (state.phase === 'dragging' && state.pointerId === event.pointerId) {
        const dx = event.point.x - state.origin.x
        const dy = event.point.y - state.origin.y - state.liftY
        return {
          state: { ...state, dx, dy },
          command: { type: 'move', dx, dy },
        }
      }
      return { state, command: { type: 'none' } }
    }
    case 'pointerup': {
      if (
        (state.phase === 'pressed' || state.phase === 'dragging') &&
        state.pointerId === event.pointerId
      ) {
        const elapsed = event.time - state.startedAt
        if (state.phase === 'pressed' && elapsed <= config.tapMaxMs) {
          return {
            state: { phase: 'idle' },
            command: {
              type: 'tap',
              fromColumn: state.fromColumn,
              count: state.count,
              cardIds: state.cardIds,
            },
          }
        }
        if (state.phase === 'pressed') {
          // Long press without drag — treat as cancel/noop
          return {
            state: { phase: 'idle' },
            command: { type: 'release', pointerId: event.pointerId },
          }
        }
        return {
          state: {
            phase: 'dropping',
            pointerId: state.pointerId,
            pointerKind: state.pointerKind,
            cardIds: state.cardIds,
            fromColumn: state.fromColumn,
            count: state.count,
            dx: state.dx,
            dy: state.dy,
            targetColumn: event.targetColumn,
          },
          command: {
            type: 'drop',
            fromColumn: state.fromColumn,
            count: state.count,
            targetColumn: event.targetColumn,
            cardIds: state.cardIds,
          },
        }
      }
      return { state, command: { type: 'none' } }
    }
    case 'pointercancel': {
      if (
        (state.phase === 'pressed' || state.phase === 'dragging') &&
        state.pointerId === event.pointerId
      ) {
        return {
          state: {
            phase: 'cancelling',
            pointerId: state.pointerId,
            cardIds: state.cardIds,
            fromColumn: state.fromColumn,
            count: state.count,
          },
          command: {
            type: 'cancel',
            cardIds: state.cardIds,
            fromColumn: state.fromColumn,
            count: state.count,
          },
        }
      }
      return { state, command: { type: 'none' } }
    }
    case 'settle': {
      return { state: { phase: 'idle' }, command: { type: 'none' } }
    }
    default: {
      return { state, command: { type: 'none' } }
    }
  }
}

export function pointerKindFromType(pointerType: string): PointerKind {
  if (pointerType === 'mouse' || pointerType === 'touch' || pointerType === 'pen') {
    return pointerType
  }
  return 'other'
}
