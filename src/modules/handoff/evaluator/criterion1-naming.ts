import type { CriterionResult, Finding, ScanResult, Status } from '../../../types/handoff'

// Accepts: "07 - Otros Ingresos"  OR  "01 - Name - State"  OR  "01.1 - Name - State"
// State is optional — a frame with only correlativo + name is valid.
const NAMING_PATTERN = /^\d{2}(\.\d{1,2})?\s*-\s*\S.*$/
const GENERIC_NAMES = /^(frame\s*\d*|nueva?\s*pantalla|copy.*|untitled|sin\s*título)$/i

export function evaluateCriterion1(scan: ScanResult): CriterionResult {
  const { topLevelFrames } = scan

  if (topLevelFrames.length === 0) {
    return {
      id: 1,
      title: 'Nomenclatura de Pantallas',
      weight: 'Alto',
      status: 'fail',
      score: 0,
      totalChecked: 0,
      passingCount: 0,
      findings: [{
        nodeId: '',
        nodeName: scan.pageName,
        message: 'No se encontraron frames de nivel superior en la página',
        action: 'Agregar frames a la página antes de evaluar nomenclatura',
        status: 'fail',
      }],
      summary: 'No hay frames en la página — no se puede evaluar nomenclatura.',
    }
  }

  const findings: Finding[] = []
  let passing = 0

  for (const frame of topLevelFrames) {
    if (NAMING_PATTERN.test(frame.name)) {
      passing++
    } else {
      const isGeneric = GENERIC_NAMES.test(frame.name.trim()) || /^frame\s*\d+/i.test(frame.name)
      findings.push({
        nodeId: frame.id,
        nodeName: frame.name,
        message: isGeneric
          ? 'Nombre genérico — usar formato: "07 - Otros Ingresos" o "01 - Nombre - Estado"'
          : 'No sigue el formato: "[##] - [Nombre]" ni "[##] - [Nombre] - [Estado]"',
        action: 'Doble clic sobre el nombre del frame y renombrarlo. Formatos válidos: "07 - Otros Ingresos" o "01 - Transfer Amount - Vacío"',
        status: 'fail',
      })
    }
  }

  const score = Math.round((passing / topLevelFrames.length) * 100)
  const status: Status = score === 100 ? 'pass' : score >= 70 ? 'warn' : 'fail'

  return {
    id: 1,
    title: 'Nomenclatura de Pantallas',
    weight: 'Alto',
    status,
    score,
    totalChecked: topLevelFrames.length,
    passingCount: passing,
    findings,
    summary: `${passing} de ${topLevelFrames.length} frames con nomenclatura correcta (ej. "07 - Otros Ingresos" o "01 - Transfer Amount - Vacío").`,
  }
}
