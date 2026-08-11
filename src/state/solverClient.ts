import { SolverClient } from '@/solver/client'

let client: SolverClient | null = null

/**
 * Shared solver client. One instance across the app so the hint channel and the
 * long-job channel are each a single worker, rather than one pair per caller.
 */
export function getSolverClient(): SolverClient {
  client ??= new SolverClient()
  return client
}

export function disposeSolverClient(): void {
  client?.terminate()
  client = null
}
