import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Difficulty } from '@/engine/types'
import { useGameStore } from '@/state/gameStore'
import { __resetSeedSourceForTests } from '@/state/seedSource'
import { useSettingsStore } from '@/state/settingsStore'
import { useUiStore } from '@/state/uiStore'
import { RescueBanner } from './RescueBanner'

const DIFFICULTY: Difficulty = 1

vi.mock('@/state/solverClient', () => ({
  getSolverClient: () => ({
    lastWinnable: () => ({
      promise: Promise.resolve({ index: 0, checked: 1, continuation: [] }),
      cancel: () => undefined,
    }),
  }),
  disposeSolverClient: () => undefined,
}))

beforeEach(() => {
  __resetSeedSourceForTests()
  useSettingsStore.setState({ safetyNet: true, winnableOnly: true })
  useUiStore.setState({
    winnability: 'idle',
    warningDismissed: false,
    openPanel: null,
    rescuePlan: null,
  })
  useGameStore.getState().newGame({ difficulty: DIFFICULTY })
})

/** Put a move in the log so the position is the player's doing, not the deal's. */
function playOneMove(): void {
  useGameStore.getState().dealStock()
}

describe('RescueBanner', () => {
  it('says nothing until the position is proven dead', () => {
    for (const winnability of ['idle', 'checking', 'winnable', 'unknown'] as const) {
      useUiStore.setState({ winnability })
      const { unmount } = render(<RescueBanner />)
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
      unmount()
    }
  })

  it('blames the move and offers an undo once the deal is lost', async () => {
    playOneMove()
    useUiStore.setState({ winnability: 'lost' })
    render(<RescueBanner />)

    expect(screen.getByText(/made this deal unwinnable/i)).toBeInTheDocument()
    const before = useGameStore.getState().handle.moveLog.length
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(useGameStore.getState().handle.moveLog.length).toBe(before - 1)
  })

  it('sends the rescue button to the rescue panel', async () => {
    playOneMove()
    useUiStore.setState({ winnability: 'lost' })
    render(<RescueBanner />)

    await userEvent.click(screen.getByRole('button', { name: 'Rescue' }))
    expect(useUiStore.getState().openPanel).toBe('rescue')
  })

  it('blames the deal, not the player, when nothing has been played yet', () => {
    useUiStore.setState({ winnability: 'lost' })
    render(<RescueBanner />)

    expect(screen.getByText(/deal cannot be won/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Rescue' })).not.toBeInTheDocument()
  })

  it('stays dismissed for the position the player dismissed it on', async () => {
    useUiStore.setState({ winnability: 'lost' })
    render(<RescueBanner />)

    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('is off entirely when the safety net is switched off', () => {
    useSettingsStore.setState({ safetyNet: false })
    useUiStore.setState({ winnability: 'lost' })
    render(<RescueBanner />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
