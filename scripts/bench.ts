/**
 * Solver benchmark: how often can we prove a random deal winnable, and at what
 * cost? This is the gate for the whole guaranteed-winnable feature, because the
 * shipped seed pool can only be as large as the solve rate allows.
 *
 *   npx vite-node scripts/bench.ts -- --count 100 --ms 30000
 */
import type { Difficulty } from '@/engine/types'
import { SOLVE_PROFILES } from '@/solver/solve'
import { verifySeed } from '@/solver/verify'

interface Options {
  count: number
  maxMs: number
  difficulties: Difficulty[]
  startSeed: number
}

function parseArgs(argv: readonly string[]): Options {
  const options: Options = {
    count: 100,
    maxMs: SOLVE_PROFILES.VERIFY.maxMs,
    difficulties: [1, 2, 4],
    startSeed: 1,
  }
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i]
    const value = argv[i + 1]
    if (value === undefined) continue
    if (flag === '--count') options.count = Number(value)
    if (flag === '--ms') options.maxMs = Number(value)
    if (flag === '--start') options.startSeed = Number(value)
    if (flag === '--difficulty') {
      options.difficulties = value.split(',').map((d) => Number(d) as Difficulty)
    }
  }
  return options
}

function quantile(sorted: readonly number[], q: number): number {
  if (sorted.length === 0) return 0
  const index = Math.min(sorted.length - 1, Math.floor(sorted.length * q))
  return sorted[index]!
}

function format(n: number): string {
  return n.toLocaleString('en-US')
}

function run(): void {
  const options = parseArgs(process.argv.slice(2))
  const budget = { ...SOLVE_PROFILES.VERIFY, maxMs: options.maxMs }

  console.log(
    `solver bench: ${options.count} deals per difficulty, ${options.maxMs}ms budget each\n`,
  )

  for (const difficulty of options.difficulties) {
    const solvedMs: number[] = []
    const solvedNodes: number[] = []
    let solved = 0
    let totalMs = 0

    for (let i = 0; i < options.count; i++) {
      const outcome = verifySeed(options.startSeed + i, difficulty, budget)
      totalMs += outcome.elapsedMs
      if (outcome.winnable) {
        solved += 1
        solvedMs.push(outcome.elapsedMs)
        solvedNodes.push(outcome.nodes)
      }
      if ((i + 1) % 10 === 0) {
        process.stdout.write(
          `  ${difficulty}-suit  ${i + 1}/${options.count}  solved ${solved}\r`,
        )
      }
    }

    solvedMs.sort((a, b) => a - b)
    solvedNodes.sort((a, b) => a - b)
    const rate = ((solved / options.count) * 100).toFixed(1)

    console.log(`${difficulty}-suit`.padEnd(10) + `solve rate ${rate}%`.padEnd(22))
    console.log(
      `  median ${format(quantile(solvedMs, 0.5))}ms / ` +
        `${format(quantile(solvedNodes, 0.5))} nodes`,
    )
    console.log(
      `  p90    ${format(quantile(solvedMs, 0.9))}ms / ` +
        `${format(quantile(solvedNodes, 0.9))} nodes`,
    )
    console.log(`  wall   ${(totalMs / 1000).toFixed(1)}s total\n`)
  }
}

run()
