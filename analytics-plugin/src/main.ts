import type { EvaluationRow } from './types/analytics'

const USE_MOCK = true
const ANALYTICS_READ_URL = ''
// To wire the real endpoint: set USE_MOCK = false and paste the PA Reader URL in ANALYTICS_READ_URL

// Mock dataset: 10 rows, 4 designers, scores across all 3 bands, timestamps in last 4 weeks
const MOCK_DATA: EvaluationRow[] = [
  { fileId: 'f1', fileName: 'App - Pagos', pageName: 'Inicio', userName: 'Andrea Torres', overallScore: 87, timestamp: '2026-02-10T09:15:00Z' },
  { fileId: 'f2', fileName: 'Onboarding v3', pageName: 'Bienvenida', userName: 'Carlos Mendoza', overallScore: 62, timestamp: '2026-02-12T11:30:00Z' },
  { fileId: 'f3', fileName: 'Dashboard BCP', pageName: 'Resumen', userName: 'Lucia Quispe', overallScore: 45, timestamp: '2026-02-14T14:00:00Z' },
  { fileId: 'f4', fileName: 'App - Pagos', pageName: 'Transferencias', userName: 'Andrea Torres', overallScore: 91, timestamp: '2026-02-18T10:00:00Z' },
  { fileId: 'f5', fileName: 'Onboarding v3', pageName: 'Paso 2', userName: 'Diego Vargas', overallScore: 78, timestamp: '2026-02-20T16:45:00Z' },
  { fileId: 'f6', fileName: 'Dashboard BCP', pageName: 'Graficos', userName: 'Carlos Mendoza', overallScore: 55, timestamp: '2026-02-24T09:00:00Z' },
  { fileId: 'f7', fileName: 'App - Seguros', pageName: 'Cotizador', userName: 'Lucia Quispe', overallScore: 83, timestamp: '2026-02-27T13:20:00Z' },
  { fileId: 'f8', fileName: 'App - Pagos', pageName: 'Confirmacion', userName: 'Diego Vargas', overallScore: 70, timestamp: '2026-03-01T08:30:00Z' },
  { fileId: 'f9', fileName: 'Onboarding v3', pageName: 'Exito', userName: 'Andrea Torres', overallScore: 95, timestamp: '2026-03-03T11:00:00Z' },
  { fileId: 'f10', fileName: 'App - Seguros', pageName: 'Resumen', userName: 'Carlos Mendoza', overallScore: 68, timestamp: '2026-03-05T15:45:00Z' },
]

figma.showUI(__html__, { width: 380, height: 600, title: 'Handoff Analytics', themeColors: true })

figma.ui.postMessage({ type: 'ANALYTICS_LOADING' })

if (USE_MOCK) {
  setTimeout(() => {
    if (MOCK_DATA.length === 0) {
      figma.ui.postMessage({ type: 'ANALYTICS_RESULT', data: [] })
    } else {
      figma.ui.postMessage({ type: 'ANALYTICS_RESULT', data: MOCK_DATA })
    }
  }, 1000)
} else {
  fetchEvaluations(ANALYTICS_READ_URL)
}

async function fetchEvaluations(url: string): Promise<void> {
  try {
    if (!url) throw new Error('ANALYTICS_READ_URL no configurado')
    const res = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    const raw: unknown[] = Array.isArray(json) ? json : (json as { value?: unknown[] }).value ?? []
    const rows: EvaluationRow[] = (raw as Record<string, unknown>[]).map((r) => ({
      fileId: String(r['fileId'] ?? ''),
      fileName: String(r['fileName'] ?? ''),
      pageName: String(r['pageName'] ?? ''),
      userName: String(r['userName'] ?? 'Unknown'),
      overallScore: parseInt(String(r['overallScore']), 10) || 0,
      timestamp: String(r['timestamp'] ?? ''),
    }))
    figma.ui.postMessage(rows.length === 0
      ? { type: 'ANALYTICS_RESULT', data: [] }
      : { type: 'ANALYTICS_RESULT', data: rows }
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    figma.ui.postMessage({ type: 'ANALYTICS_ERROR', message: msg })
  }
}
