import { ChevronsDown } from 'lucide-react'

interface StockPileProps {
  stockCount: number
  canDeal: boolean
  onDeal: () => void
  cardWidth: number
}

export default function StockPile({ stockCount, canDeal, onDeal, cardWidth }: StockPileProps) {
  const remainingDeals = Math.floor(stockCount / 10)
  const isEmpty = stockCount === 0

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        className={`
          relative rounded-md cursor-pointer transition-all duration-200
          ${isEmpty
            ? 'opacity-20 pointer-events-none'
            : canDeal
              ? 'hover:shadow-[0_0_12px_rgba(0,240,255,0.4)] hover:scale-105'
              : 'opacity-40 pointer-events-none cursor-not-allowed'
          }
        `}
        style={{ width: cardWidth, aspectRatio: '5 / 7' }}
        onClick={onDeal}
        disabled={!canDeal || isEmpty}
      >
        {!isEmpty && (
          <>
            {Array.from({ length: Math.min(3, remainingDeals) }).map((_, i) => (
              <div
                key={i}
                className="absolute rounded-md"
                style={{
                  inset: 0,
                  top: `${i * Math.round(cardWidth * 0.03)}px`,
                  left: `${i * Math.round(cardWidth * 0.03)}px`,
                  background: 'linear-gradient(135deg, #1a1050 0%, #1e1660 50%, #162040 100%)',
                  border: '1px solid rgba(99, 102, 241, 0.4)',
                }}
              />
            ))}
            <div
              className="absolute inset-0 rounded-md flex items-center justify-center
                         bg-gradient-to-br from-indigo-950 to-blue-950 border border-indigo-700/50"
            >
              <ChevronsDown className="w-5 h-5 text-[#00f0ff]/70" />
            </div>
          </>
        )}
      </button>

      <span className="text-[11px] text-indigo-400/70 font-medium">
        {isEmpty ? 'Empty' : `${stockCount} cards (${remainingDeals} deals)`}
      </span>
    </div>
  )
}
