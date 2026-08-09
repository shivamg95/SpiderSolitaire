import { afterEach, describe, expect, it } from 'vitest'
import { applyAppearance, resolveAppearance, type AppearanceId } from '@/theme/themes'
import { useSettingsStore } from '@/state/settingsStore'
import { useUiStore } from '@/state/uiStore'
import type { Move } from '@/engine/types'
import { createGame } from '@/engine/game'
import { rankedHints } from '@/solver/search'
import { hintableMoves } from '@/engine/game'

describe('appearance', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('data-appearance')
    useSettingsStore.setState({ appearance: 'system' })
  })

  it('resolves system/light/dark', () => {
    expect(resolveAppearance('light')).toBe('light')
    expect(resolveAppearance('dark')).toBe('dark')
    expect(resolveAppearance('system', true)).toBe('light')
    expect(resolveAppearance('system', false)).toBe('dark')
  })

  it('applyAppearance sets data-appearance on the document', () => {
    applyAppearance('light')
    expect(document.documentElement.getAttribute('data-appearance')).toBe('light')
    applyAppearance('dark')
    expect(document.documentElement.getAttribute('data-appearance')).toBe('dark')
  })

  it('settings store setAppearance updates the attribute', () => {
    useSettingsStore.getState().setAppearance('light' as AppearanceId)
    expect(document.documentElement.getAttribute('data-appearance')).toBe('light')
  })
})

describe('hint playback', () => {
  afterEach(() => {
    useUiStore.getState().stopHintPlayback()
  })

  it('cycles through the hint queue and wraps', () => {
    const moves: Move[] = [
      { kind: 'moveRun', from: 0, to: 1, count: 1 },
      { kind: 'moveRun', from: 2, to: 3, count: 2 },
      { kind: 'dealStock' },
    ]
    const ui = useUiStore.getState()
    ui.startHintPlayback(moves)
    expect(useUiStore.getState().hintPlaying).toBe(true)
    expect(useUiStore.getState().hintMove).toEqual(moves[0])

    ui.advanceHint()
    expect(useUiStore.getState().hintIndex).toBe(1)
    expect(useUiStore.getState().hintMove).toEqual(moves[1])

    ui.advanceHint()
    expect(useUiStore.getState().hintIndex).toBe(2)

    ui.advanceHint()
    expect(useUiStore.getState().hintIndex).toBe(0)
    expect(useUiStore.getState().hintMove).toEqual(moves[0])
  })

  it('rankedHints returns moves best-first', () => {
    const handle = createGame(42, 1)
    const legal = hintableMoves(handle.state, handle.settings)
    const ranked = rankedHints(handle.state, legal.length, handle.settings)
    expect(ranked.length).toBe(legal.length)
    // Confidence of first is high when there is at least one move
    if (ranked.length > 0) {
      expect(ranked[0]!.confidence).toBe('high')
    }
  })
})
