import type { CriterionResult, Finding, ScanResult, Status } from '../../../types/handoff'

export function evaluateCriterion2(scan: ScanResult): CriterionResult {
  const { topLevelFrames } = scan

  if (topLevelFrames.length === 0) {
    return {
      id: 2,
      title: 'Lineamientos de Implementación',
      weight: 'Alto',
      status: 'fail',
      score: 0,
      totalChecked: 0,
      passingCount: 0,
      findings: [{
        nodeId: '',
        nodeName: scan.pageName,
        message: 'No se encontraron frames de nivel superior en la página',
        action: 'Agregar frames de nivel superior a la página antes de evaluar',
        status: 'fail',
      }],
      summary: 'No hay frames en la página — no se puede evaluar Auto Layout.',
    }
  }

  const findings: Finding[] = []
  let passing = 0

  for (const frame of topLevelFrames) {
    const issues: string[] = []
    const actions: string[] = []

    if (frame.layoutMode === 'NONE') {
      issues.push('Sin Auto Layout configurado')
      actions.push('Seleccionar el frame y presionar Shift+A para agregar Auto Layout en dirección Vertical')
    } else if (frame.layoutMode !== 'VERTICAL') {
      issues.push(`Auto Layout "${frame.layoutMode}" — debe ser VERTICAL`)
      actions.push('Seleccionar el frame > panel derecho > Auto Layout > cambiar dirección a Vertical')
    }

    if (issues.length === 0) {
      passing++
    } else {
      findings.push({
        nodeId: frame.id,
        nodeName: frame.name,
        message: issues.join(' · '),
        action: actions.join(' · '),
        status: frame.layoutMode === 'NONE' ? 'fail' : 'warn',
      })
    }
  }

  const score = Math.round((passing / topLevelFrames.length) * 100)
  const status: Status = score === 100 ? 'pass' : score >= 70 ? 'warn' : 'fail'

  return {
    id: 2,
    title: 'Lineamientos de Implementación',
    weight: 'Alto',
    status,
    score,
    totalChecked: topLevelFrames.length,
    passingCount: passing,
    findings,
    summary: `${passing} de ${topLevelFrames.length} frames con Auto Layout vertical correcto.`,
  }
}
