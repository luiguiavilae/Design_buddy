import { useState } from 'react'
import type { Page } from '../../../types/docs'
import { DraggableList } from './DraggableList'
import { SectionItem } from './SectionItem'

interface Props {
  projectName: string
  pages: Page[]
  updateSectionName: (pageId: string, sectionId: string, name: string) => void
  reorderSections: (pageId: string, from: number, to: number) => void
  addCustomSection: (pageId: string) => void
  removeSection: (pageId: string, sectionId: string) => void
  nextStep: () => void
  prevStep: () => void
}

export function StepSectionConfig({ projectName, pages, updateSectionName, reorderSections, addCustomSection, removeSection, nextStep, prevStep }: Props) {
  const devicePages = pages.filter((p) => p.isEnabled && p.isDevicePage)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const toggleCollapse = (pageId: string) =>
    setCollapsed((prev) => ({ ...prev, [pageId]: !prev[pageId] }))

  const hasPlaceholder = devicePages.some((p) => p.name.includes('{projectName}'))

  return (
    <div>
      <p className="section-title">Pantallas de diseño</p>
      <p style={{ fontSize: 11, color: '#6b7280', marginBottom: 10 }}>
        Cada section incluirá automáticamente los frames Error / Unhappy, Happy y Alternative.
      </p>

      {hasPlaceholder && projectName && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 6, padding: '8px 10px',
          background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8,
          fontSize: 11, color: '#1e40af', marginBottom: 10,
        }}>
          <span>✦</span>
          <span>
            <code style={{ background: 'rgba(0,102,204,0.1)', borderRadius: 3, padding: '1px 4px' }}>
              {'{projectName}'}
            </code>
            {' '}se reemplazará por <strong>{projectName}</strong> al generar.
          </span>
        </div>
      )}

      {devicePages.map((page) => {
        const isCollapsed = collapsed[page.id]
        return (
          <div key={page.id} style={{ border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 8, overflow: 'hidden' }}>
            <button
              onClick={() => toggleCollapse(page.id)}
              style={{
                display: 'flex', alignItems: 'center', width: '100%', padding: '9px 12px',
                background: '#f9fafb', border: 'none', cursor: 'pointer', boxSizing: 'border-box',
              }}
            >
              <span style={{ flex: 1, textAlign: 'left', fontSize: 12, fontWeight: 500, color: '#1a1a2e' }}>
                {page.name}
              </span>
              <span style={{ fontSize: 11, color: '#9ca3af', marginRight: 6 }}>
                {page.sections.length} section{page.sections.length !== 1 ? 's' : ''}
              </span>
              <span style={{ color: '#9ca3af', fontSize: 11 }}>{isCollapsed ? '▸' : '▾'}</span>
            </button>

            {!isCollapsed && (
              <div style={{ padding: '8px 12px 10px' }}>
                <DraggableList
                  items={page.sections}
                  onReorder={(from, to) => reorderSections(page.id, from, to)}
                  keyExtractor={(sec) => sec.id}
                  renderItem={(sec, _idx, dragHandleProps) => (
                    <SectionItem
                      section={sec}
                      onNameChange={(name) => updateSectionName(page.id, sec.id, name)}
                      onRemove={() => removeSection(page.id, sec.id)}
                      dragHandleProps={dragHandleProps}
                    />
                  )}
                />
                <button
                  onClick={() => addCustomSection(page.id)}
                  style={{
                    display: 'block', width: '100%', padding: '5px',
                    background: 'none', border: '1px dashed #d1d5db', borderRadius: 6,
                    fontSize: 11, color: '#9ca3af', cursor: 'pointer', marginTop: 4,
                  }}
                >
                  + Agregar section
                </button>
              </div>
            )}
          </div>
        )
      })}

      {devicePages.length === 0 && (
        <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 20, marginBottom: 20 }}>
          No hay páginas de dispositivo habilitadas. Vuelve al paso anterior y activa la página de diseño.
        </p>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button className="btn-secondary" onClick={prevStep} style={{ flex: 1 }}>← Atrás</button>
        <button className="btn-primary" onClick={nextStep} style={{ flex: 2 }}>Siguiente →</button>
      </div>
    </div>
  )
}
