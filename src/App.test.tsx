import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import App from './App'

vi.mock('@/state/gameStore', async () => {
  const actual =
    await vi.importActual<typeof import('@/state/gameStore')>('@/state/gameStore')
  return actual
})

describe('App', () => {
  it('renders the Spider board chrome', () => {
    render(<App />)
    expect(screen.getByText('Spider')).toBeInTheDocument()
  })
})
