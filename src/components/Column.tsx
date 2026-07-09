import { AnimatePresence } from 'framer-motion'
import type { Card as CardType } from '../types'
import Card from './Card'
import { getValidRunFrom } from '../engine/rules'
import { useCardDimensions } from '../hooks/useCardDimensions'

export function getCardOffset(
  cards: CardType[],
  upToIndex: number,
  faceDownOffset: number,
  faceUpOffset: number
): number {
  let offset = 0
  for (let i = 0; i < upToIndex; i++) {
    offset += cards[i].faceUp ? faceUpOffset : faceDownOffset
  }
  return offset
}

export function getColumnHeight(
  cards: CardType[],
  faceDownOffset: number,
  faceUpOffset: number,
  cardHeight: number
): number {
  if (cards.length === 0) return cardHeight + Math.round(cardHeight * 0.08)
  const lastCardOffset = getCardOffset(cards, cards.length - 1, faceDownOffset, faceUpOffset)
  return lastCardOffset + cardHeight + Math.round(cardHeight * 0.15)
}

export function getPointerColumnIndex(x: number): number | null {
  const columns = document.querySelectorAll('[data-column-index]')
  for (let i = 0; i < columns.length; i++) {
    const rect = columns[i].getBoundingClientRect()
    if (x >= rect.left && x <= rect.right) {
      return parseInt(columns[i].getAttribute('data-column-index')!, 10)
    }
  }
  return null
}

interface ColumnProps {
  cards: CardType[]
  columnIndex: number
  isDragTarget?: boolean
  onCardPointerDown?: (cardIndex: number, e: React.PointerEvent) => void
}

export default function Column({
  cards,
  columnIndex,
  isDragTarget,
  onCardPointerDown,
}: ColumnProps) {
  const dims = useCardDimensions()
  const isEmpty = cards.length === 0
  const height = getColumnHeight(cards, dims.faceDownOffset, dims.faceUpOffset, dims.cardHeight)

  return (
    <div
      data-column-index={columnIndex}
      className={`
        flex-1 min-w-0 relative rounded-lg transition-all duration-200
        ${isEmpty
          ? 'border-2 border-dashed border-indigo-700/40 hover:border-indigo-500/60 flex items-center justify-center'
          : ''
        }
        ${isDragTarget
          ? 'ring-2 ring-[#00f0ff]/60 bg-[#00f0ff]/5 shadow-[inset_0_0_30px_rgba(0,240,255,0.1)]'
          : ''
        }
      `}
      style={{ minHeight: height, touchAction: 'none' }}
    >
      {isEmpty ? (
        <div className="flex flex-col items-center pointer-events-none select-none gap-1">
          <div
            className="border border-indigo-500/20 rounded-md"
            style={{
              width: dims.cardWidth,
              aspectRatio: '5 / 7',
            }}
          />
          <span className="text-indigo-400/50 text-xs font-medium">
            {columnIndex + 1}
          </span>
        </div>
      ) : (
        <div className="relative w-full" style={{ minHeight: height }}>
          <AnimatePresence mode="sync">
            {cards.map((card, index) => {
              const offset = getCardOffset(cards, index, dims.faceDownOffset, dims.faceUpOffset)
              const isBlocked = card.faceUp && getValidRunFrom(cards, index) < (cards.length - index)

              return (
                <Card
                  key={card.id}
                  card={card}
                  cardWidth={dims.cardWidth}
                  offset={offset}
                  zIndex={index}
                  isBlocked={isBlocked}
                  onPointerDown={(e) => onCardPointerDown?.(index, e)}
                />
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
