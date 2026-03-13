import { useState, useEffect } from 'react'
import type { PluginMessage } from '../../types/messages'
import type { DSReport, DSIssueType } from '../../types/ds'

type State = 'idle' | 'evaluating' | 'done' | 'error'

const ISSUE_LABELS: Record<DSIssueType, string> = {
  broken_component:   'Comp. roto',
  local_component:    'Librería local',
  detached_component: 'Desvinculado',
  hardcoded_fill:     'Color hardcodeado',
  hardcoded_text:     'Texto hardcodeado',
  visual_override:    'Override visual',
}

const ISSUE_SEVERITY: Record<DSIssueType, 'fail' | 'warn' | 'info'> = {
  broken_component:   'fail',
  local_component:    'warn',
  detached_component: 'warn',
  hardcoded_fill:     'warn',
  hardcoded_text:     'warn',
  visual_override:    'info',
}

export default function DSTab() {
  const [state, setState] = useState<State>('idle')
  const [progress, setProgress] = useState({ step: '', percent: 0 })
  const [report, setReport] = useState<DSReport | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data?.pluginMessage as PluginMessage
      if (!msg) return
      if (msg.type === 'DS_PROGRESS') setProgress({ step: msg.step, percent: msg.percent })
      if (msg.type === 'DS_RESULT') { setReport(msg.report); setState('done') }
      if (msg.type === 'DS_ERROR') { setErrorMsg(msg.error); setState('error') }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  function handleEvaluate() {
    setState('evaluating')
    setProgress({ step: 'Iniciando análisis…', percent: 0 })
    parent.postMessage({ pluginMessage: { type: 'DS_START_EVALUATION' } }, '*')
  }

  function handleReset() {
    setState('idle')
    setReport(null)
    setErrorMsg('')
  }

  // ── Idle ────────────────────────────────────────────────────────────────────
  if (state === 'idle') {
    return (
      <div>
        <p className="section-title">Auditoría del sistema de diseño</p>

        <div className="card">
          <div className="card-title">Cómo usar DS</div>
          <div className="card-desc" style={{ lineHeight: 1.7 }}>
            1. Navega a la página que quieres auditar<br />
            2. Presiona evaluar<br />
            3. Revisa los hallazgos por tipo de problema
          </div>
        </div>

        <div className="card" style={{ borderColor: '#e8e8f0' }}>
          <div className="card-title" style={{ marginBottom: 8 }}>Criterios evaluados</div>
          {[
            ['🔴', 'Componentes rotos', 'El componente maestro ya no existe'],
            ['🟠', 'Librería local', 'Instancias del archivo actual, no de la librería'],
            ['🟡', 'Desvinculados', 'Frames con nombre de componente Familia/Variante'],
            ['🟡', 'Colores hardcodeados', 'Fills sin color style ni variable vinculada'],
            ['🟡', 'Tipografías hardcodeadas', 'Textos sin text style vinculado'],
            ['🔵', 'Overrides visuales', 'Instancias con fills o efectos sobreescritos'],
          ].map(([icon, title, desc]) => (
            <div key={title} style={{ display: 'flex', gap: 8, marginBottom: 7, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 12 }}>{icon}</span>
              <div>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#1a1a2e' }}>{title}</span>
                <span style={{ fontSize: 10, color: '#6b7280', marginLeft: 4 }}>{desc}</span>
              </div>
            </div>
          ))}
        </div>

        <button className="btn-primary" onClick={handleEvaluate}>
          ✦ Auditar página actual
        </button>
      </div>
    )
  }

  // ── Evaluating ──────────────────────────────────────────────────────────────
  if (state === 'evaluating') {
    return (
      <div>
        <div className="card" style={{ textAlign: 'center', padding: '32px 14px' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a2e', marginBottom: 4 }}>
            Analizando componentes
          </div>
          <div className="progress-wrap">
            <div className="progress-bar" style={{ width: `${progress.percent}%` }} />
          </div>
          <div className="progress-label">{progress.step}</div>
        </div>
      </div>
    )
  }

  // ── Error ───────────────────────────────────────────────────────────────────
  if (state === 'error') {
    return (
      <div>
        <div className="empty" style={{ paddingTop: 40 }}>
          <div className="empty-icon">⚠️</div>
          <div className="empty-title">No se pudo evaluar</div>
          <div className="empty-desc" style={{ marginBottom: 16 }}>{errorMsg}</div>
        </div>
        <button className="btn-secondary" onClick={handleReset}>Intentar de nuevo</button>
      </div>
    )
  }

  // ── Done ────────────────────────────────────────────────────────────────────
  if (!report) return null

  const hasIssues = report.totalIssues > 0

  return (
    <div>
      {/* Summary */}
      <div className="score-ring">
        <div className={`score-circle ${hasIssues ? (report.totalIssues > 5 ? 'score-fail' : 'score-warn') : 'score-pass'}`}>
          {hasIssues ? report.totalIssues : '✓'}
        </div>
        <div className="score-info">
          <h3>{hasIssues ? `${report.totalIssues} hallazgo${report.totalIssues > 1 ? 's' : ''}` : '¡Sin hallazgos!'}</h3>
          <p>
            {report.frameCount} frame{report.frameCount > 1 ? 's' : ''} ·{' '}
            {report.totalScanned} nodo{report.totalScanned > 1 ? 's' : ''} escaneados
          </p>
        </div>
      </div>

      {!hasIssues && (
        <div className="card" style={{ background: '#f0fdf4', borderColor: '#bbf7d0', textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#166534', marginBottom: 4 }}>
            ✅ Diseño alineado al sistema
          </div>
          <div className="card-desc" style={{ color: '#15803d' }}>
            No se encontraron componentes rotos, desvinculados ni estilos hardcodeados.
          </div>
        </div>
      )}

      {hasIssues && (
        <div className="results-scroll">
          {report.frames.map((frame) =>
            frame.issues.length > 0 ? (
              <div key={frame.frameId}>
                <div className="frame-result-header">
                  <span style={{ fontSize: 11, fontWeight: 600 }}>📱 {frame.frameName}</span>
                  <span className={`badge ${frame.issues.length > 3 ? 'badge-fail' : 'badge-warn'}`}>
                    {frame.issues.length} hallazgo{frame.issues.length > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="frame-result-body">
                  {frame.issues.map((issue, idx) => {
                    const severity = ISSUE_SEVERITY[issue.issueType]
                    return (
                      <div
                        key={idx}
                        className={`finding finding-${severity === 'fail' ? 'fail' : severity === 'info' ? 'pass' : 'warn'}`}
                        style={{ marginBottom: 8 }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <div className={`issue-type-badge issue-ds-${issue.issueType}`}>
                            {ISSUE_LABELS[issue.issueType]}
                          </div>
                          <button
                            onClick={() => parent.postMessage({ pluginMessage: { type: 'HANDOFF_NAVIGATE_TO_NODE', nodeId: issue.nodeId } }, '*')}
                            style={{ fontSize: 10, padding: '2px 7px', background: '#f0f0f8', border: '1px solid #d0d0e8', borderRadius: 4, cursor: 'pointer', color: '#4a4a8a', whiteSpace: 'nowrap' }}
                          >
                            Ir al nodo →
                          </button>
                        </div>
                        <div className="finding-name">{issue.nodeName}</div>
                        <div className="finding-text" style={{ marginBottom: 4 }}>{issue.description}</div>
                        <div className="finding-action">💡 {issue.suggestion}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null
          )}
        </div>
      )}

      <div className="divider" />
      <button className="btn-secondary" onClick={handleReset}>Nueva auditoría</button>
    </div>
  )
}
