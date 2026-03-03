import type { CriterionResult, Finding, ScanResult } from '../../../types/handoff'

const GENERIC_FILE_PATTERN = /^(untitled|nuevo archivo|new file|sin título)$/i

export function evaluateCriterion3(scan: ScanResult): CriterionResult {
  const { coverPageData, fileName } = scan
  const findings: Finding[] = []
  let deductions = 0

  if (GENERIC_FILE_PATTERN.test(fileName.trim())) {
    findings.push({
      nodeId: '',
      nodeName: fileName,
      message: 'Nombre de archivo no descriptivo — debe describir la funcionalidad',
      action: 'Renombrar el archivo Figma: doble clic sobre el título en la barra superior y escribir el nombre del flujo (ej: "BCP · App · Transferencias")',
      status: 'warn',
    })
    deductions += 20
  }

  if (!coverPageData) {
    findings.push({
      nodeId: '',
      nodeName: '—',
      message: 'No se encontró una página de Cover — crear una página con nombre "Cover" o "Portada"',
      action: 'Crear nueva página: clic en "+" junto a las pestañas de páginas y nombrarla "Cover" o "Portada". Agregar el componente cover/file del Design System BCP',
      status: 'fail',
    })
    return {
      id: 3,
      title: 'Estructura de Archivos',
      weight: 'Medio',
      status: 'fail',
      score: 0,
      totalChecked: 1,
      passingCount: 0,
      findings,
      summary: `Cover no encontrado en ninguna página del archivo. Archivo: "${fileName}".`,
    }
  }

  const check = (keyword: string) =>
    coverPageData.textContents.some((t) => t.includes(keyword))

  if (!check('sprint')) {
    findings.push({
      nodeId: coverPageData.frameId,
      nodeName: coverPageData.frameName,
      message: 'Cover sin campo Sprint (ej. Q3-2025 | Sprint-5)',
      action: 'En el Cover, agregar un texto con el sprint actual, ej: "Q3-2025 | Sprint-5"',
      status: 'warn',
    })
    deductions += 15
  }

  if (!check('tribu') && !check('squad')) {
    findings.push({
      nodeId: coverPageData.frameId,
      nodeName: coverPageData.frameName,
      message: 'Cover sin campo Tribu o Squad',
      action: 'En el Cover, agregar los campos de texto con el nombre de la Tribu y el Squad correspondiente',
      status: 'warn',
    })
    deductions += 15
  }

  if (!check('in progress') && !check('ready for dev') && !check('completado') && !check('in review')) {
    findings.push({
      nodeId: coverPageData.frameId,
      nodeName: coverPageData.frameName,
      message: 'Cover sin etiqueta de Status (IN PROGRESS, READY FOR DEV, COMPLETADO…)',
      action: 'En el Cover, actualizar la etiqueta de Status a uno de: IN PROGRESS, READY FOR DEV, IN REVIEW o COMPLETADO',
      status: 'warn',
    })
    deductions += 15
  }

  const hasPDInstance = (coverPageData.instanceNames ?? []).some((n) =>
    /^pd[_\s]/i.test(n)
  )
  if (!check('designer') && !check('diseñador') && !check('product designer') && !hasPDInstance) {
    findings.push({
      nodeId: coverPageData.frameId,
      nodeName: coverPageData.frameName,
      message: 'Cover sin campo Product Designer',
      action: 'En el Cover, agregar un campo de texto con el nombre del Product Designer responsable del archivo',
      status: 'warn',
    })
    deductions += 10
  }

  // Validate "Member List group" or "Team Group" instance (not "Astro")
  const TEAM_GROUP_NAMES = new Set(['member list group', 'team group'])
  const instanceNames = coverPageData.instanceNames ?? []
  const hasValidTeamGroup = instanceNames.some((n) => TEAM_GROUP_NAMES.has(n))
  const hasAstro = instanceNames.some((n) => n === 'astro')

  if (!hasValidTeamGroup) {
    findings.push({
      nodeId: coverPageData.frameId,
      nodeName: coverPageData.frameName,
      message: hasAstro
        ? "Cover con instancia 'Astro' en lugar de 'Member List group' o 'Team Group' — reemplazar con el componente correcto"
        : "Cover sin instancia 'Member List group' ni 'Team Group' — agregar el componente del equipo de diseño",
      action: "En el Cover, agregar una instancia del componente 'Member List group' o 'Team Group' del Design System con el nombre real del diseñador (no 'Astro')",
      status: 'warn',
    })
    deductions += 15
  }

  const score = Math.max(0, 100 - deductions)
  const status = score >= 90 ? 'pass' as const : score >= 60 ? 'warn' as const : 'fail' as const

  return {
    id: 3,
    title: 'Estructura de Archivos',
    weight: 'Medio',
    status,
    score,
    totalChecked: 1,
    passingCount: findings.length === 0 ? 1 : 0,
    findings,
    summary: `Cover encontrado en página "${coverPageData.pageName}". Archivo: "${fileName}".`,
  }
}
