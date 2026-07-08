import type { Card as CardType } from '../types'
import Card from './Card'
import { getValidRunFrom } from '../engine/rules'

const FACE_DOWN_OFFSET = 8
const FACE_UP_OFFSET = 22

interface ColumnProps {
  cards: CardType[]
  columnIndex: number
  isSelected?: boolean
  selectedCardIndex?: number | null
  onCardClick?: (cardIndex: number) => void
  onColumnClick?: () => void
}

export function getCardOffset(cards: CardType[], upToIndex: number): number {
  let offset = 0
  for (let i = 0; i < upToIndex; i++) {
    offset += cards[i].faceUp ? FACE_UP_OFFSET : FACE_DOWN_OFFSET
  }
  return offset
}

const CARD_WIDTH = 64
const CARD_HEIGHT = CARD_WIDTH * (7 / 5)

export function getColumnHeight(cards: CardType[]): number {
  if (cards.length === 0) return CARD_HEIGHT + 4
  const lastCardOffset = getCardOffset(cards, cards.length - 1)
  return lastCardOffset + CARD_HEIGHT + 16
}

export default function Column({
  cards,
  columnIndex,
  isSelected,
  selectedCardIndex,
  onCardClick,
  onColumnClick,
}: ColumnProps) {
  const isEmpty = cards.length === 0

  return (
    <div
      className={`
        flex-1 min-w-0 relative rounded-lg transition-all duration-200
        ${isEmpty
          ? 'border-2 border-dashed border-indigo-700/40 hover:border-indigo-500/60 flex items-center justify-center'
          : ''
        }
        ${isSelected
          ? 'ring-1 ring-[#00f0ff]/50 shadow-[inset_0_0_20px_rgba(0,240,255,0.08)]'
          : ''
        }
      `}
      style={{
        minHeight: `${getColumnHeight(cards)}px`,
      }}
      onClick={onColumnClick}
    >
      {isEmpty ? (
        <div className="text-indigo-600/30 text-xs font-medium pointer-events-none select-none">
          {columnIndex + 1}
        </div>
      ) : (
        <div className="relative w-full" style={{ minHeight: `${getColumnHeight(cards)}px` }}>
          {cards.map((card, index) => {
            const offset = getCardOffset(cards, index)
            const runSize = selectedCardIndex !== null && selectedCardIndex !== undefined
              ? getValidRunFrom(cards, selectedCardIndex)
              : 0
            const isCardSelected = selectedCardIndex !== null && selectedCardIndex !== undefined
              && index >= selectedCardIndex
              && index < selectedCardIndex + runSize

            return (
              <Card
                key={card.id}
                card={card}
                offset={offset}
                zIndex={index}
                isSelected={isCardSelected}
                onClick={() => {
                  if (card.faceUp && onCardClick) {
                    onCardClick(index)
                  }
                }}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
