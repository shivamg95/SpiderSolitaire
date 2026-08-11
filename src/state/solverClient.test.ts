import { afterEach, describe, expect, it } from 'vitest'
import { disposeSolverClient, getSolverClient } from './solverClient'

afterEach(() => {
  disposeSolverClient()
})

describe('solver client singleton', () => {
  /**
   * One client for the whole app, or the split between the hint channel and the
   * long-job channel is pointless: every caller would get a worker pair of its
   * own and a hint could still end up queued behind a search.
   */
  it('hands out the same client to every caller', () => {
    expect(getSolverClient()).toBe(getSolverClient())
  })

  it('builds a fresh client after disposal', () => {
    const first = getSolverClient()
    disposeSolverClient()
    expect(getSolverClient()).not.toBe(first)
  })
})
