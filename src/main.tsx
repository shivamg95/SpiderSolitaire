import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { startImmersiveLock } from '@/platform/immersive'
import './index.css'

startImmersiveLock()

const rootEl = document.getElementById('root')
if (!rootEl) {
  throw new Error('Root element #root not found')
}

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
