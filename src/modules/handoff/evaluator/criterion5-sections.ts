import type { CriterionResult, Finding, ScanResult, Status } from '../../../types/handoff'

const EXPECTED_SECTIONS: { key: RegExp; label: string; action: string }[] = [
  {
    key: /cover|portada|nomenclatura/i,
    label: 'Cover / Nomenclatura',
    action: 'Crear una Sección llamada "Cover" o "Portada" y colocar el componente cover/file dentro de ella',
  },
  {
    key: /estructura/i,
    label: 'Estructura del archivo',
    action: 'Crear una Sección llamada "Estructura del Archivo" con el diagrama de estructura del proyecto',
  },
  {
    key: /screenflow|flujo|flow/i,
    label: 'Organización del Screenflow',
    action: 'Crear una Sección llamada "Screenflow" o "Flujo" con el mapa de flujo de pantallas',
  },
  {
    key: /diseño|pantalla|screen/i,
    label: 'Pantallas de diseño',
    action: 'Crear una Sección llamada "Pantallas de Diseño" o "Screens" que contenga todos los frames de pantallas',
  },
  {
    key: /component|design system/i,
    label: 'Conexión de componentes',
    action: 'Crear una Sección llamada "Componentes" o "Design System" con los componentes y estados utilizados',
  },
]

export function evaluateCriterion5(scan: ScanResult): CriterionResult {
  const { allPagesNames, pageCount } = scan
  const totalSections = scan.sections.length

  if (allPagesNames.length === 0) {
    return {
      id: 5,
      title: 'Estructura Interna del Archivo',
      weight: 'Medio',
      status: 'fail',
      score: 0,
      totalChecked: EXPECTED_SECTIONS.length,
      passingCount: 0,
      findings: [{
        nodeId: scan.pageId,
        nodeName: scan.pageName,
        message: 'El archivo está vacío — no se encontró contenido en ninguna página',
        action: 'Seleccionar frames relacionados > clic derecho > "Add Section". Crear secciones para: Cover, Screenflow, Pantallas y Componentes',
        status: 'fail',
      }],
      summary: 'Archivo sin contenido. Crear secciones para: Cover, Screenflow, Pantallas y Componentes.',
    }
  }

  const findings: Finding[] = []
  let passing = 0

  for (const expected of EXPECTED_SECTIONS) {
    const found = allPagesNames.some((name) => expected.key.test(name))
    if (found) {
      passing++
    } else {
      findings.push({
        nodeId: scan.pageId,
        nodeName: scan.pageName,
        message: `Sección no encontrada en ninguna página: "${expected.label}"`,
        action: expected.action,
        status: 'warn',
      })
    }
  }

  const score = Math.round((passing / EXPECTED_SECTIONS.length) * 100)
  const status: Status = score >= 80 ? 'pass' : score >= 50 ? 'warn' : 'fail'

  return {
    id: 5,
    title: 'Estructura Interna del Archivo',
    weight: 'Medio',
    status,
    score,
    totalChecked: EXPECTED_SECTIONS.length,
    passingCount: passing,
    findings,
    summary: `${pageCount} página(s) analizadas · ${totalSections} sección(es) encontradas. ${passing} de ${EXPECTED_SECTIONS.length} secciones esperadas presentes.`,
  }
}
