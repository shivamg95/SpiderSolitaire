import { useEffect } from 'react'
import { Board } from '@/components/board/Board'
import { hydrateThemeFromSettings } from '@/state/settingsStore'
import '@/theme/tokens.css'

export default function App() {
  useEffect(() => {
    hydrateThemeFromSettings()
  }, [])

  return <Board />
}
