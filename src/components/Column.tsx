import { AnimatePresence } from 'framer-motion'
import type { Card as CardType } from '../types'
import Card from './Card'
import { getValidRunFrom } from '../engine/rules'

export const FACE_DOWN_OFFSET = 8
export const FACE_UP_OFFSET = 22
const CARD_WIDTH = 64
const CARD_HEIGHT = CARD_WIDTH * (7 / 5)

interface ColumnProps {
  cards: CardType[]
  columnIndex: number
  selectedCardIndex?: number | null
  isDragTarget?: boolean
  onCardPointerDown?: (cardIndex: number, e: React.PointerEvent) => void
  onColumnClick?: () => void
}

export function getCardOffset(cards: CardType[], upToIndex: number): number {
  let offset = 0
  for (let i = 0; i < upToIndex; i++) {
    offset += cards[i].faceUp ? FACE_UP_OFFSET : FACE_DOWN_OFFSET
  }
  return offset
}

export function getColumnHeight(cards: CardType[]): number {
  if (cards.length === 0) return CARD_HEIGHT + 4
  const lastCardOffset = getCardOffset(cards, cards.length - 1)
  return lastCardOffset + CARD_HEIGHT + 16
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

export default function Column({
  cards,
  columnIndex,
  isDragTarget,
  selectedCardIndex,
  onCardPointerDown,
  onColumnClick,
}: ColumnProps) {
  const isEmpty = cards.length === 0
  const height = getColumnHeight(cards)

  const runSize = selectedCardIndex != null
    ? getValidRunFrom(cards, selectedCardIndex)
    : 0

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
      style={{ minHeight: height }}
      onClick={onColumnClick}
    >
      {isEmpty ? (
        <div className="text-indigo-600/30 text-xs font-medium pointer-events-none select-none">
          {columnIndex + 1}
        </div>
      ) : (
        <div className="relative w-full" style={{ minHeight: height }}>
          <AnimatePresence mode="sync">
            {cards.map((card, index) => {
              const offset = getCardOffset(cards, index)
              const isCardSelected =
                selectedCardIndex != null &&
                index >= selectedCardIndex &&
                index < selectedCardIndex + runSize

              return (
                <Card
                  key={card.id}
                  card={card}
                  offset={offset}
                  zIndex={index}
                  isSelected={isCardSelected}
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
