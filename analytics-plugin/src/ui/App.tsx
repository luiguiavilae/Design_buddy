import { useState, useEffect } from 'react'
import type { AnalyticsState, SandboxToUI } from '../types/analytics'

export default function App() {
  const [state, setState] = useState<AnalyticsState>({ status: 'loading' })

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data.pluginMessage as SandboxToUI
      if (!msg) return
      if (msg.type === 'ANALYTICS_LOADING') setState({ status: 'loading' })
      else if (msg.type === 'ANALYTICS_RESULT') {
        setState(msg.data.length === 0
          ? { status: 'empty' }
          : { status: 'data', rows: msg.data }
        )
      } else if (msg.type === 'ANALYTICS_ERROR') setState({ status: 'error', message: msg.message })
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  return (
    <div style={{ padding: 16, fontFamily: 'monospace', fontSize: 11 }}>
      <pre>{JSON.stringify(state, null, 2)}</pre>
    </div>
  )
}
