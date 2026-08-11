/**
 * Parameter sweep for the solver, used while tuning. Not part of the shipped
 * pipeline — `scripts/bench.ts` is the gate.
 *
 *   npx vite-node scripts/sweep.ts -- --count 25 --ms 3000 --difficulty 4
 */
import { createGame } from '@/engine/game'
import type { Difficulty } from '@/engine/types'
import type { SearchWeights } from '@/solver/heuristics'
import { SOLVE_PROFILES, solveDeal, type SolveBudget } from '@/solver/solve'
import { replayWins, VERIFY_SETTINGS } from '@/solver/verify'

function arg(name: string, fallback: number): number {
  const argv = process.argv
  const i = argv.indexOf(`--${name}`)
  return i >= 0 && argv[i + 1] !== undefined ? Number(argv[i + 1]) : fallback
}

const count = arg('count', 25)
const maxMs = arg('ms', 3000)
const difficulty = arg('difficulty', 4) as Difficulty

function weights(
  foundations: number,
  faceDown: number,
  suitPairs: number,
  suitGroupsQuad: number,
  junctions: number,
  hardBreaks: number,
  emptyColumns: number,
): SearchWeights {
  return {
    foundations,
    faceDown,
    buried: 2,
    suitPairs,
    suitGroupsQuad,
    junctions,
    hardBreaks,
    emptyColumns,
    tailRun: 0.5,
  }
}

const tuned = weights(1000, 3, 0, 8, 8, 4, 20)

const variants: {
  label: string
  weights: SearchWeights
  budget?: Partial<SolveBudget>
}[] = [4_000, 12_000, 30_000, 80_000, 250_000].map((attemptNodes) => ({
  label: `restart @${attemptNodes}`,
  weights: tuned,
  budget: { attemptNodes },
}))

console.log(`sweep: ${count} deals, ${difficulty}-suit, ${maxMs}ms budget\n`)

for (const variant of variants) {
  const budget: SolveBudget = {
    ...SOLVE_PROFILES.VERIFY,
    maxMs,
    weights: variant.weights,
    ...variant.budget,
  }
  let solved = 0
  let totalMs = 0
  let totalNodes = 0
  for (let seed = 1; seed <= count; seed++) {
    const { state } = createGame(seed, difficulty, VERIFY_SETTINGS)
    const started = Date.now()
    const result = solveDeal(state, budget, VERIFY_SETTINGS)
    totalMs += Date.now() - started
    totalNodes += result.nodes
    if (result.status === 'solved' && replayWins(state, result.moves)) solved += 1
  }
  console.log(
    `${variant.label.padEnd(20)} solved ${String(solved).padStart(3)}/${count}` +
      `  ${(totalMs / 1000).toFixed(1)}s  ${totalNodes.toLocaleString('en-US')} nodes`,
  )
}
