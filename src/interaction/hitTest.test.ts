import { describe, expect, it } from 'vitest'
import { nearestColumn, columnRectsFromElements } from './hitTest'

describe('hitTest', () => {
  it('picks nearest column by horizontal distance', () => {
    const rects = [
      { column: 0, left: 0, right: 40, top: 0, bottom: 100 },
      { column: 1, left: 50, right: 90, top: 0, bottom: 100 },
      { column: 2, left: 100, right: 140, top: 0, bottom: 100 },
    ]
    expect(nearestColumn({ x: 70, y: 10 }, rects)).toBe(1)
    expect(nearestColumn({ x: 10, y: 10 }, rects)).toBe(0)
    expect(nearestColumn({ x: 0, y: 0 }, [])).toBeNull()
  })

  it('builds rects from elements', () => {
    const rects = columnRectsFromElements([
      {
        column: 3,
        getBoundingClientRect: () =>
          ({ left: 1, right: 2, top: 3, bottom: 4 }) as DOMRect,
      },
    ])
    expect(rects[0]).toEqual({ column: 3, left: 1, right: 2, top: 3, bottom: 4 })
  })
})
