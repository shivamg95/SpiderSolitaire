import { describe, expect, it } from 'vitest'
import { createDragState, stepDrag, DEFAULT_DRAG_CONFIG } from './dragMachine'

describe('dragMachine', () => {
  it('stays pressed below mouse threshold then taps', () => {
    let state = createDragState()
    let step = stepDrag(
      state,
      {
        type: 'pointerdown',
        pointerId: 1,
        pointerKind: 'mouse',
        point: { x: 0, y: 0 },
        time: 0,
        cardIds: ['a'],
        fromColumn: 0,
        count: 1,
      },
      DEFAULT_DRAG_CONFIG,
    )
    state = step.state
    expect(state.phase).toBe('pressed')

    step = stepDrag(
      state,
      {
        type: 'pointermove',
        pointerId: 1,
        point: { x: 2, y: 0 },
        time: 10,
      },
      DEFAULT_DRAG_CONFIG,
    )
    expect(step.state.phase).toBe('pressed')

    step = stepDrag(
      step.state,
      {
        type: 'pointerup',
        pointerId: 1,
        point: { x: 2, y: 0 },
        time: 100,
        targetColumn: 1,
      },
      DEFAULT_DRAG_CONFIG,
    )
    expect(step.command.type).toBe('tap')
  })

  it('starts dragging past threshold', () => {
    let state = createDragState()
    state = stepDrag(
      state,
      {
        type: 'pointerdown',
        pointerId: 1,
        pointerKind: 'mouse',
        point: { x: 0, y: 0 },
        time: 0,
        cardIds: ['a'],
        fromColumn: 0,
        count: 1,
      },
      DEFAULT_DRAG_CONFIG,
    ).state

    const step = stepDrag(
      state,
      {
        type: 'pointermove',
        pointerId: 1,
        point: { x: 20, y: 0 },
        time: 20,
      },
      DEFAULT_DRAG_CONFIG,
    )
    expect(step.command.type).toBe('startDrag')
    expect(step.state.phase).toBe('dragging')
  })
})
