import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import type { Difficulty } from '@/engine/types'
import { pooledSeedAt } from '@/solver/seedPool'
import { __resetSeedSourceForTests } from '@/state/seedSource'
import { DealBadge } from './DealBadge'

const DIFFICULTY: Difficulty = 4

beforeEach(() => {
  __resetSeedSourceForTests()
})

describe('DealBadge', () => {
  it('vouches for a seed from the verified pool', () => {
    const pooled = pooledSeedAt(DIFFICULTY, 0)
    if (!pooled) return

    render(<DealBadge seed={pooled.seed} difficulty={DIFFICULTY} />)
    expect(screen.getByLabelText(/verified winnable/i)).toBeInTheDocument()
    expect(screen.getByLabelText(new RegExp(`${pooled.stars} of 5`))).toBeInTheDocument()
  })

  it('stays silent for a deal it cannot vouch for', () => {
    // A shared or hand-entered seed was never solved, so claiming it is winnable
    // would be a promise the app cannot keep.
    render(<DealBadge seed={0xdecafbad} difficulty={DIFFICULTY} />)
    expect(screen.queryByLabelText(/verified winnable/i)).not.toBeInTheDocument()
  })
})
