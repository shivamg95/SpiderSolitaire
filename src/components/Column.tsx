import { AnimatePresence, motion } from 'framer-motion'
import type { Card as CardType } from '../types'
import Card from './Card'
import { getValidRunFrom } from '../engine/rules'
import { useCardDimensions } from '../hooks/useCardDimensions'

const MIN_FACE_DOWN = 6
const MIN_FACE_UP = 8

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

export function computeCompressedOffsets(
  columns: CardType[][],
  baseFaceDown: number,
  baseFaceUp: number,
  cardHeight: number,
  availableHeight: number,
): { faceDownOffset: number; faceUpOffset: number; needsCompression: boolean } {
  let maxHeight = 0
  for (const col of columns) {
    const h = getColumnHeight(col, baseFaceDown, baseFaceUp, cardHeight)
    if (h > maxHeight) maxHeight = h
  }

  if (maxHeight <= availableHeight) {
    return { faceDownOffset: baseFaceDown, faceUpOffset: baseFaceUp, needsCompression: false }
  }

  let reqFaceUp = baseFaceUp
  let reqFaceDown = baseFaceDown

  for (const col of columns) {
    if (col.length === 0) continue
    const faceDownCount = col.filter(c => !c.faceUp).length
    const faceUpCount = col.filter(c => c.faceUp).length
    const cardPad = cardHeight + Math.round(cardHeight * 0.15)
    const availForFaceUp = availableHeight - faceDownCount * baseFaceDown - cardPad
    if (faceUpCount > 0 && availForFaceUp > 0) {
      const perCard = Math.floor(availForFaceUp / faceUpCount)
      if (perCard < reqFaceUp) reqFaceUp = Math.max(MIN_FACE_UP, perCard)
    }
  }

  if (reqFaceUp <= MIN_FACE_UP + 1) {
    for (const col of columns) {
      if (col.length === 0) continue
      const faceDownCount = col.filter(c => !c.faceUp).length
      const faceUpCount = col.filter(c => c.faceUp).length
      const cardPad = cardHeight + Math.round(cardHeight * 0.15)
      const availForFaceDown = availableHeight - faceUpCount * reqFaceUp - cardPad
      if (faceDownCount > 0 && availForFaceDown > 0) {
        const perCard = Math.floor(availForFaceDown / faceDownCount)
        if (perCard < reqFaceDown) reqFaceDown = Math.max(MIN_FACE_DOWN, perCard)
      }
    }
  }

  return { faceDownOffset: reqFaceDown, faceUpOffset: reqFaceUp, needsCompression: true }
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
  isSource?: boolean
  isValidDropTarget?: boolean
  hintCardId?: string | null
  faceDownOffset?: number
  faceUpOffset?: number
  cardWidthOverride?: number
  cardHeightOverride?: number
  onCardPointerDown?: (cardIndex: number, e: React.PointerEvent) => void
}

export default function Column({
  cards,
  columnIndex,
  isDragTarget,
  isSource,
  isValidDropTarget,
  hintCardId,
  faceDownOffset: fdProp,
  faceUpOffset: fuProp,
  cardWidthOverride,
  cardHeightOverride,
  onCardPointerDown,
}: ColumnProps) {
  const dims = useCardDimensions()
  const isEmpty = cards.length === 0
  const faceDownOffset = fdProp ?? dims.faceDownOffset
  const faceUpOffset = fuProp ?? dims.faceUpOffset
  const cw = cardWidthOverride ?? dims.cardWidth
  const ch = cardHeightOverride ?? dims.cardHeight
  const height = getColumnHeight(cards, faceDownOffset, faceUpOffset, ch)

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
          ? 'ring-2 ring-[#00f0ff]/60 bg-[#00f0ff]/8 shadow-[inset_0_0_30px_rgba(0,240,255,0.15)]'
          : isValidDropTarget
            ? 'ring-1 ring-[#4dff88]/40 bg-[#4dff88]/8 animate-pulse'
            : isSource
              ? 'opacity-60'
              : ''
        }
      `}
      style={{ minHeight: height, touchAction: 'none' }}
    >
      {isEmpty ? (
        <motion.div
          className="flex flex-col items-center pointer-events-none select-none gap-2"
          animate={isDragTarget ? { scale: [1, 1.05, 1] } : { scale: 1 }}
          transition={{ duration: 0.8, repeat: isDragTarget ? Infinity : 0, ease: 'easeInOut' }}
        >
          <div
            className="border border-indigo-500/20 flex items-center justify-center"
            style={{
              width: cw,
              aspectRatio: '5 / 7',
              borderRadius: Math.round(cw * 0.094),
              background: isDragTarget
                ? 'linear-gradient(135deg, rgba(0,240,255,0.08) 0%, rgba(0,240,255,0.03) 100%)'
                : 'rgba(99,102,241,0.03)',
              borderColor: isDragTarget ? 'rgba(0,240,255,0.4)' : undefined,
            }}
          >
            <span style={{ fontSize: Math.round(cw * 0.25), color: 'rgba(99,102,241,0.25)' }}>
              ♠
            </span>
          </div>
          <span className="text-indigo-400/50 text-xs font-medium">
            {columnIndex + 1}
          </span>
        </motion.div>
      ) : (
        <div className="relative w-full" style={{ minHeight: height }}>
          <AnimatePresence mode="sync">
            {cards.map((card, index) => {
              const offset = getCardOffset(cards, index, faceDownOffset, faceUpOffset)
              const isBlocked = card.faceUp && getValidRunFrom(cards, index) < (cards.length - index)

              return (
                <Card
                  key={card.id}
                  card={card}
                  cardWidth={cw}
                  offset={offset}
                  zIndex={index}
                  isBlocked={isBlocked}
                  isHinted={hintCardId === card.id}
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
