import { useState } from 'react'
import type { Page } from '../../../types/docs'

interface Props {
  projectName: string
  projectType: string
  pages: Page[]
  prevStep: () => void
  onBuild: () => void
}

function resolve(text: string, projectName: string) {
  return text.replace(/\{projectName\}/g, projectName)
}

export function StepPreview({ projectName, projectType, pages, prevStep, onBuild }: Props) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const enabledPages = pages.filter((p) => p.isEnabled)
  const totalSections = enabledPages.reduce((acc, p) => acc + p.sections.length, 0)

  const toggleCollapse = (pageId: string) =>
    setCollapsed((prev) => ({ ...prev, [pageId]: !prev[pageId] }))

  return (
    <div>
      <p className="section-title">Resumen del proyecto</p>

      {/* Summary card */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 10 }}>
        {[
          ['Proyecto', projectName],
          projectType ? ['Tipo', projectType] : null,
          ['Páginas', String(enabledPages.length)],
          ['Sections totales', String(totalSections)],
        ].filter(Boolean).map((row, i, arr) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', padding: '9px 14px',
            borderBottom: i < arr.length - 1 ? '1px solid #f0f0f0' : 'none',
          }}>
            <span style={{ fontSize: 11, color: '#6b7280' }}>{row![0]}</span>
            <span style={{ fontSize: 11, color: '#1a1a2e', fontWeight: 600 }}>{row![1]}</span>
          </div>
        ))}
      </div>

      {/* Pages collapsible list */}
      <div style={{ maxHeight: 260, overflowY: 'auto', marginBottom: 12, paddingRight: 2 }}>
        {enabledPages.map((page) => {
          const isCollapsed = collapsed[page.id]
          return (
            <div key={page.id} style={{ border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 5, overflow: 'hidden' }}>
              <button
                onClick={() => toggleCollapse(page.id)}
                style={{
                  display: 'flex', alignItems: 'center', width: '100%', padding: '7px 12px',
                  background: '#f9fafb', border: 'none', cursor: 'pointer', boxSizing: 'border-box',
                }}
              >
                <span style={{ flex: 1, textAlign: 'left', fontSize: 12, fontWeight: 500, color: '#1a1a2e' }}>
                  {resolve(page.name, projectName)}
                </span>
                <span style={{ fontSize: 10, color: '#9ca3af', marginRight: 6 }}>
                  {page.sections.length} section{page.sections.length !== 1 ? 's' : ''}
                </span>
                <span style={{ color: '#9ca3af', fontSize: 10 }}>{isCollapsed ? '▸' : '▾'}</span>
              </button>

              {!isCollapsed && (
                <ul style={{ margin: 0, padding: '5px 12px 8px 24px', listStyle: 'none' }}>
                  {page.subPages && page.subPages.map((sp) => (
                    <li key={sp} style={{ fontSize: 11, color: '#6b7280', padding: '2px 0', display: 'flex', alignItems: 'center' }}>
                      <span style={{ color: '#d1d5db', marginRight: 6 }}>↪</span>
                      {resolve(sp, projectName)}
                    </li>
                  ))}
                  {page.sections.map((sec) => (
                    <li key={sec.id} style={{ fontSize: 11, color: '#6b7280', padding: '2px 0', display: 'flex', alignItems: 'center' }}>
                      <span style={{ color: '#d1d5db', marginRight: 6 }}>§</span>
                      {resolve(sec.name, projectName)}
                    </li>
                  ))}
                  {!page.subPages?.length && page.sections.length === 0 && (
                    <li style={{ fontSize: 11, color: '#d1d5db', fontStyle: 'italic', padding: '2px 0' }}>
                      Página vacía
                    </li>
                  )}
                </ul>
              )}
            </div>
          )
        })}
      </div>

      <div className="card" style={{ background: '#fffbeb', borderColor: '#fde68a', marginBottom: 12 }}>
        <div className="card-desc" style={{ color: '#92400e' }}>
          ⚠️ Esta acción modificará la estructura del archivo actual. Úsala en archivos nuevos o vacíos.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn-secondary" onClick={prevStep} style={{ flex: 1 }}>← Atrás</button>
        <button className="btn-primary" onClick={onBuild} style={{ flex: 2 }}>✨ Generar estructura</button>
      </div>
    </div>
  )
}
