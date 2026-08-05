import clsx from 'clsx'

export interface StockProps {
  readonly dealsLeft: number
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  readonly disabled?: boolean
  readonly pulse?: boolean
  readonly onDeal: () => void
}

export function Stock({
  dealsLeft,
  x,
  y,
  width,
  height,
  disabled = false,
  pulse = false,
  onDeal,
}: StockProps) {
  return (
    <button
      type="button"
      className={clsx(
        'stock',
        disabled && 'stock--disabled',
        pulse && !disabled && dealsLeft > 0 && 'stock--pulse',
      )}
      style={{ left: x, top: y, width, height }}
      disabled={disabled || dealsLeft === 0}
      onClick={() => {
        onDeal()
      }}
      aria-label={`Deal stock, ${dealsLeft} remaining`}
    >
      <span className="stock-count">{dealsLeft}</span>
      <span className="stock-label">Deal</span>
    </button>
  )
}
