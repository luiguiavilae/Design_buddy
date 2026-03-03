import { useState, useEffect } from 'react'
import type { PluginMessage } from '../../types/messages'
import type { UsersReport } from '../../types/users'
import { EXTERNAL_SEGMENTS, INTERNAL_ROLES } from '../../types/users'

type State = 'idle' | 'loading' | 'done' | 'error'

export default function UsersTab() {
  const [state, setState] = useState<State>('idle')
  const [progress, setProgress] = useState({ step: '', percent: 0 })
  const [report, setReport] = useState<UsersReport | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  // Form state
  const [userType, setUserType] = useState<'externo' | 'interno'>('externo')
  const [segment, setSegment] = useState<string>(EXTERNAL_SEGMENTS[0])
  const [prompt, setPrompt] = useState('')
  const [userCount, setUserCount] = useState(3)
  const [hasSelection, setHasSelection] = useState(false)
  const [frameContext, setFrameContext] = useState('')

  // Get canvas context on mount
  useEffect(() => {
    parent.postMessage({ pluginMessage: { type: 'USERS_GET_CONTEXT' } }, '*')

    const handler = (event: MessageEvent) => {
      const msg = event.data?.pluginMessage as PluginMessage
      if (!msg) return

      if (msg.type === 'USERS_CONTEXT') {
        setHasSelection(msg.payload.hasSelection)
        setFrameContext(msg.payload.frameDescription)
      }
      if (msg.type === 'USERS_PROGRESS') {
        setProgress({ step: msg.step, percent: msg.percent })
      }
      if (msg.type === 'USERS_RESULT') {
        setReport(msg.report)
        setState('done')
      }
      if (msg.type === 'USERS_ERROR') {
        setErrorMsg(msg.error)
        setState('error')
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  // Reset segment when user type changes
  function handleUserTypeChange(type: 'externo' | 'interno') {
    setUserType(type)
    setSegment(type === 'externo' ? EXTERNAL_SEGMENTS[0] : INTERNAL_ROLES[0])
  }

  function handleSubmit() {
    if (!prompt.trim()) return
    setState('loading')
    setProgress({ step: 'Preparando solicitud…', percent: 0 })

    parent.postMessage({
      pluginMessage: {
        type: 'USERS_REQUEST_FEEDBACK',
        payload: {
          userType,
          segment,
          prompt: prompt.trim(),
          userCount,
          figmaContext: frameContext || 'No hay frame seleccionado en el canvas',
        },
      },
    }, '*')
  }

  function handleReset() {
    setState('idle')
    setReport(null)
    setErrorMsg('')
    parent.postMessage({ pluginMessage: { type: 'USERS_GET_CONTEXT' } }, '*')
  }

  const segmentOptions = userType === 'externo' ? EXTERNAL_SEGMENTS : INTERNAL_ROLES

  // ── Loading ────────────────────────────────────────────────────────────────
  if (state === 'loading') {
    return (
      <div>
        <div className="card" style={{ textAlign: 'center', padding: '32px 14px' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a2e', marginBottom: 4 }}>
            Generando usuarios sintéticos
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
          <div className="empty-title">No se pudo generar el feedback</div>
          <div className="empty-desc" style={{ marginBottom: 16 }}>{errorMsg}</div>
        </div>
        <button className="btn-secondary" onClick={handleReset}>Intentar de nuevo</button>
      </div>
    )
  }

  // ── Done ───────────────────────────────────────────────────────────────────
  if (state === 'done' && report) {
    return (
      <div>
        <div className="score-ring">
          <div className="score-circle score-pass" style={{ fontSize: 13 }}>
            {report.userCount}
          </div>
          <div className="score-info">
            <h3>{report.userCount} usuarios sintéticos</h3>
            <p>
              {report.userType === 'externo' ? 'Externo' : 'Interno'} · {report.segment}
            </p>
          </div>
        </div>

        <div className="results-scroll">
          {report.users.map((user) => (
            <div key={user.userNumber} className="user-card">
              <div className="user-card-header">
                <div className="user-avatar">U{user.userNumber}</div>
                <div>
                  <div className="user-name">Usuario {user.userNumber}</div>
                  <div className="user-profile">{user.profile}</div>
                </div>
              </div>

              <div className="user-feedback">"{user.feedback}"</div>

              {user.painPoints.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>
                    PAIN POINTS
                  </div>
                  <div className="tag-list">
                    {user.painPoints.map((p, i) => (
                      <span key={i} className="tag tag-pain">⚡ {p}</span>
                    ))}
                  </div>
                </div>
              )}

              {user.suggestions.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>
                    SUGERENCIAS
                  </div>
                  <div className="tag-list">
                    {user.suggestions.map((s, i) => (
                      <span key={i} className="tag tag-suggest">💡 {s}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="divider" />
        <button className="btn-secondary" onClick={handleReset}>Nueva consulta</button>
      </div>
    )
  }

  // ── Idle / Form ────────────────────────────────────────────────────────────
  return (
    <div>
      <p className="section-title">Feedback sintético</p>

      {/* Context indicator */}
      <div className="card" style={{
        background: hasSelection ? '#f0fdf4' : '#fffbeb',
        borderColor: hasSelection ? '#bbf7d0' : '#fde68a',
        marginBottom: 14,
      }}>
        <div className="card-desc" style={{ color: hasSelection ? '#15803d' : '#92400e' }}>
          {hasSelection
            ? `✅ Frame detectado: ${frameContext.split('\n')[0]?.replace('Pantalla: ', '')}`
            : '⚠️ Selecciona un frame en el canvas para dar contexto al análisis'}
        </div>
      </div>

      {/* User type */}
      <div className="form-group">
        <label className="label">Tipo de usuario</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['externo', 'interno'] as const).map((type) => (
            <button
              key={type}
              onClick={() => handleUserTypeChange(type)}
              style={{
                flex: 1,
                padding: '8px',
                border: `1.5px solid ${userType === type ? '#0066cc' : '#e5e7eb'}`,
                borderRadius: 7,
                background: userType === type ? '#eff6ff' : 'white',
                color: userType === type ? '#0066cc' : '#6b7280',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {type === 'externo' ? '🌐 Usuario externo' : '🏢 Usuario interno'}
            </button>
          ))}
        </div>
      </div>

      {/* Segment / Role */}
      <div className="form-group">
        <label className="label">
          {userType === 'externo' ? 'Segmento' : 'Rol'}
        </label>
        <select
          className="select"
          value={segment}
          onChange={(e) => setSegment(e.target.value)}
        >
          {segmentOptions.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      {/* Prompt */}
      <div className="form-group">
        <label className="label">¿Qué feedback quieres obtener?</label>
        <textarea
          className="textarea"
          placeholder="Ej: ¿Qué opina este usuario sobre la claridad del flujo de transferencias? ¿Le resulta intuitivo el diseño?"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
      </div>

      {/* User count */}
      <div className="form-group">
        <label className="label">Número de usuarios sintéticos (máx. 10)</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            type="range"
            min={1}
            max={10}
            value={userCount}
            onChange={(e) => setUserCount(Number(e.target.value))}
            style={{ flex: 1 }}
          />
          <span style={{
            minWidth: 28,
            height: 28,
            background: '#0066cc',
            color: 'white',
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 700,
          }}>
            {userCount}
          </span>
        </div>
      </div>

      <button
        className="btn-primary"
        onClick={handleSubmit}
        disabled={!prompt.trim()}
      >
        ✦ Generar feedback de {userCount} usuario{userCount > 1 ? 's' : ''}
      </button>
    </div>
  )
}
