import { useState, useEffect } from 'react'
import type { Page, Section } from '../../types/docs'
import type { PluginMessage } from '../../types/messages'
import { FRAMEWORK_DEFAULTS } from './docs/frameworkDefaults'
import { StepProjectInfo } from './docs/StepProjectInfo'
import { StepPageConfig } from './docs/StepPageConfig'
import { StepSectionConfig } from './docs/StepSectionConfig'
import { StepPreview } from './docs/StepPreview'

type DocsState = 'wizard' | 'building' | 'success' | 'error'
type WizardStep = 1 | 2 | 3 | 4

const uid = () => `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

export default function DocsTab() {
  const [state, setState] = useState<DocsState>('wizard')
  const [step, setStep] = useState<WizardStep>(1)
  const [errorMsg, setErrorMsg] = useState('')

  const [projectName, setProjectName] = useState('')
  const [projectType, setProjectType] = useState('Web App')
  const [pages, setPages] = useState<Page[]>(() => JSON.parse(JSON.stringify(FRAMEWORK_DEFAULTS)))

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data?.pluginMessage as PluginMessage
      if (!msg) return
      if (msg.type === 'DOCS_BUILD_SUCCESS') setState('success')
      if (msg.type === 'DOCS_BUILD_ERROR') { setState('error'); setErrorMsg(msg.payload.message) }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  // ── Navigation ──────────────────────────────────────────────────────────────
  const nextStep = () => setStep((s) => Math.min(s + 1, 4) as WizardStep)
  const prevStep = () => setStep((s) => Math.max(s - 1, 1) as WizardStep)

  // ── Page mutations ──────────────────────────────────────────────────────────
  const updatePageName = (pageId: string, name: string) =>
    setPages((ps) => ps.map((p) => p.id === pageId ? { ...p, name } : p))

  const togglePageEnabled = (pageId: string) =>
    setPages((ps) => ps.map((p) =>
      p.id === pageId && !p.isRequired ? { ...p, isEnabled: !p.isEnabled } : p
    ))

  const reorderPages = (from: number, to: number) =>
    setPages((ps) => {
      const arr = [...ps]
      const [moved] = arr.splice(from, 1)
      arr.splice(to, 0, moved)
      return arr.map((p, i) => ({ ...p, order: i }))
    })

  const addCustomPage = () =>
    setPages((ps) => {
      const newPage: Page = {
        id: uid(),
        name: '📱 {projectName} - Dispositivo',
        isRequired: false,
        isEnabled: true,
        isDevicePage: true,
        order: ps.length,
        sections: [],
      }
      return [...ps, newPage]
    })

  const removePage = (pageId: string) =>
    setPages((ps) =>
      ps.filter((p) => p.id !== pageId || p.isRequired).map((p, i) => ({ ...p, order: i }))
    )

  // ── Section mutations ───────────────────────────────────────────────────────
  const updateSectionName = (pageId: string, sectionId: string, name: string) =>
    setPages((ps) => ps.map((p) =>
      p.id !== pageId ? p : {
        ...p,
        sections: p.sections.map((sec) => sec.id === sectionId ? { ...sec, name } : sec),
      }
    ))

  const reorderSections = (pageId: string, from: number, to: number) =>
    setPages((ps) => ps.map((p) => {
      if (p.id !== pageId) return p
      const sections = [...p.sections]
      const [moved] = sections.splice(from, 1)
      sections.splice(to, 0, moved)
      return { ...p, sections: sections.map((sec, i) => ({ ...sec, order: i })) }
    }))

  const addCustomSection = (pageId: string) =>
    setPages((ps) => ps.map((p) => {
      if (p.id !== pageId) return p
      const newSection: Section = {
        id: uid(), name: 'Nueva section', isRequired: false, order: p.sections.length,
      }
      return { ...p, sections: [...p.sections, newSection] }
    }))

  const removeSection = (pageId: string, sectionId: string) =>
    setPages((ps) => ps.map((p) => {
      if (p.id !== pageId) return p
      return {
        ...p,
        sections: p.sections
          .filter((sec) => sec.id !== sectionId || sec.isRequired)
          .map((sec, i) => ({ ...sec, order: i })),
      }
    }))

  // ── Build ───────────────────────────────────────────────────────────────────
  const handleBuild = () => {
    setState('building')
    parent.postMessage({
      pluginMessage: {
        type: 'DOCS_BUILD_PROJECT',
        payload: { projectName, projectType, pages, createdAt: new Date().toISOString() },
      },
    }, '*')
  }

  const handleReset = () => {
    setState('wizard')
    setStep(1)
    setProjectName('')
    setProjectType('Web App')
    setPages(JSON.parse(JSON.stringify(FRAMEWORK_DEFAULTS)))
  }

  // ── Non-wizard states ───────────────────────────────────────────────────────
  if (state === 'building') {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px 14px' }}>
        <div className="spinner" style={{ margin: '0 auto 12px' }} />
        <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a2e', marginBottom: 4 }}>
          Generando estructura…
        </div>
        <div style={{ fontSize: 11, color: '#6b7280' }}>Creando páginas y secciones en Figma</div>
      </div>
    )
  }

  if (state === 'success') {
    return (
      <div>
        <div className="empty" style={{ paddingTop: 40 }}>
          <div className="empty-icon">✅</div>
          <div className="empty-title">¡Estructura creada!</div>
          <div className="empty-desc" style={{ marginBottom: 20 }}>
            Las páginas y secciones base fueron creadas correctamente en tu archivo de Figma.
          </div>
        </div>
        <button className="btn-secondary" onClick={handleReset}>Crear otra estructura</button>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div>
        <div className="empty" style={{ paddingTop: 40 }}>
          <div className="empty-icon">❌</div>
          <div className="empty-title">Error al crear la estructura</div>
          <div className="empty-desc" style={{ marginBottom: 12 }}>{errorMsg}</div>
        </div>
        <button className="btn-secondary" onClick={() => setState('wizard')}>Intentar de nuevo</button>
      </div>
    )
  }

  // ── Wizard ──────────────────────────────────────────────────────────────────
  const STEP_LABELS = ['Proyecto', 'Páginas', 'Pantallas', 'Resumen']

  return (
    <div>
      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 16 }}>
        {STEP_LABELS.map((label, i) => {
          const n = (i + 1) as WizardStep
          const isActive = n === step
          const isDone = n < step
          return (
            <div key={n} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: 3 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 10, fontWeight: 700,
                  background: isDone || isActive ? '#0066cc' : '#e5e7eb',
                  color: isDone || isActive ? '#fff' : '#9ca3af',
                }}>
                  {isDone ? '✓' : n}
                </div>
                <span style={{
                  fontSize: 9, whiteSpace: 'nowrap',
                  color: isActive ? '#0066cc' : '#9ca3af',
                  fontWeight: isActive ? 600 : 400,
                }}>
                  {label}
                </span>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div style={{
                  height: 1, flex: 0.6,
                  background: n < step ? '#0066cc' : '#e5e7eb',
                  marginBottom: 14,
                }} />
              )}
            </div>
          )
        })}
      </div>

      {step === 1 && (
        <StepProjectInfo
          projectName={projectName}
          projectType={projectType}
          setProjectName={setProjectName}
          setProjectType={setProjectType}
          nextStep={nextStep}
        />
      )}
      {step === 2 && (
        <StepPageConfig
          pages={pages}
          updatePageName={updatePageName}
          togglePageEnabled={togglePageEnabled}
          reorderPages={reorderPages}
          addCustomPage={addCustomPage}
          removePage={removePage}
          nextStep={nextStep}
          prevStep={prevStep}
        />
      )}
      {step === 3 && (
        <StepSectionConfig
          projectName={projectName}
          pages={pages}
          updateSectionName={updateSectionName}
          reorderSections={reorderSections}
          addCustomSection={addCustomSection}
          removeSection={removeSection}
          nextStep={nextStep}
          prevStep={prevStep}
        />
      )}
      {step === 4 && (
        <StepPreview
          projectName={projectName}
          projectType={projectType}
          pages={pages}
          prevStep={prevStep}
          onBuild={handleBuild}
        />
      )}
    </div>
  )
}
