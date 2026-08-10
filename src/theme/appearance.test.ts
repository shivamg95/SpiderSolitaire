import { afterEach, describe, expect, it } from 'vitest'
import { applyAppearance, resolveAppearance, type AppearanceId } from '@/theme/themes'
import { useSettingsStore } from '@/state/settingsStore'
import { useUiStore } from '@/state/uiStore'
import type { RankedHint } from '@/solver/client'
import { createGame } from '@/engine/game'
import { rankedHints, SYNC_HINT_BUDGET } from '@/solver/search'
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
    const hints: RankedHint[] = [
      {
        move: { kind: 'moveRun', from: 0, to: 1, count: 1 },
        explanation: 'first',
        confidence: 'high',
        tier: 'suitMerge',
        cardIds: [],
      },
      {
        move: { kind: 'moveRun', from: 2, to: 3, count: 2 },
        explanation: 'second',
        confidence: 'medium',
        tier: 'uncover',
        cardIds: [],
      },
      {
        move: { kind: 'dealStock' },
        explanation: 'deals from the stock',
        confidence: 'low',
        tier: 'deal',
        cardIds: [],
      },
    ]
    const ui = useUiStore.getState()
    ui.startHintPlayback(hints)
    expect(useUiStore.getState().hintPlaying).toBe(true)
    expect(useUiStore.getState().hintMove).toEqual(hints[0]!.move)
    expect(useUiStore.getState().hintExplanation).toBe('first')

    ui.advanceHint()
    expect(useUiStore.getState().hintIndex).toBe(1)
    expect(useUiStore.getState().hintMove).toEqual(hints[1]!.move)

    ui.advanceHint()
    expect(useUiStore.getState().hintIndex).toBe(2)

    ui.advanceHint()
    expect(useUiStore.getState().hintIndex).toBe(0)
    expect(useUiStore.getState().hintMove).toEqual(hints[0]!.move)
  })

  it('rankedHints returns top moves best-first', () => {
    const handle = createGame(42, 1)
    const legal = hintableMoves(handle.state, handle.settings)
    const ranked = rankedHints(handle.state, 3, handle.settings, legal, SYNC_HINT_BUDGET)
    expect(ranked.length).toBeGreaterThan(0)
    expect(ranked.length).toBeLessThanOrEqual(3)
    if (ranked.length > 0) {
      expect(['high', 'medium', 'low']).toContain(ranked[0]!.confidence)
      expect(ranked[0]!.tier).toBeTruthy()
    }
  })
})
