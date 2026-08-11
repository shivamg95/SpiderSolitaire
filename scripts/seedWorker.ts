/**
 * One seed-verification worker. Reads newline-delimited JSON jobs on stdin and
 * writes one `@RESULT {...}` line per job to stdout.
 *
 * This runs as a child process rather than a `worker_threads` worker because the
 * solver is imported through the `@/` alias, which only resolves under
 * vite-node's loader — and a CPU-bound search gets its own heap and GC this way,
 * which is what we want anyway.
 */
import { createInterface } from 'node:readline'
import type { Difficulty } from '@/engine/types'
import { SOLVE_PROFILES } from '@/solver/solve'
import { verifySeed } from '@/solver/verify'

interface Job {
  readonly seed: number
  readonly difficulty: Difficulty
  readonly maxMs: number
}

export const RESULT_PREFIX = '@RESULT '

const lines = createInterface({ input: process.stdin })

lines.on('line', (line) => {
  const trimmed = line.trim()
  if (trimmed === '') return
  if (trimmed === 'exit') {
    process.exit(0)
  }

  const job = JSON.parse(trimmed) as Job
  const outcome = verifySeed(job.seed, job.difficulty, {
    ...SOLVE_PROFILES.VERIFY,
    maxMs: job.maxMs,
  })

  process.stdout.write(
    RESULT_PREFIX +
      JSON.stringify({
        seed: outcome.seed,
        difficulty: outcome.difficulty,
        winnable: outcome.winnable,
        nodes: outcome.nodes,
        elapsedMs: outcome.elapsedMs,
        moveCount: outcome.moveCount,
      }) +
      '\n',
  )
})
