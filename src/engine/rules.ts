import type { Card, Move, Rank } from '../types'
import { TABLEAU_COLUMNS } from '../types'

export function isKing(rank: Rank): boolean {
  return rank === 13
}

export function isNextRank(bottomRank: Rank, topRank: Rank): boolean {
  return bottomRank === topRank - 1
}

export function isValidDrop(
  movingCard: Card,
  targetCard: Card | null
): boolean {
  if (targetCard === null) {
    return true // empty column accepts any card
  }
  return isNextRank(movingCard.rank, targetCard.rank)
}

export function isMovableRun(cards: Card[], startIndex: number): boolean {
  if (startIndex >= cards.length) return false

  let suit = cards[startIndex].suit
  let expectedRank = cards[startIndex].rank

  for (let i = startIndex; i < cards.length; i++) {
    const card = cards[i]
    if (!card.faceUp) return false
    if (card.suit !== suit) return false
    if (card.rank !== expectedRank) return false
    expectedRank = (expectedRank - 1) as Rank
    if (expectedRank < 1) return false
  }

  return true
}

export function getValidRunFrom(cards: Card[], startIndex: number): number {
  if (startIndex >= cards.length) return 0
  if (!cards[startIndex].faceUp) return 0

  const suit = cards[startIndex].suit
  let expectedRank = cards[startIndex].rank
  let count = 0

  for (let i = startIndex; i < cards.length; i++) {
    const card = cards[i]
    if (!card.faceUp) break
    if (card.suit !== suit) break
    if (card.rank !== expectedRank) break
    expectedRank = (expectedRank - 1) as Rank
    count++
  }

  return count
}

export function isValidMove(
  columns: Card[][],
  fromColumn: number,
  toColumn: number,
  fromIndex: number
): boolean {
  if (fromColumn === toColumn) return false
  if (fromColumn < 0 || fromColumn >= TABLEAU_COLUMNS) return false
  if (toColumn < 0 || toColumn >= TABLEAU_COLUMNS) return false

  const sourceCol = columns[fromColumn]
  if (fromIndex >= sourceCol.length) return false

  if (!isMovableRun(sourceCol, fromIndex)) return false

  const targetCol = columns[toColumn]
  const movingCard = sourceCol[fromIndex]

  if (targetCol.length === 0) {
    return true
  }

  const targetCard = targetCol[targetCol.length - 1]
  return isValidDrop(movingCard, targetCard)
}

export function findCompleteSequence(column: Card[]): number {
  if (column.length < 13) return -1

  const startIndex = column.length - 13

  const suit = column[startIndex].suit
  let expectedRank: Rank = 13

  for (let i = startIndex; i < column.length; i++) {
    const card = column[i]
    if (!card.faceUp) return -1
    if (card.suit !== suit) return -1
    if (card.rank !== expectedRank) return -1
    expectedRank = (expectedRank - 1) as Rank
  }

  return startIndex
}

export function findAllValidMoves(columns: Card[][]): Move[] {
  const moves: Move[] = []

  for (let from = 0; from < TABLEAU_COLUMNS; from++) {
    const sourceCol = columns[from]
    if (sourceCol.length === 0) continue

    const startingPoints: number[] = []

    for (let i = 0; i < sourceCol.length; i++) {
      if (!sourceCol[i].faceUp) continue

      if (
        i > 0 &&
        sourceCol[i - 1].faceUp &&
        sourceCol[i - 1].rank === sourceCol[i].rank + 1 &&
        sourceCol[i - 1].suit === sourceCol[i].suit
      ) {
        continue
      }

      const runSize = getValidRunFrom(sourceCol, i)
      if (runSize === 0) continue

      startingPoints.push(i)
    }

    for (const startIdx of startingPoints) {
      const runSize = getValidRunFrom(sourceCol, startIdx)
      const cardCount = sourceCol.length - startIdx
      if (runSize !== cardCount) continue
      const movingCard = sourceCol[startIdx]

      for (let to = 0; to < TABLEAU_COLUMNS; to++) {
        if (from === to) continue
        const targetCol = columns[to]

        if (targetCol.length === 0) {
          moves.push({ fromColumn: from, toColumn: to, cardCount })
        } else {
          const targetCard = targetCol[targetCol.length - 1]
          if (isValidDrop(movingCard, targetCard)) {
            moves.push({ fromColumn: from, toColumn: to, cardCount })
          }
        }
      }
    }
  }

  return moves
}

export function canAutoComplete(columns: Card[][], stock: Card[]): boolean {
  if (stock.length > 0) return false

  for (const col of columns) {
    for (const card of col) {
      if (!card.faceUp) return false
    }
  }

  return true
}

export function executeMove(
  columns: Card[][],
  move: Move
): Card[][] {
  const newColumns = columns.map((col) => [...col])
  const { fromColumn, toColumn, cardCount } = move

  if (fromColumn === 'stock') return newColumns

  const sourceCol = newColumns[fromColumn]
  const startIndex = sourceCol.length - cardCount

  const movingCards = sourceCol.splice(startIndex, cardCount)
  newColumns[toColumn].push(...movingCards)

  // Flip the top card of the source column if needed
  const newSourceCol = newColumns[fromColumn]
  if (newSourceCol.length > 0 && !newSourceCol[newSourceCol.length - 1].faceUp) {
    newSourceCol[newSourceCol.length - 1].faceUp = true
  }

  return newColumns
}

export function removeCompleteSequences(columns: Card[][]): {
  columns: Card[][]
  removed: number
} {
  const newColumns = columns.map((col) => [...col])
  let removed = 0

  for (let col = 0; col < TABLEAU_COLUMNS; col++) {
    const sequenceStart = findCompleteSequence(newColumns[col])
    if (sequenceStart >= 0) {
      newColumns[col].splice(sequenceStart, 13)
      removed++

      // Flip the new top card
      if (newColumns[col].length > 0 && !newColumns[col][newColumns[col].length - 1].faceUp) {
        newColumns[col][newColumns[col].length - 1].faceUp = true
      }

      // Check again in the same column (unlikely but possible with cascading)
      col--
    }
  }

  return { columns: newColumns, removed }
}

export function suggestMove(columns: Card[][]): Move | null {
  const allMoves = findAllValidMoves(columns)
  if (allMoves.length === 0) return null

  const tableauMoves: { move: Move; fromCol: number }[] = allMoves
    .filter((m) => m.fromColumn !== 'stock')
    .map((m) => ({ move: m, fromCol: m.fromColumn as number }))

  const suitMoves = tableauMoves.filter(({ move, fromCol }) => {
    const sourceCol = columns[fromCol]
    const startIndex = sourceCol.length - move.cardCount
    const movingCard = sourceCol[startIndex]
    const targetCol = columns[move.toColumn]
    if (targetCol.length === 0) return false
    return movingCard.suit === targetCol[targetCol.length - 1].suit
  })

  if (suitMoves.length > 0) {
    const kingMoves = suitMoves.filter(({ move, fromCol }) => {
      const sourceCol = columns[fromCol]
      const card = sourceCol[sourceCol.length - move.cardCount]
      return card.rank === 13
    })
    if (kingMoves.length > 0) return kingMoves[0].move

    const nonEmptyMoves = suitMoves.filter(({ move }) => columns[move.toColumn].length > 0)
    if (nonEmptyMoves.length > 0) return nonEmptyMoves[0].move

    return suitMoves[0].move
  }

  const nonEmptyMoves = allMoves.filter((m) => columns[m.toColumn].length > 0)
  if (nonEmptyMoves.length > 0) return nonEmptyMoves[0]

  return allMoves[0]
}
