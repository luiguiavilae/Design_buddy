import type { Section } from '../../../types/docs'

interface SectionItemProps {
  section: Section
  onNameChange: (name: string) => void
  onRemove: () => void
  dragHandleProps?: React.HTMLAttributes<HTMLElement>
}

export function SectionItem({ section, onNameChange, onRemove, dragHandleProps }: SectionItemProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '5px 8px',
      background: '#fafafa',
      border: '1px solid #eeeeee',
      borderRadius: 6,
      marginBottom: 4,
    }}>
      <span
        {...dragHandleProps}
        style={{ cursor: 'grab', color: '#d1d5db', fontSize: 12, userSelect: 'none', flexShrink: 0 }}
        title="Arrastra para reordenar"
      >⠿</span>

      <span style={{ color: '#d1d5db', fontSize: 11, flexShrink: 0 }}>§</span>

      <input
        value={section.name}
        onChange={(e) => onNameChange(e.target.value)}
        style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 11, color: '#374151', outline: 'none', minWidth: 0 }}
      />

      {section.isRequired && (
        <span style={{ fontSize: 9, color: '#9ca3af', background: '#f3f4f6', borderRadius: 4, padding: '2px 5px', flexShrink: 0 }}>
          requerida
        </span>
      )}

      {!section.isRequired && (
        <button
          onClick={onRemove}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', fontSize: 16, padding: 0, flexShrink: 0, lineHeight: 1 }}
          title="Eliminar section"
        >×</button>
      )}
    </div>
  )
}
