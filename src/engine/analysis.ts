import type { Card, GameSnapshot, Move, MoveRecord, MoveClassification } from '../types'
import { TABLEAU_COLUMNS } from '../types'
import { getValidRunFrom, isValidDrop } from '../engine/rules'

function calculateBoardScore(
  columns: Card[][],
  foundations: number,
  stock: Card[]
): number {
  let score = 0

  score += foundations * 15

  score -= stock.length * 0.5

  for (const col of columns) {
    if (col.length === 0) {
      score += 5
      continue
    }

    for (const card of col) {
      if (!card.faceUp) {
        score -= 5
      }
    }

    const faceUpStart = col.findIndex(c => c.faceUp)
    if (faceUpStart >= 0) {
      const faceUpCards = col.slice(faceUpStart)
      for (let i = 0; i < faceUpCards.length; i++) {
        const runSize = getValidRunFrom(faceUpCards, i)
        if (runSize >= 3) {
          score += 2
          i += runSize - 1
        }
      }
    }
  }

  const nonEmptyCols = columns.filter(c => c.length > 0).length
  score += nonEmptyCols * 0.5

  return score
}

function findAlternativeMoves(columns: Card[][], fromCol: number, cardIndex: number): Move[] {
  const alternatives: Move[] = []
  const sourceCol = columns[fromCol]
  if (!sourceCol || sourceCol.length === 0) return alternatives

  const movingCard = sourceCol[cardIndex]
  if (!movingCard?.faceUp) return alternatives

  for (let to = 0; to < TABLEAU_COLUMNS; to++) {
    if (to === fromCol) continue
    const targetCol = columns[to]

    if (targetCol.length === 0) {
      alternatives.push({ fromColumn: fromCol, toColumn: to, cardCount: sourceCol.length - cardIndex })
    } else {
      const targetCard = targetCol[targetCol.length - 1]
      if (isValidDrop(movingCard, targetCard)) {
        alternatives.push({ fromColumn: fromCol, toColumn: to, cardCount: sourceCol.length - cardIndex })
      }
    }
  }

  return alternatives
}

export interface AnalyzedMove extends MoveRecord {
  scoreBefore: number
  scoreAfter: number
  scoreDelta: number
  bestAlternativeDelta: number
  alternatives: Move[]
  faceDownRevealed: number
}

export interface AnalysisResult {
  moves: AnalyzedMove[]
  accuracy: number
  brilliant: number
  excellent: number
  good: number
  inaccuracy: number
  blunder: number
  scoreHistory: number[]
}

function countFaceDownChange(before: GameSnapshot, after: GameSnapshot): number {
  let beforeCount = 0
  let afterCount = 0
  for (const col of before.columns) {
    for (const card of col) {
      if (!card.faceUp) beforeCount++
    }
  }
  for (const col of after.columns) {
    for (const card of col) {
      if (!card.faceUp) afterCount++
    }
  }
  return beforeCount - afterCount
}

