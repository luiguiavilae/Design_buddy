import { PROJECT_TYPES } from '../../../types/docs'

interface Props {
  projectName: string
  projectType: string
  setProjectName: (name: string) => void
  setProjectType: (type: string) => void
  nextStep: () => void
}

export function StepProjectInfo({ projectName, projectType, setProjectName, setProjectType, nextStep }: Props) {
  const canProceed = projectName.trim().length > 0

  return (
    <div>
      <p className="section-title">Información del proyecto</p>

      <div className="card">
        <div className="form-group">
          <label className="label">
            Nombre del proyecto <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            className="input"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Ej. App Bancaria v2"
            autoFocus
          />
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="label">Tipo de proyecto</label>
          <select
            className="select"
            value={projectType}
            onChange={(e) => setProjectType(e.target.value)}
          >
            {PROJECT_TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </div>

      <button
        className="btn-primary"
        onClick={nextStep}
        disabled={!canProceed}
      >
        Siguiente →
      </button>
    </div>
  )
}
