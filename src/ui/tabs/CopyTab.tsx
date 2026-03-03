import { useState, useEffect } from 'react'
import type { PluginMessage } from '../../types/messages'
import type { CopyReport, CopyIssueType } from '../../types/copy'

type State = 'idle' | 'evaluating' | 'done' | 'error'

const ISSUE_LABELS: Record<CopyIssueType, string> = {
  ortografia:   'Ortografía',
  semantica:    'Semántica',
  tono:         'Tono',
  optimizacion: 'Optimización',
  redundancia:  'Redundancia',
  tecnicismo:   'Tecnicismo',
  consistencia: 'Consistencia',
  voz_marca:    'Voz de marca',
}

export default function CopyTab() {
  const [state, setState] = useState<State>('idle')
  const [progress, setProgress] = useState({ step: '', percent: 0 })
  const [report, setReport] = useState<CopyReport | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data?.pluginMessage as PluginMessage
      if (!msg) return

      if (msg.type === 'COPY_PROGRESS') {
        setProgress({ step: msg.step, percent: msg.percent })
      }
      if (msg.type === 'COPY_RESULT') {
        setReport(msg.report)
        setState('done')
      }
      if (msg.type === 'COPY_ERROR') {
        setErrorMsg(msg.error)
        setState('error')
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  function handleEvaluate() {
    setState('evaluating')
    setProgress({ step: 'Iniciando evaluación…', percent: 0 })
    parent.postMessage({ pluginMessage: { type: 'COPY_START_EVALUATION' } }, '*')
  }

  function handleReset() {
    setState('idle')
    setReport(null)
    setErrorMsg('')
  }

  // ── Idle ───────────────────────────────────────────────────────────────────
  if (state === 'idle') {
    return (
      <div>
        <p className="section-title">Evaluación de textos</p>

        <div className="card">
          <div className="card-title">Cómo usar Copy</div>
          <div className="card-desc" style={{ lineHeight: 1.7 }}>
            1. Selecciona uno o más frames en el canvas<br />
            2. Presiona evaluar<br />
            3. Revisa los hallazgos frame por frame
          </div>
        </div>

        <div className="card" style={{ borderColor: '#e8e8f0' }}>
          <div className="card-title" style={{ marginBottom: 8 }}>Criterios evaluados</div>
          {[
            ['🔤', 'Ortografía', 'Tildes, puntuación, errores tipográficos'],
            ['💬', 'Semántica', 'Coherencia y claridad del mensaje'],
            ['🎯', 'Tono', 'Lenguaje empático, no coercitivo'],
            ['📏', 'Optimización', 'Textos innecesariamente largos'],
            ['🔁', 'Redundancia', 'Palabras o frases repetidas'],
            ['⚙️', 'Tecnicismo', 'Jerga técnica no apta para usuarios'],
            ['🏦', 'Voz de marca', 'Tono BCP: aliado, claro, confiable, peruano'],
          ].map(([icon, title, desc]) => (
            <div key={title as string} style={{ display: 'flex', gap: 8, marginBottom: 7, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 13 }}>{icon}</span>
              <div>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#1a1a2e' }}>{title}</span>
                <span style={{ fontSize: 10, color: '#6b7280', marginLeft: 4 }}>{desc}</span>
              </div>
            </div>
          ))}
        </div>

        <button className="btn-primary" onClick={handleEvaluate}>
          ✦ Evaluar textos de los frames seleccionados
        </button>
      </div>
    )
  }

  // ── Evaluating ─────────────────────────────────────────────────────────────
  if (state === 'evaluating') {
    return (
      <div>
        <div className="card" style={{ textAlign: 'center', padding: '32px 14px' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a2e', marginBottom: 4 }}>
            Evaluando textos
          </div>
          <div className="progress-wrap">
            <div className="progress-bar" style={{ width: `${progress.percent}%` }} />
          </div>
          <div className="progress-label">{progress.step}</div>
        </div>
      </div>
    )
  }

  // ── Error ──────────────────────────────────────────────────────────────────
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

  // ── Done ───────────────────────────────────────────────────────────────────
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
          <p>{report.frameCount} frame{report.frameCount > 1 ? 's' : ''} · {report.totalTexts} texto{report.totalTexts > 1 ? 's' : ''} evaluados</p>
        </div>
      </div>

      {!hasIssues && (
        <div className="card" style={{ background: '#f0fdf4', borderColor: '#bbf7d0', textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#166534', marginBottom: 4 }}>
            ✅ Todos los textos están bien
          </div>
          <div className="card-desc" style={{ color: '#15803d' }}>
            No se encontraron problemas de ortografía, tono, tecnicismos ni redundancias.
          </div>
        </div>
      )}

      {hasIssues && (
        <div className="results-scroll">
          {report.frames.map((frame) => (
            frame.issues.length > 0 && (
              <div key={frame.frameId}>
                <div className="frame-result-header">
                  <span style={{ fontSize: 11, fontWeight: 600 }}>📱 {frame.frameName}</span>
                  <span className={`badge ${frame.issues.length > 3 ? 'badge-fail' : 'badge-warn'}`}>
                    {frame.issues.length} hallazgo{frame.issues.length > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="frame-result-body">
                  {frame.issues.map((issue, idx) => (
                    <div key={idx} className={`finding finding-${issue.issueType === 'ortografia' ? 'fail' : 'warn'}`} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <div className={`issue-type-badge issue-${issue.issueType}`}>
                          {ISSUE_LABELS[issue.issueType]}
                        </div>
                        <button
                          onClick={() => parent.postMessage({ pluginMessage: { type: 'HANDOFF_NAVIGATE_TO_NODE', nodeId: issue.nodeId } }, '*')}
                          style={{ fontSize: 10, padding: '2px 7px', background: '#f0f0f8', border: '1px solid #d0d0e8', borderRadius: 4, cursor: 'pointer', color: '#4a4a8a', whiteSpace: 'nowrap' }}
                        >
                          Ir al texto →
                        </button>
                      </div>
                      <div className="finding-text" style={{ fontStyle: 'italic', color: '#6b7280', marginBottom: 4 }}>
                        "{issue.originalText.length > 80 ? issue.originalText.slice(0, 80) + '…' : issue.originalText}"
                      </div>
                      <div className="finding-text">{issue.description}</div>
                      <div className="finding-action">💡 {issue.suggestion}</div>
                    </div>
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
      )}

      <div className="divider" />
      <button className="btn-secondary" onClick={handleReset}>Nueva evaluación</button>
    </div>
  )
}
