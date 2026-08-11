import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Difficulty } from '@/engine/types'
import { useGameStore } from '@/state/gameStore'
import { __resetSeedSourceForTests } from '@/state/seedSource'
import { useSettingsStore } from '@/state/settingsStore'
import { useUiStore } from '@/state/uiStore'
import { RescuePanel } from './RescuePanel'

const DIFFICULTY: Difficulty = 1

/** Resolves when the test lets it, so the searching state can be observed. */
let releaseSearch: (value: { index: number; checked: number }) => void = () => undefined

vi.mock('@/state/solverClient', () => ({
  getSolverClient: () => ({
    lastWinnable: () => ({
      promise: new Promise<{ index: number; checked: number }>((resolve) => {
        releaseSearch = resolve
      }),
      cancel: () => undefined,
    }),
  }),
  disposeSolverClient: () => undefined,
}))

beforeEach(() => {
  __resetSeedSourceForTests()
  useSettingsStore.setState({ safetyNet: true, winnableOnly: true })
  useUiStore.setState({
    openPanel: 'rescue',
    rescuePlan: null,
    rescueSearching: false,
    winnability: 'lost',
  })
  useGameStore.getState().newGame({ difficulty: DIFFICULTY })
})

describe('RescuePanel', () => {
  it('reports the search, then offers the rewind it found', async () => {
    useGameStore.getState().dealStock()
    useGameStore.getState().dealStock()
    const log = [...useGameStore.getState().handle.moveLog]

    render(<RescuePanel />)
    useGameStore.getState().findRescue()

    expect(await screen.findByText(/searching/i)).toBeInTheDocument()

    releaseSearch({ index: 1, checked: 2 })
    const rewind = await screen.findByRole('button', { name: /rewind 1 move$/i })

    await userEvent.click(rewind)
    const handle = useGameStore.getState().handle
    expect(handle.moveLog).toEqual(log.slice(0, 1))
    // The rewound move stays available, so a rewind is an offer rather than a verdict.
    expect(handle.redoLog[0]).toEqual(log[1])
    expect(useUiStore.getState().openPanel).toBeNull()
  })

  it('answers plainly when the current position is already the best one', async () => {
    render(<RescuePanel />)
    // No moves played, so there is nothing to search and nothing to rewind.
    useGameStore.getState().findRescue()

    expect(
      await screen.findByText(/already at the last winnable position/i),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^rewind/i })).not.toBeInTheDocument()
  })

  it('drops the search when the player closes the panel', async () => {
    useGameStore.getState().dealStock()
    render(<RescuePanel />)
    useGameStore.getState().findRescue()
    expect(await screen.findByText(/searching/i)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Keep playing' }))
    await waitFor(() => {
      expect(useUiStore.getState().rescueSearching).toBe(false)
    })
    expect(useUiStore.getState().openPanel).toBeNull()
  })
})
