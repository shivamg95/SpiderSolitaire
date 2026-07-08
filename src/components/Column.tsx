import { useState, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import type { Card as CardType } from '../types'
import Card from './Card'
import { getValidRunFrom } from '../engine/rules'

const CARD_WIDTH = 64

const DESKTOP_FACE_DOWN = 8
const DESKTOP_FACE_UP = 22
const TOUCH_FACE_DOWN = 24
const TOUCH_FACE_UP = 36

export function useCardSpacing() {
  const [isCoarse, setIsCoarse] = useState(false)

  useEffect(() => {
    const mql = matchMedia('(pointer: coarse)')
    setIsCoarse(mql.matches)
    const handler = (e: MediaQueryListEvent) => setIsCoarse(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  return {
    faceDownOffset: isCoarse ? TOUCH_FACE_DOWN : DESKTOP_FACE_DOWN,
    faceUpOffset: isCoarse ? TOUCH_FACE_UP : DESKTOP_FACE_UP,
    cardWidth: CARD_WIDTH,
    cardHeight: CARD_WIDTH * (7 / 5),
  }
}

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
  if (cards.length === 0) return cardHeight + 4
  const lastCardOffset = getCardOffset(cards, cards.length - 1, faceDownOffset, faceUpOffset)
  return lastCardOffset + cardHeight + 16
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
  selectedCardIndex?: number | null
  isDragTarget?: boolean
  isHintTarget?: boolean
  onCardPointerDown?: (cardIndex: number, e: React.PointerEvent) => void
  onColumnClick?: () => void
}

export default function Column({
  cards,
  columnIndex,
  isDragTarget,
  isHintTarget,
  selectedCardIndex,
  onCardPointerDown,
  onColumnClick,
}: ColumnProps) {
  const spacing = useCardSpacing()
  const isEmpty = cards.length === 0
  const height = getColumnHeight(cards, spacing.faceDownOffset, spacing.faceUpOffset, spacing.cardHeight)

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
        ${isHintTarget
          ? 'ring-2 ring-[#4dff88]/40 bg-[#4dff88]/3'
          : ''
        }
      `}
      style={{ minHeight: height, touchAction: 'none' }}
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
              const offset = getCardOffset(cards, index, spacing.faceDownOffset, spacing.faceUpOffset)
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
