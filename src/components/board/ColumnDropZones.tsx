import { forwardRef, useImperativeHandle, useRef } from 'react'
import { COLUMN_COUNT } from '@/layout/constants'
import type { ColumnRect } from '@/interaction/hitTest'

export interface ColumnDropZonesHandle {
  getRects: () => ColumnRect[]
}

export interface ColumnDropZonesProps {
  readonly columnXs: readonly number[]
  readonly columnsY: number
  readonly cardWidth: number
  readonly height: number
}

export const ColumnDropZones = forwardRef<ColumnDropZonesHandle, ColumnDropZonesProps>(
  function ColumnDropZones({ columnXs, columnsY, cardWidth, height }, ref) {
    const nodeRefs = useRef<(HTMLDivElement | null)[]>([])

    useImperativeHandle(ref, () => ({
      getRects: () => {
        const rects: ColumnRect[] = []
        for (let i = 0; i < COLUMN_COUNT; i++) {
          const el = nodeRefs.current[i]
          if (!el) continue
          const r = el.getBoundingClientRect()
          rects.push({
            column: i,
            left: r.left,
            right: r.right,
            top: r.top,
            bottom: r.bottom,
          })
        }
        return rects
      },
    }))

    return (
      <div className="column-drop-zones" aria-hidden>
        {Array.from({ length: COLUMN_COUNT }, (_, i) => (
          <div
            key={i}
            className="column-drop-zone"
            ref={(el) => {
              nodeRefs.current[i] = el
            }}
            data-column={i}
            style={{
              left: columnXs[i] ?? 0,
              top: columnsY,
              width: cardWidth,
              height,
            }}
          />
        ))}
      </div>
    )
  },
)
