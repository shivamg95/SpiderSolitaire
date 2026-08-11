/**
 * Build the shipped pool of provably winnable seeds.
 *
 *   npm run seeds:generate -- --count 200,600,600 --ms 8000 --jobs 10
 *
 * Every candidate seed is dealt, solved, and then the solution is replayed move
 * by move through the real engine; only seeds that reach a won state are kept.
 * That is what makes the runtime promise safe — a weaker solver produces a
 * smaller pool, never an unwinnable deal.
 *
 * Progress is cached in scripts/.seed-cache.json, so a long run can be stopped
 * and resumed without re-solving anything.
 */
import { spawn, type ChildProcessByStdio } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { availableParallelism } from 'node:os'
import path from 'node:path'
import { createInterface } from 'node:readline'
import type { Readable, Writable } from 'node:stream'
import { fileURLToPath } from 'node:url'
import { format, resolveConfig } from 'prettier'
import type { Difficulty } from '@/engine/types'
import { DIFFICULTIES } from '@/solver/seedPool'
import { RESULT_PREFIX } from './seedWorker'

/** stderr is inherited, so it is null on the handle. */
type SolverChild = ChildProcessByStdio<Writable, Readable, null>

const scriptsDir = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(scriptsDir, '..')
const CACHE_PATH = path.join(scriptsDir, '.seed-cache.json')
const OUTPUT_PATH = path.join(rootDir, 'src', 'solver', 'seedPool.generated.ts')

const POOL_VERSION = 1

interface Result {
  readonly seed: number
  readonly difficulty: Difficulty
  readonly winnable: boolean
  readonly nodes: number
  readonly elapsedMs: number
  readonly moveCount: number
}

interface Cache {
  budgetMs: number
  results: Record<string, { winnable: boolean; nodes: number }>
}

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}

const targets: Record<Difficulty, number> = (() => {
  const raw = flag('count') ?? '200,600,600'
  const parts = raw.split(',').map(Number)
  return {
    1: parts[0] ?? 200,
    2: parts[1] ?? parts[0] ?? 600,
    4: parts[2] ?? parts[0] ?? 600,
  }
})()

const budgetMs = Number(flag('ms') ?? 8000)
const jobs = Number(flag('jobs') ?? Math.max(1, availableParallelism() - 2))
const startSeed = Number(flag('start') ?? 1)

function loadCache(): Cache {
  if (!existsSync(CACHE_PATH)) return { budgetMs, results: {} }
  const cache = JSON.parse(readFileSync(CACHE_PATH, 'utf8')) as Cache
  // A larger budget can turn a previous failure into a success, so only reuse
  // negative results when they were produced with at least as much time.
  if (cache.budgetMs < budgetMs) {
    return {
      budgetMs,
      results: Object.fromEntries(
        Object.entries(cache.results).filter(([, v]) => v.winnable),
      ),
    }
  }
  return cache
}

const cache = loadCache()

function saveCache(): void {
  cache.budgetMs = budgetMs
  writeFileSync(CACHE_PATH, JSON.stringify(cache), 'utf8')
}

class WorkerPool {
  private readonly children: SolverChild[] = []
  private readonly idle: SolverChild[] = []
  private readonly waiting: ((child: SolverChild) => void)[] = []
  private readonly pending = new Map<SolverChild, (result: Result) => void>()

  constructor(size: number) {
    for (let i = 0; i < size; i++) {
      const child = spawn(
        process.execPath,
        [
          path.join(rootDir, 'node_modules', 'vite-node', 'dist', 'cli.mjs'),
          path.join(scriptsDir, 'seedWorker.ts'),
        ],
        { cwd: rootDir, stdio: ['pipe', 'pipe', 'inherit'] },
      )

      createInterface({ input: child.stdout }).on('line', (line) => {
        if (!line.startsWith(RESULT_PREFIX)) return
        const result = JSON.parse(line.slice(RESULT_PREFIX.length)) as Result
        const resolve = this.pending.get(child)
        this.pending.delete(child)
        this.release(child)
        resolve?.(result)
      })

      this.children.push(child)
      this.idle.push(child)
    }
  }

  private release(child: SolverChild): void {
    const next = this.waiting.shift()
    if (next) next(child)
    else this.idle.push(child)
  }

  private async acquire(): Promise<SolverChild> {
    const free = this.idle.pop()
    if (free) return free
    return new Promise((resolve) => this.waiting.push(resolve))
  }

  async run(seed: number, difficulty: Difficulty): Promise<Result> {
    const child = await this.acquire()
    return new Promise<Result>((resolve) => {
      this.pending.set(child, resolve)
      child.stdin.write(`${JSON.stringify({ seed, difficulty, maxMs: budgetMs })}\n`)
    })
  }

  close(): void {
    for (const child of this.children) {
      child.stdin.write('exit\n')
      child.stdin.end()
    }
  }
}

