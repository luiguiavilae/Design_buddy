import { useState, useEffect } from 'react'
import type { PluginMessage } from '../../types/messages'
import type { EvaluationReport, CriterionResult } from '../../types/handoff'

type State = 'idle' | 'evaluating' | 'done' | 'error'

function ScoreColor(score: number): string {
  if (score >= 80) return 'score-green'
  if (score >= 50) return 'score-yellow'
  return 'score-red'
}

function CriterionCard({ criterion, onNavigate }: {
  criterion: CriterionResult
  onNavigate: (nodeId: string) => void
}) {
  const [open, setOpen] = useState(criterion.status !== 'pass')

  return (
    <div>
      <div
        className={`criterion-header ${open ? 'open' : ''}`}
        onClick={() => setOpen(!open)}
      >
        <div className="criterion-left">
          <span className={`badge badge-${criterion.status}`}>
            {criterion.status === 'pass' ? '✓' : criterion.status === 'warn' ? '⚠' : '✕'}
          </span>
          <span className="criterion-name">{criterion.title}</span>
          <span style={{ fontSize: 9, color: '#9ca3af', background: '#f3f4f6', padding: '1px 5px', borderRadius: 8 }}>
            {criterion.weight}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className={`criterion-score ${ScoreColor(criterion.score)}`}>
            {criterion.score}%
          </span>
          <span className={`chevron ${open ? 'open' : ''}`}>▼</span>
        </div>
      </div>

      {open && (
        <div className="criterion-body">
          <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 8 }}>
            {criterion.summary}
          </div>

          {criterion.findings.length === 0 ? (
            <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 500 }}>
              ✅ Sin hallazgos — criterio cumplido
            </div>
          ) : (
            criterion.findings.map((finding, idx) => (
              <div key={idx} className={`finding finding-${finding.status}`}>
                <div className="finding-name">{finding.nodeName}</div>
                <div className="finding-text">{finding.message}</div>
                <div className="finding-action">→ {finding.action}</div>
                {finding.nodeId && (
                  <button
                    className="navigate-btn"
                    onClick={() => onNavigate(finding.nodeId)}
                  >
                    Ir al elemento →
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default function HandoffTab() {
  const [state, setState] = useState<State>('idle')
  const [progress, setProgress] = useState({ step: '', percent: 0 })
  const [report, setReport] = useState<EvaluationReport | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data?.pluginMessage as PluginMessage
      if (!msg) return

      if (msg.type === 'HANDOFF_PROGRESS') {
        setProgress({ step: msg.step, percent: msg.percent })
      }
      if (msg.type === 'HANDOFF_RESULT') {
        setReport(msg.report)
        setState('done')
      }
      if (msg.type === 'HANDOFF_ERROR') {
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
    parent.postMessage({ pluginMessage: { type: 'HANDOFF_START_EVALUATION' } }, '*')
  }

  function handleNavigate(nodeId: string) {
    parent.postMessage({
      pluginMessage: { type: 'HANDOFF_NAVIGATE_TO_NODE', nodeId },
    }, '*')
  }

  function handleReset() {
    setState('idle')
    setReport(null)
    setErrorMsg('')
  }

  const getScoreStatus = (score: number) => {
    if (score >= 80) return 'pass'
    if (score >= 50) return 'warn'
    return 'fail'
  }

  // ── Idle ───────────────────────────────────────────────────────────────────
  if (state === 'idle') {
    return (
      <div>
        <p className="section-title">Validación de lineamientos</p>

        <div className="card">
          <div className="card-title">Framework Handoff BCP v1.1</div>
          <div className="card-desc" style={{ lineHeight: 1.7 }}>
            Evalúa la página actual contra los 5 criterios del framework de handoff del COE Diseño Estratégico.
          </div>
        </div>

        <div className="card">
          <div className="card-title" style={{ marginBottom: 8 }}>Criterios evaluados</div>
          {[
            ['Alto', '1. Nomenclatura de pantallas'],
            ['Alto', '2. Lineamientos de implementación'],
            ['Medio', '3. Estructura de archivos'],
            ['Alto', '4. Organización del Screenflow'],
            ['Medio', '5. Estructura interna del archivo'],
          ].map(([weight, name]) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span className={`badge ${weight === 'Alto' ? 'badge-fail' : 'badge-info'}`}>
                {weight}
              </span>
              <span style={{ fontSize: 11, color: '#374151' }}>{name}</span>
            </div>
          ))}
        </div>

        <button className="btn-primary" onClick={handleEvaluate}>
          ✦ Evaluar página actual
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
            Evaluando lineamientos de handoff
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
          <div className="empty-title">Error en la evaluación</div>
          <div className="empty-desc" style={{ marginBottom: 16 }}>{errorMsg}</div>
        </div>
        <button className="btn-secondary" onClick={handleReset}>Intentar de nuevo</button>
      </div>
    )
  }

  // ── Done ───────────────────────────────────────────────────────────────────
  if (!report) return null

  const scoreStatus = getScoreStatus(report.overallScore)

  return (
    <div>
      {/* Overall score */}
      <div className="score-ring">
        <div className={`score-circle score-${scoreStatus}`}>
          {report.overallScore}
        </div>
        <div className="score-info">
          <h3>
            {scoreStatus === 'pass' ? 'Listo para handoff' :
             scoreStatus === 'warn' ? 'Requiere ajustes' : 'No está listo'}
          </h3>
          <p>{report.pageName} · {report.totalFrames} frame{report.totalFrames !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Criteria */}
      <div className="results-scroll">
        {report.criteria.map((criterion) => (
          <CriterionCard
            key={criterion.id}
            criterion={criterion}
            onNavigate={handleNavigate}
          />
        ))}
      </div>

      <div className="divider" />

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn-secondary" onClick={handleReset} style={{ flex: 1 }}>
          Nueva evaluación
        </button>
        <button className="btn-primary" onClick={handleEvaluate} style={{ flex: 1 }}>
          Re-evaluar
        </button>
      </div>
    </div>
  )
}
