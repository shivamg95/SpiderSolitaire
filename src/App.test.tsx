import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the Spider brand shell', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Spider' })).toBeInTheDocument()
    expect(screen.getByText(/neon solitaire/i)).toBeInTheDocument()
  })
})