export function analyzeGame(history: MoveRecord[]): AnalysisResult {
  const analyzed: AnalyzedMove[] = []
  let totalScore = 0

  let brilliant = 0
  let excellent = 0
  let good = 0
  let inaccuracy = 0
  let blunder = 0
  const scoreHistory: number[] = []

  for (let i = 0; i < history.length; i++) {
    const record = history[i]
    const { snapshotBefore, snapshotAfter, move } = record

    if (move.fromColumn === 'stock') {
      const scoreBefore = calculateBoardScore(snapshotBefore.columns, snapshotBefore.foundations, snapshotBefore.stock)
      const scoreAfter = calculateBoardScore(snapshotAfter.columns, snapshotAfter.foundations, snapshotAfter.stock)
      scoreHistory.push(scoreAfter)
      analyzed.push({
        ...record,
        scoreBefore,
        scoreAfter,
        scoreDelta: scoreAfter - scoreBefore,
        bestAlternativeDelta: 0,
        alternatives: [],
        faceDownRevealed: 0,
        classification: 'good',
      })
      good++
      totalScore += 1
      continue
    }

    const columns = snapshotBefore.columns
    const fromCol = move.fromColumn as number
    const sourceCol = columns[fromCol]
    const cardIndex = sourceCol.length - move.cardCount

    const alternatives = findAlternativeMoves(columns, fromCol, cardIndex)

    const scoreBefore = calculateBoardScore(snapshotBefore.columns, snapshotBefore.foundations, snapshotBefore.stock)
    const scoreAfter = calculateBoardScore(snapshotAfter.columns, snapshotAfter.foundations, snapshotAfter.stock)
    const scoreDelta = scoreAfter - scoreBefore
    scoreHistory.push(scoreAfter)

    let bestAltDelta = -Infinity
    for (const alt of alternatives) {
      if (alt.fromColumn === move.fromColumn && alt.toColumn === move.toColumn) continue
      const altAfter = simulateMoveScore(
        snapshotBefore.columns,
        snapshotBefore.foundations,
        snapshotBefore.stock,
        alt
      )
      const altDelta = altAfter - scoreBefore
      if (altDelta > bestAltDelta) bestAltDelta = altDelta
    }

    if (bestAltDelta === -Infinity) bestAltDelta = scoreDelta

    const faceDownRevealed = countFaceDownChange(snapshotBefore, snapshotAfter)

    let classification: MoveClassification

    const isOnlyReveal = alternatives.every(alt => {
      if (alt.toColumn === move.toColumn && alt.fromColumn === move.fromColumn) return true
      return !doesRevealFaceDown(snapshotBefore.columns, alt)
    }) && faceDownRevealed > 0

    if (isOnlyReveal) {
      classification = 'brilliant'
      brilliant++
      totalScore += 1.0
    } else if (scoreDelta > bestAltDelta - 2 && scoreDelta > 2) {
      classification = 'excellent'
      excellent++
      totalScore += 0.9
    } else if (scoreDelta > 0) {
      classification = 'good'
      good++
      totalScore += 0.7
    } else if (scoreDelta <= 0 && bestAltDelta > scoreDelta + 3) {
      classification = 'blunder'
      blunder++
      totalScore += 0.1
    } else if (scoreDelta <= 0) {
      classification = 'inaccuracy'
      inaccuracy++
      totalScore += 0.3
    } else {
      classification = 'good'
      good++
      totalScore += 0.7
    }

    analyzed.push({
      ...record,
      scoreBefore,
      scoreAfter,
      scoreDelta,
      bestAlternativeDelta: bestAltDelta,
      alternatives,
      faceDownRevealed,
      classification,
    })
  }

  const accuracy = history.length > 0 ? Math.round((totalScore / history.length) * 100) : 0

  return {
    moves: analyzed,
    accuracy: Math.min(100, accuracy),
    brilliant,
    excellent,
    good,
    inaccuracy,
    blunder,
    scoreHistory,
  }
}

function simulateMoveScore(
  columns: Card[][],
  foundations: number,
  stock: Card[],
  move: Move
): number {
  const newColumns = columns.map(col => [...col])
  if (move.fromColumn === 'stock') return calculateBoardScore(columns, foundations, stock)

  const sourceCol = newColumns[move.fromColumn]
  const startIndex = sourceCol.length - move.cardCount
  const movingCards = sourceCol.splice(startIndex, move.cardCount)
  newColumns[move.toColumn].push(...movingCards)

  if (sourceCol.length > 0 && !sourceCol[sourceCol.length - 1].faceUp) {
    sourceCol[sourceCol.length - 1].faceUp = true
  }

  return calculateBoardScore(newColumns, foundations, stock)
}

function doesRevealFaceDown(columns: Card[][], move: Move): boolean {
  if (move.fromColumn === 'stock') return false
  const sourceCol = columns[move.fromColumn]
  const startIndex = sourceCol.length - move.cardCount
  const cardAbove = sourceCol[startIndex - 1]
  return cardAbove != null && !cardAbove.faceUp
}

export function normalizeScore(scores: number[]): number[] {
  const min = Math.min(...scores, 0)
  const max = Math.max(...scores, 1)
  const range = max - min

  if (range === 0) return scores.map(() => 50)

  return scores.map(s => ((s - min) / range) * 85 + 5)
}
