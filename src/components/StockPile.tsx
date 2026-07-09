import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
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
  const [isDealing, setIsDealing] = useState(false)

  const iconSize = Math.max(14, Math.min(36, Math.round(cardWidth * 0.31)))
  const labelSize = Math.max(10, Math.min(18, Math.round(cardWidth * 0.14)))
  const badgeSize = Math.max(14, Math.min(22, Math.round(cardWidth * 0.2)))
  const radius = Math.round(cardWidth * 0.094)
  const stackOffset = Math.round(cardWidth * 0.03)

  const handleDeal = useCallback(() => {
    if (!canDeal || isEmpty) return
    setIsDealing(true)
    onDeal()
    setTimeout(() => setIsDealing(false), 300)
  }, [canDeal, isEmpty, onDeal])

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative">
        <motion.button
          className={`
            relative cursor-pointer transition-colors duration-200
            ${isEmpty
              ? 'opacity-20 pointer-events-none'
              : canDeal
                ? 'hover:shadow-[0_0_16px_rgba(0,240,255,0.45)]'
                : 'opacity-40 pointer-events-none cursor-not-allowed'
            }
          `}
          style={{ width: cardWidth, aspectRatio: '5 / 7', borderRadius: radius }}
          animate={isDealing ? { scale: 0.9 } : { scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 20 }}
          onClick={handleDeal}
          disabled={!canDeal || isEmpty}
        >
          {!isEmpty && (
            <>
              {Array.from({ length: Math.min(3, remainingDeals) }).map((_, i) => (
                <div
                  key={i}
                  className="absolute"
                  style={{
                    inset: 0,
                    top: `${i * stackOffset}px`,
                    left: `${i * stackOffset}px`,
                    background: 'linear-gradient(135deg, #1a1050 0%, #1e1660 50%, #162040 100%)',
                    border: '1px solid rgba(99, 102, 241, 0.4)',
                    borderRadius: radius,
                  }}
                />
              ))}
              <div
                className="absolute inset-0 flex items-center justify-center
                           bg-gradient-to-br from-indigo-950 to-blue-950 border border-indigo-700/50"
                style={{ borderRadius: radius }}
              >
                <ChevronsDown style={{ width: iconSize, height: iconSize }} className="text-[#00f0ff]/70" />
              </div>
            </>
          )}
        </motion.button>

        {/* Deal count badge */}
        {!isEmpty && (
          <div
            className="absolute -top-2 -right-2 rounded-full bg-[#00f0ff]/20 border border-[#00f0ff]/40 text-[#00f0ff] font-bold flex items-center justify-center shadow-[0_0_8px_rgba(0,240,255,0.3)]"
            style={{ width: badgeSize, height: badgeSize, fontSize: Math.max(8, Math.round(badgeSize * 0.45)) }}
          >
            {remainingDeals}
          </div>
        )}
      </div>

      <span className="text-indigo-400/70 font-medium uppercase tracking-wider" style={{ fontSize: labelSize }}>
        {isEmpty ? 'Stock' : 'Stock'}
      </span>
    </div>
  )
}
