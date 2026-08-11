/**
 * Re-prove every seed in the committed pool. This is the check that backs the
 * "verified winnable" badge, so it re-solves from scratch rather than trusting
 * anything recorded at generation time.
 *
 *   npm run seeds:verify -- --ms 60000
 *   npm run seeds:verify -- --limit 5      # smoke a few per difficulty
 *
 * Exits non-zero if any shipped seed cannot be proven winnable.
 */
import { spawn, type ChildProcessByStdio } from 'node:child_process'
import { availableParallelism } from 'node:os'
import path from 'node:path'
import { createInterface } from 'node:readline'
import type { Readable, Writable } from 'node:stream'
import { fileURLToPath } from 'node:url'
import type { Difficulty } from '@/engine/types'
import { DIFFICULTIES, pooledSeeds, SEED_POOL } from '@/solver/seedPool'
import { RESULT_PREFIX } from './seedWorker'

/** stderr is inherited, so it is null on the handle. */
type SolverChild = ChildProcessByStdio<Writable, Readable, null>

const scriptsDir = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(scriptsDir, '..')

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}

const budgetMs = Number(flag('ms') ?? Math.max(20_000, SEED_POOL.budgetMs * 3))
const jobs = Number(flag('jobs') ?? Math.max(1, availableParallelism() - 2))
/** Seeds per difficulty; the whole pool unless a smoke run asks for fewer. */
const limit = Number(flag('limit') ?? Number.POSITIVE_INFINITY)

interface Result {
  readonly seed: number
  readonly difficulty: Difficulty
  readonly winnable: boolean
}

function makeChild(): SolverChild {
  return spawn(
    process.execPath,
    [
      path.join(rootDir, 'node_modules', 'vite-node', 'dist', 'cli.mjs'),
      path.join(scriptsDir, 'seedWorker.ts'),
    ],
    { cwd: rootDir, stdio: ['pipe', 'pipe', 'inherit'] },
  )
}

async function main(): Promise<void> {
  const queue = DIFFICULTIES.flatMap((difficulty) =>
    pooledSeeds(difficulty).slice(0, limit),
  )
  if (queue.length === 0) {
    console.error('seed pool is empty — run npm run seeds:generate first')
    process.exit(1)
  }

  console.log(
    `verifying ${queue.length} pooled seeds with a ${budgetMs}ms budget on ${jobs} workers\n`,
  )

  const failures: { seed: number; difficulty: Difficulty }[] = []
  let done = 0
  let cursor = 0
  const children = Array.from({ length: Math.min(jobs, queue.length) }, makeChild)

  await Promise.all(
    children.map(
      (child) =>
        new Promise<void>((resolveWorker) => {
          const next = (): void => {
            const job = queue[cursor++]
            if (!job) {
              child.stdin.write('exit\n')
              child.stdin.end()
              resolveWorker()
              return
            }
            child.stdin.write(
              `${JSON.stringify({ seed: job.seed, difficulty: job.difficulty, maxMs: budgetMs })}\n`,
            )
          }

          createInterface({ input: child.stdout }).on('line', (line) => {
            if (!line.startsWith(RESULT_PREFIX)) return
            const result = JSON.parse(line.slice(RESULT_PREFIX.length)) as Result
            done += 1
            if (!result.winnable) {
              failures.push({ seed: result.seed, difficulty: result.difficulty })
            }
            process.stdout.write(
              `  ${done}/${queue.length} checked, ${failures.length} failed    \r`,
            )
            next()
          })

          next()
        }),
    ),
  )

  process.stdout.write('\n')
  if (failures.length > 0) {
    console.error(`\n${failures.length} pooled seed(s) could not be proven winnable:`)
    for (const f of failures) console.error(`  ${f.difficulty}-suit seed ${f.seed}`)
    process.exit(1)
  }
  console.log(`\nall ${queue.length} pooled seeds verified winnable`)
}

void main()
