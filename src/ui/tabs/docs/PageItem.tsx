import type { Page } from '../../../types/docs'
import { ToggleSwitch } from './ToggleSwitch'

interface PageItemProps {
  page: Page
  onNameChange: (name: string) => void
  onToggle: () => void
  onRemove: () => void
  dragHandleProps?: React.HTMLAttributes<HTMLElement>
}

export function PageItem({ page, onNameChange, onToggle, onRemove, dragHandleProps }: PageItemProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '7px 10px',
      background: page.isEnabled ? '#fff' : '#f5f5f7',
      border: '1px solid #e5e7eb',
      borderRadius: 8,
      marginBottom: 5,
      opacity: page.isEnabled ? 1 : 0.6,
    }}>
      <span
        {...dragHandleProps}
        style={{ cursor: 'grab', color: '#c0c0c0', fontSize: 14, userSelect: 'none', flexShrink: 0 }}
        title="Arrastra para reordenar"
      >⠿</span>

      <input
        value={page.name}
        onChange={(e) => onNameChange(e.target.value)}
        disabled={!page.isEnabled}
        style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 12, color: '#1a1a2e', outline: 'none', minWidth: 0 }}
      />

      {page.isRequired && (
        <span style={{ fontSize: 9, color: '#9ca3af', background: '#f3f4f6', borderRadius: 4, padding: '2px 5px', flexShrink: 0 }}>
          requerida
        </span>
      )}

      {!page.isRequired && <ToggleSwitch checked={page.isEnabled} onChange={onToggle} />}

      {!page.isRequired && (
        <button
          onClick={onRemove}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', fontSize: 16, padding: 0, flexShrink: 0, lineHeight: 1 }}
          title="Eliminar página"
        >×</button>
      )}
    </div>
  )
}
