import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Difficulty, Move } from '@/engine/types'
import type { LastWinnableResult } from '@/solver/rescue'
import { useGameStore } from '@/state/gameStore'
import { __resetSeedSourceForTests } from '@/state/seedSource'
import { useSettingsStore } from '@/state/settingsStore'
import { useUiStore } from '@/state/uiStore'
import { RescuePanel } from './RescuePanel'

const DIFFICULTY: Difficulty = 1
const DEAL: Move = { kind: 'dealStock' }

/** Resolves when the test lets it, so the searching state can be observed. */
let releaseSearch: (value: LastWinnableResult) => void = () => undefined
let failSearch: (error: Error) => void = () => undefined

vi.mock('@/state/solverClient', () => ({
  getSolverClient: () => ({
    lastWinnable: () => ({
      promise: new Promise<LastWinnableResult>((resolve, reject) => {
        releaseSearch = resolve
        failSearch = reject
      }),
      cancel: () => {
        failSearch(new Error('cancelled'))
      },
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
    rescueContinuation: [],
    winnability: 'lost',
    hintPlaying: false,
    hintMove: null,
  })
  useGameStore.getState().newGame({ difficulty: DIFFICULTY })
})

describe('RescuePanel', () => {
  it('reports the search, then rewinds and shows the next winning move', async () => {
    useGameStore.getState().dealStock()
    useGameStore.getState().dealStock()
    const log = [...useGameStore.getState().handle.moveLog]

    render(<RescuePanel />)
    useGameStore.getState().findRescue()

    expect(await screen.findByText(/searching/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^rewind/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Restart deal' })).not.toBeInTheDocument()

    releaseSearch({ index: 1, checked: 2, continuation: [DEAL] })
    const rewind = await screen.findByRole('button', { name: /rewind 1 move$/i })

    await userEvent.click(rewind)
    const handle = useGameStore.getState().handle
    expect(handle.moveLog).toEqual(log.slice(0, 1))
    expect(handle.redoLog).toEqual([])
    expect(useUiStore.getState().openPanel).toBeNull()
    expect(useUiStore.getState().hintPlaying).toBe(true)
    expect(useUiStore.getState().hintMove).toEqual(DEAL)
  })

  it('offers the next winning move when the current position is already winnable', async () => {
    useGameStore.getState().dealStock()
    render(<RescuePanel />)
    useGameStore.getState().findRescue()

    releaseSearch({
      index: 1,
      checked: 1,
      continuation: [DEAL],
    })

    expect(await screen.findByText(/this position can still be won/i)).toBeInTheDocument()
    const showNext = screen.getByRole('button', { name: 'Show next winning move' })
    expect(showNext).toHaveClass('btn--primary')
    expect(screen.getByRole('button', { name: 'Restart deal' })).toHaveClass('btn--ghost')
    expect(screen.queryByRole('button', { name: /^rewind/i })).not.toBeInTheDocument()

    await userEvent.click(showNext)
    expect(useUiStore.getState().openPanel).toBeNull()
    expect(useUiStore.getState().hintPlaying).toBe(true)
    expect(useUiStore.getState().hintMove).toEqual(DEAL)
  })

  it('does not offer a rewind when even the deal cannot be proven', async () => {
    useGameStore.getState().dealStock()
    render(<RescuePanel />)
    useGameStore.getState().findRescue()

    releaseSearch({ index: 0, checked: 2, continuation: [] })

    expect(await screen.findByText(/no proven winning line/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^rewind/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Restart deal' })).toHaveClass(
      'btn--primary',
    )
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
