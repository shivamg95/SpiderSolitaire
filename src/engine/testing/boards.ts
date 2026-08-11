import type { GameState } from '../types'
import { parseBoard } from './ascii'

/**
 * Ten single-card columns with every rank two apart: nothing can stack on
 * anything, no column is empty to receive a run, and the stock is spent. There
 * is not one legal move on this board.
 *
 * Note the ranks repeat only twice — a 1-suit deck holds eight copies of each
 * rank, so ten identical cards is not a board that can exist.
 */
export function deadBoard(): GameState {
  return parseBoard(`
    difficulty: 1
    c0: [0] S2
    c1: [0] S2
    c2: [0] S4
    c3: [0] S4
    c4: [0] S6
    c5: [0] S6
    c6: [0] S8
    c7: [0] S8
    c8: [0] S10
    c9: [0] S10
    stock: 0
    found: 0
  `)
}

/** A board with all eight foundations complete. */
export function wonBoard(): GameState {
  return parseBoard(`
    difficulty: 1
    stock: 0
    found: 8
  `)
}
