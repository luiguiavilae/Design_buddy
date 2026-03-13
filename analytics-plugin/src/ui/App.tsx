import { useState, useEffect, useMemo } from 'react'
import type { EvaluationRow, AnalyticsState, SandboxToUI } from '../types/analytics'

// --- Helpers ---

function scoreColor(score: number): { color: string; bg: string } {
  if (score < 60) return { color: '#ef4444', bg: '#fef2f2' }
  if (score <= 80) return { color: '#d97706', bg: '#fffbeb' }
  return { color: '#16a34a', bg: '#f0fdf4' }
}

type DatePreset = 'all' | 'week' | 'month'

function applyDateFilter(rows: EvaluationRow[], preset: DatePreset): EvaluationRow[] {
  if (preset === 'all') return rows
  const now = new Date()
  const cutoff = new Date(now)
  if (preset === 'week') cutoff.setDate(now.getDate() - 7)
  else cutoff.setMonth(now.getMonth() - 1)
  return rows.filter(r => new Date(r.timestamp) >= cutoff)
}

function formatDate(ts: string): string {
  try {
    return new Date(ts).toLocaleString('es-PE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false,
    })
  } catch {
    return ts
  }
}

// --- Sub-components ---

function LoadingView() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, gap: 12 }}>
      <div style={{ width: 32, height: 32, border: '3px solid #e0e0e0', borderTopColor: '#1a2d5a', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: '#6b7280', fontSize: 12 }}>Cargando evaluaciones...</p>
    </div>
  )
}

function ErrorView({ message }: { message: string }) {
  return (
    <div style={{ padding: 24, textAlign: 'center' }}>
      <p style={{ fontSize: 20, marginBottom: 8 }}>⚠️</p>
      <p style={{ fontWeight: 600, color: '#1a1a2e', marginBottom: 6 }}>No se pudo cargar los datos</p>
      <p style={{ color: '#6b7280', fontSize: 11, marginBottom: 16 }}>{message}</p>
      <p style={{ color: '#9ca3af', fontSize: 10, lineHeight: 1.5 }}>
        Verifica que <code>SUPABASE_URL</code> y <code>SUPABASE_ANON_KEY</code> estén configurados en <code>analytics-plugin/src/config/tracking.ts</code>.
      </p>
    </div>
  )
}

function EmptyView() {
  return (
    <div style={{ padding: 24, textAlign: 'center' }}>
      <p style={{ fontSize: 28, marginBottom: 8 }}>📭</p>
      <p style={{ fontWeight: 600, color: '#1a1a2e', marginBottom: 6 }}>Sin evaluaciones aún</p>
      <p style={{ color: '#6b7280', fontSize: 11, lineHeight: 1.5 }}>
        Cuando el equipo complete evaluaciones de handoff en Designer Buddy, aparecerán aquí automáticamente.
      </p>
    </div>
  )
}

