import type { Page } from '../../../types/docs'
import { DraggableList } from './DraggableList'
import { PageItem } from './PageItem'

interface Props {
  pages: Page[]
  updatePageName: (pageId: string, name: string) => void
  togglePageEnabled: (pageId: string) => void
  reorderPages: (from: number, to: number) => void
  addCustomPage: () => void
  removePage: (pageId: string) => void
  nextStep: () => void
  prevStep: () => void
}

export function StepPageConfig({ pages, updatePageName, togglePageEnabled, reorderPages, addCustomPage, removePage, nextStep, prevStep }: Props) {
  return (
    <div>
      <p className="section-title">Páginas del proyecto</p>
      <p style={{ fontSize: 11, color: '#6b7280', marginBottom: 10 }}>
        Activa, desactiva o reordena las páginas. Las marcadas como <em>requeridas</em> no se pueden deshabilitar.
      </p>

      <DraggableList
        items={pages}
        onReorder={reorderPages}
        keyExtractor={(p) => p.id}
        renderItem={(page, _index, dragHandleProps) => (
          <PageItem
            page={page}
            onNameChange={(name) => updatePageName(page.id, name)}
            onToggle={() => togglePageEnabled(page.id)}
            onRemove={() => removePage(page.id)}
            dragHandleProps={dragHandleProps}
          />
        )}
      />

      <button
        onClick={addCustomPage}
        style={{
          display: 'block', width: '100%', padding: '8px', marginTop: 2, marginBottom: 14,
          background: 'none', border: '1px dashed #d1d5db', borderRadius: 8,
          fontSize: 11, color: '#6b7280', cursor: 'pointer',
        }}
      >
        + Agregar página de dispositivo
      </button>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn-secondary" onClick={prevStep} style={{ flex: 1 }}>← Atrás</button>
        <button className="btn-primary" onClick={nextStep} style={{ flex: 2 }}>Siguiente →</button>
      </div>
    </div>
  )
}
