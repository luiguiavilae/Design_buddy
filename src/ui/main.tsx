import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

console.log('[Designer Buddy] ui loaded')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
