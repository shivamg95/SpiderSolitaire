import { useId, useRef, useEffect, useState, type CSSProperties } from 'react'
import clsx from 'clsx'
import { useSettingsStore } from '@/state/settingsStore'

export interface SegmentOption<T extends string | number> {
  readonly value: T
  readonly label: string
}

export interface SegmentedControlProps<T extends string | number> {
  readonly options: readonly SegmentOption<T>[]
  readonly value: T
  readonly onChange: (value: T) => void
  readonly ariaLabel: string
  readonly className?: string
}

export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: SegmentedControlProps<T>) {
  const groupId = useId()
  const reducedMotion = useSettingsStore((s) => s.reducedMotion)
  const trackRef = useRef<HTMLDivElement>(null)
  const [thumb, setThumb] = useState({ left: 0, width: 0 })

  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  )

  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    const measure = () => {
      const el = track.querySelector<HTMLElement>(
        `[data-segment-index="${selectedIndex}"]`,
      )
      if (!el) return
      setThumb({ left: el.offsetLeft, width: el.offsetWidth })
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(track)
    return () => {
      ro.disconnect()
    }
  }, [selectedIndex, options])

  const thumbStyle: CSSProperties = {
    transform: `translateX(${thumb.left}px)`,
    width: thumb.width,
    transition: reducedMotion ? 'none' : undefined,
  }

  return (
    <div
      ref={trackRef}
      className={clsx('segmented', className)}
      role="radiogroup"
      aria-label={ariaLabel}
    >
      <span className="segmented__thumb" style={thumbStyle} aria-hidden="true" />
      {options.map((option, index) => {
        const id = `${groupId}-${String(option.value)}`
        const checked = option.value === value
        return (
          <label
            key={id}
            className={clsx('segmented__option', checked && 'segmented__option--active')}
            data-segment-index={index}
          >
            <input
              className="segmented__input"
              type="radio"
              name={groupId}
              value={String(option.value)}
              checked={checked}
              onChange={() => {
                onChange(option.value)
              }}
            />
            <span className="segmented__label">{option.label}</span>
          </label>
        )
      })}
    </div>
  )
}

export interface SwitchProps {
  readonly checked: boolean
  readonly onChange: (checked: boolean) => void
  readonly id?: string
  readonly ariaLabel?: string
  readonly disabled?: boolean
}

export function Switch({
  checked,
  onChange,
  id,
  ariaLabel,
  disabled = false,
}: SwitchProps) {
  const reducedMotion = useSettingsStore((s) => s.reducedMotion)

  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      className={clsx(
        'switch',
        checked && 'switch--on',
        reducedMotion && 'switch--static',
      )}
      onClick={() => {
        onChange(!checked)
      }}
    >
      <span className="switch__thumb" aria-hidden="true" />
    </button>
  )
}