/** 1..5 stars by quantile of solver effort within a difficulty. */
function starsFor(nodes: number, sorted: readonly number[]): number {
  if (sorted.length === 0) return 3
  let below = 0
  while (below < sorted.length && sorted[below]! < nodes) below += 1
  const q = below / sorted.length
  if (q < 0.2) return 1
  if (q < 0.4) return 2
  if (q < 0.6) return 3
  if (q < 0.8) return 4
  return 5
}

async function collect(
  pool: WorkerPool,
  difficulty: Difficulty,
  target: number,
): Promise<{ seed: number; nodes: number }[]> {
  const found: { seed: number; nodes: number }[] = []
  let seed = startSeed
  let attempted = 0
  let inFlight = 0
  let saveCounter = 0

  const report = (): void => {
    const rate = attempted === 0 ? 0 : (found.length / attempted) * 100
    process.stdout.write(
      `  ${difficulty}-suit  ${found.length}/${target} kept   ` +
        `${attempted} tried  ${rate.toFixed(0)}% rate      \r`,
    )
  }

  await new Promise<void>((done) => {
    const pump = (): void => {
      while (found.length < target && inFlight < jobs) {
        const candidate = seed++
        const key = `${difficulty}:${candidate}`
        const cached = cache.results[key]
        if (cached) {
          attempted += 1
          if (cached.winnable && found.length < target) {
            found.push({ seed: candidate, nodes: cached.nodes })
          }
          continue
        }

        inFlight += 1
        void pool.run(candidate, difficulty).then((result) => {
          inFlight -= 1
          attempted += 1
          cache.results[key] = { winnable: result.winnable, nodes: result.nodes }
          if (result.winnable && found.length < target) {
            found.push({ seed: result.seed, nodes: result.nodes })
          }
          if (++saveCounter % 25 === 0) saveCache()
          report()
          if (found.length >= target && inFlight === 0) {
            done()
            return
          }
          pump()
        })
      }
      if (found.length >= target && inFlight === 0) done()
    }
    pump()
  })

  saveCache()
  found.sort((a, b) => a.seed - b.seed)
  process.stdout.write('\n')
  return found
}

async function emit(
  pools: Record<Difficulty, { seed: number; nodes: number }[]>,
): Promise<void> {
  const lines: string[] = [
    '// Generated by scripts/generateSeeds.ts. Do not edit by hand.',
    '//',
    '// Every seed here was solved and the solution replayed through the engine to',
    '// a won state under the strict ruleset (allowDealWithEmptyColumn: false), so',
    '// each one is winnable whichever way the player leaves that setting.',
    "import type { SeedPoolData } from './seedPool'",
    '',
    'export const SEED_POOL: SeedPoolData = {',
    `  version: ${POOL_VERSION},`,
    `  generatedAt: '${new Date().toISOString()}',`,
    `  budgetMs: ${budgetMs},`,
    '  pools: {',
  ]

  for (const difficulty of DIFFICULTIES) {
    const entries = pools[difficulty]
    const sortedNodes = entries.map((e) => e.nodes).sort((a, b) => a - b)
    const stars = entries.map((e) => starsFor(e.nodes, sortedNodes)).join('')
    lines.push(`    ${difficulty}: {`)
    lines.push('      seeds: [')
    for (let i = 0; i < entries.length; i += 12) {
      lines.push(
        `        ${entries
          .slice(i, i + 12)
          .map((e) => e.seed)
          .join(', ')},`,
      )
    }
    lines.push('      ],')
    lines.push(`      stars: '${stars}',`)
    lines.push('    },')
  }

  lines.push('  },')
  lines.push('}')
  lines.push('')

  // Run the file through Prettier so the committed asset matches format:check.
  const config = await resolveConfig(OUTPUT_PATH)
  const source = await format(lines.join('\n'), {
    ...config,
    filepath: OUTPUT_PATH,
  })

  mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true })
  writeFileSync(OUTPUT_PATH, source, 'utf8')
}

async function main(): Promise<void> {
  console.log(
    `generating seed pool: targets ${targets[1]}/${targets[2]}/${targets[4]}, ` +
      `${budgetMs}ms per candidate, ${jobs} workers\n`,
  )
  const pool = new WorkerPool(jobs)
  const started = Date.now()
  const results: Record<Difficulty, { seed: number; nodes: number }[]> = {
    1: [],
    2: [],
    4: [],
  }

  try {
    for (const difficulty of DIFFICULTIES) {
      results[difficulty] = await collect(pool, difficulty, targets[difficulty])
    }
  } finally {
    pool.close()
  }

  await emit(results)
  console.log(
    `\nwrote ${path.relative(rootDir, OUTPUT_PATH)} in ` +
      `${((Date.now() - started) / 1000).toFixed(0)}s`,
  )
}

void main()
