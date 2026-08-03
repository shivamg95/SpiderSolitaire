import { useEffect } from 'react'
import { useGameStore } from '@/state/gameStore'
import { useSettingsStore } from '@/state/settingsStore'
import { useUiStore } from '@/state/uiStore'

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable
}

export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return
      const meta = e.metaKey || e.ctrlKey
      const key = e.key.toLowerCase()

      if (meta && key === 'z') {
        e.preventDefault()
        if (e.shiftKey) useGameStore.getState().redo()
        else useGameStore.getState().undo()
        return
      }

      if (e.key === 'Escape') {
        useUiStore.getState().closePanel()
        useUiStore.getState().clearSelection()
        return
      }

      if (meta) return

      if (key === 'h') {
        e.preventDefault()
        useGameStore.getState().requestHint()
        return
      }
      if (key === 'd' || e.code === 'Space') {
        e.preventDefault()
        useGameStore.getState().dealStock()
        return
      }
      if (key === 'n') {
        e.preventDefault()
        useGameStore.getState().newGame()
        return
      }
      if (key === 'm') {
        e.preventDefault()
        useSettingsStore.getState().toggleMute()
      }
    }

    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
    }
  }, [])
}