function SummaryBar({ filtered, globalAvg }: { filtered: EvaluationRow[]; globalAvg: number }) {
  return (
    <div style={{ display: 'flex', gap: 8, padding: '10px 14px', background: '#fff', borderBottom: '1px solid #e8eaf0' }}>
      <div style={{ flex: 1, background: '#f4f5fb', borderRadius: 8, padding: '8px 12px' }}>
        <p style={{ fontSize: 9, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Evaluaciones</p>
        <p style={{ fontSize: 22, fontWeight: 700, color: '#1a2d5a' }}>{filtered.length}</p>
      </div>
      <div style={{ flex: 1, background: '#f4f5fb', borderRadius: 8, padding: '8px 12px' }}>
        <p style={{ fontSize: 9, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Score promedio</p>
        <p style={{ fontSize: 22, fontWeight: 700, color: scoreColor(globalAvg).color }}>{filtered.length > 0 ? globalAvg : '—'}</p>
      </div>
    </div>
  )
}

function FilterBar({
  designers,
  designerFilter,
  setDesignerFilter,
  datePreset,
  setDatePreset,
}: {
  designers: string[]
  designerFilter: string
  setDesignerFilter: (v: string) => void
  datePreset: DatePreset
  setDatePreset: (v: DatePreset) => void
}) {
  return (
    <div style={{ padding: '8px 14px', background: '#fff', borderBottom: '1px solid #e8eaf0', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <select
        value={designerFilter}
        onChange={e => setDesignerFilter(e.target.value)}
        style={{ width: '100%', padding: '5px 8px', fontSize: 11, border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', color: '#1a1a2e' }}
      >
        <option value="all">Todos los diseñadores</option>
        {designers.map(d => <option key={d} value={d}>{d}</option>)}
      </select>
      <div style={{ display: 'flex', gap: 4 }}>
        {(['all', 'week', 'month'] as DatePreset[]).map(preset => (
          <button
            key={preset}
            onClick={() => setDatePreset(preset)}
            style={{
              flex: 1, padding: '4px 0', fontSize: 10, border: '1px solid',
              borderColor: datePreset === preset ? '#1a2d5a' : '#d1d5db',
              borderRadius: 6,
              background: datePreset === preset ? '#1a2d5a' : '#fff',
              color: datePreset === preset ? '#fff' : '#6b7280',
              cursor: 'pointer',
            }}
          >
            {preset === 'all' ? 'Todo' : preset === 'week' ? 'Última semana' : 'Último mes'}
          </button>
        ))}
      </div>
    </div>
  )
}

function EvaluationTable({ rows }: { rows: EvaluationRow[] }) {
  return (
    <div style={{ overflowY: 'auto', maxHeight: 240, flex: 'none' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
        <thead>
          <tr style={{ background: '#e8eaf0', position: 'sticky', top: 0, zIndex: 1 }}>
            <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600, width: 110 }}>Archivo</th>
            <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600, width: 90 }}>Diseñador</th>
            <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600, width: 80 }}>Fecha</th>
            <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600, width: 50 }}>Score</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const { color, bg } = scoreColor(row.overallScore)
            return (
              <tr key={row.fileId + row.timestamp} style={{ background: i % 2 === 0 ? '#ffffff' : '#f4f5fb' }}>
                <td style={{ padding: '5px 8px', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.fileName}>{row.fileName}</td>
                <td style={{ padding: '5px 8px', maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.userName}>{row.userName}</td>
                <td style={{ padding: '5px 8px', color: '#6b7280', fontSize: 10 }}>{formatDate(row.timestamp)}</td>
                <td style={{ padding: '5px 8px', textAlign: 'right' }}>
                  <span style={{ background: bg, color, borderRadius: 4, padding: '2px 6px', fontWeight: 600 }}>{row.overallScore}</span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function DesignerSummary({ summary }: { summary: { name: string; avg: number; total: number }[] }) {
  return (
    <div style={{ padding: '10px 14px', borderTop: '1px solid #e8eaf0' }}>
      <p style={{ fontSize: 9, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Promedio por diseñador</p>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
        <thead>
          <tr style={{ color: '#6b7280' }}>
            <th style={{ textAlign: 'left', padding: '3px 0', fontWeight: 500 }}>Diseñador</th>
            <th style={{ textAlign: 'center', padding: '3px 0', fontWeight: 500 }}>Promedio</th>
            <th style={{ textAlign: 'right', padding: '3px 0', fontWeight: 500 }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {summary.map(d => {
            const { color } = scoreColor(d.avg)
            return (
              <tr key={d.name}>
                <td style={{ padding: '3px 0', color: '#1a1a2e' }}>{d.name}</td>
                <td style={{ padding: '3px 0', textAlign: 'center', fontWeight: 600, color }}>{d.avg}</td>
                <td style={{ padding: '3px 0', textAlign: 'right', color: '#6b7280' }}>{d.total}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function Footer() {
  return (
    <div style={{ padding: '6px 14px', textAlign: 'center', borderTop: '1px solid #f0f0f5' }}>
      <span style={{ fontSize: 9, color: '#c0c4d0' }}>v1.0 · Equipo Diseño BCP</span>
    </div>
  )
}

// --- Main App ---

export default function App() {
  const [analytics, setAnalytics] = useState<AnalyticsState>({ status: 'loading' })
  const [designerFilter, setDesignerFilter] = useState<string>('all')
  const [datePreset, setDatePreset] = useState<DatePreset>('all')

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data.pluginMessage as SandboxToUI
      if (!msg) return
      if (msg.type === 'ANALYTICS_LOADING') setAnalytics({ status: 'loading' })
      else if (msg.type === 'ANALYTICS_RESULT') {
        setAnalytics(msg.data.length === 0
          ? { status: 'empty' }
          : { status: 'data', rows: msg.data }
        )
      } else if (msg.type === 'ANALYTICS_ERROR') setAnalytics({ status: 'error', message: msg.message })
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  const filtered = useMemo(() => {
    if (analytics.status !== 'data') return []
    let rows = analytics.rows
    if (designerFilter !== 'all') rows = rows.filter(r => r.userName === designerFilter)
    rows = applyDateFilter(rows, datePreset)
    return rows
  }, [analytics, designerFilter, datePreset])

  const designers = useMemo(() => {
    if (analytics.status !== 'data') return []
    return Array.from(new Set(analytics.rows.map(r => r.userName))).sort()
  }, [analytics])

  const designerSummary = useMemo(() => {
    const groups: Record<string, number[]> = {}
    filtered.forEach(r => {
      if (!groups[r.userName]) groups[r.userName] = []
      groups[r.userName].push(r.overallScore)
    })
    return Object.entries(groups).map(([name, scores]) => ({
      name,
      avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      total: scores.length,
    })).sort((a, b) => b.avg - a.avg)
  }, [filtered])

  const globalAvg = useMemo(() => {
    if (filtered.length === 0) return 0
    return Math.round(filtered.reduce((a, r) => a + r.overallScore, 0) / filtered.length)
  }, [filtered])

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background: #f8f8fc; color: #1a1a2e; }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #0a1628 0%, #1a2d5a 100%)', padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 24, height: 24, background: 'linear-gradient(135deg, #0066cc, #00a3ff)', borderRadius: 6 }} />
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>Handoff Analytics</span>
          </div>
        </div>

        {/* Non-data states */}
        {analytics.status === 'loading' && <LoadingView />}
        {analytics.status === 'error' && <ErrorView message={analytics.message} />}
        {analytics.status === 'empty' && <EmptyView />}

        {/* Dashboard */}
        {analytics.status === 'data' && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <SummaryBar filtered={filtered} globalAvg={globalAvg} />
            <FilterBar
              designers={designers}
              designerFilter={designerFilter}
              setDesignerFilter={setDesignerFilter}
              datePreset={datePreset}
              setDatePreset={setDatePreset}
            />
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <EvaluationTable rows={filtered} />
              <DesignerSummary summary={designerSummary} />
              <Footer />
            </div>
          </div>
        )}
      </div>
    </>
  )
}
