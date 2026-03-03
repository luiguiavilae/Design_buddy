import type { CriterionResult, Finding, ScanResult, Status } from '../../../types/handoff'

const ALTERNATIVE_RE = /alternative|alternativo/i
const HAPPY_RE = /\bhappy\b|happy path/i
const ERROR_RE = /\berror\b|unhappy/i

export function evaluateCriterion4(scan: ScanResult): CriterionResult {
  const { topLevelNames, sections, connectorCount } = scan
  const allNames = [...topLevelNames, ...sections.map((s) => s.name)]

  if (allNames.length === 0) {
    return {
      id: 4,
      title: 'Organización del Screenflow',
      weight: 'Alto',
      status: 'fail',
      score: 0,
      totalChecked: 0,
      passingCount: 0,
      findings: [{
        nodeId: scan.pageId,
        nodeName: scan.pageName,
        message: 'Página vacía — no se puede evaluar el Screenflow',
        action: 'Agregar frames y secciones a la página antes de evaluar el Screenflow',
        status: 'fail',
      }],
      summary: 'No hay contenido en la página — no se puede evaluar el Screenflow.',
    }
  }

  const checks = [
    {
      label: 'Carril Alternative',
      found: allNames.some((n) => ALTERNATIVE_RE.test(n)),
      action: 'Seleccionar los frames del flujo alternativo > clic derecho > "Add Section" y nombrarla "Alternative Path" o "Flujo Alternativo"',
    },
    {
      label: 'Carril Happy',
      found: allNames.some((n) => HAPPY_RE.test(n)),
      action: 'Seleccionar los frames del flujo principal > clic derecho > "Add Section" y nombrarla "Happy Path" o "Flujo Principal"',
    },
    {
      label: 'Carril Error / Unhappy',
      found: allNames.some((n) => ERROR_RE.test(n)),
      action: 'Seleccionar los frames de error > clic derecho > "Add Section" y nombrarla "Error" o "Unhappy Path"',
    },
    {
      label: 'Conectores entre pantallas',
      found: connectorCount > 0,
      action: 'Conectar pantallas: hover sobre el borde de un frame hasta ver el punto de conexión (círculo), luego arrastrar hacia el frame destino',
    },
  ]

  const findings: Finding[] = []
  let passing = 0

  for (const check of checks) {
    if (check.found) {
      passing++
    } else {
      findings.push({
        nodeId: scan.pageId,
        nodeName: scan.pageName,
        message: `Falta: ${check.label}`,
        action: check.action,
        status: 'warn',
      })
    }
  }

  const score = Math.round((passing / checks.length) * 100)
  const status: Status = score === 100 ? 'pass' : score >= 50 ? 'warn' : 'fail'

  return {
    id: 4,
    title: 'Organización del Screenflow',
    weight: 'Alto',
    status,
    score,
    totalChecked: checks.length,
    passingCount: passing,
    findings,
    summary: `${connectorCount} conector(es) · ${sections.length} sección(es). Carriles presentes: ${passing} de 3.`,
  }
}
