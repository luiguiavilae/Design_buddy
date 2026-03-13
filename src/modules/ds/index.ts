import type { DSIssue, DSIssueType, FrameDSResult, DSReport } from '../../types/ds'

// Campos de override que afectan estilos visuales (no contenido)
const VISUAL_FIELDS = new Set([
  'fills', 'strokes', 'effects',
  'fillStyleId', 'strokeStyleId', 'effectStyleId',
  'opacity', 'blendMode',
])

// ── Checks individuales ────────────────────────────────────────────────────────

function makeIssue(
  node: SceneNode,
  issueType: DSIssueType,
  description: string,
  suggestion: string,
): DSIssue {
  return { nodeId: node.id, nodeName: node.name, nodeType: node.type, issueType, description, suggestion }
}

async function checkInstance(node: InstanceNode, issues: DSIssue[]): Promise<void> {
  const mc = await node.getMainComponentAsync()

  if (mc === null) {
    issues.push(makeIssue(
      node,
      'broken_component',
      'Componente roto — el maestro ya no existe en ninguna librería.',
      'Re-vincular manualmente o reemplazar por una instancia válida del sistema de diseño.',
    ))
    return
  }

  if (!mc.remote) {
    issues.push(makeIssue(
      node,
      'local_component',
      `Componente local — "${mc.name}" está definido en este archivo, no en la librería compartida.`,
      'Reemplazar por la instancia equivalente de la librería publicada del sistema de diseño.',
    ))
  }

  const visualOverrides = node.overrides.filter(
    (ov) => ov.overriddenFields.some((f) => VISUAL_FIELDS.has(f)),
  )
  if (visualOverrides.length > 0) {
    issues.push(makeIssue(
      node,
      'visual_override',
      `${visualOverrides.length} nodo(s) con fills, strokes o efectos sobreescritos directamente.`,
      'Usar variantes o propiedades expuestas del componente en lugar de sobreescribir estilos visuales.',
    ))
  }
}

function checkFill(node: SceneNode & GeometryMixin, issues: DSIssue[]): void {
  const fills = node.fills
  if (typeof fills === 'symbol') return // figma.mixed
  if (fills.length === 0) return

  const hasVisibleSolid = fills.some((f) => f.type === 'SOLID' && f.visible !== false)
  if (!hasVisibleSolid) return

  const styleId = node.fillStyleId
  if (typeof styleId === 'symbol') return // mixed
  if (styleId !== '') return // tiene estilo vinculado

  issues.push(makeIssue(
    node as unknown as SceneNode,
    'hardcoded_fill',
    'Color de relleno hardcodeado — no usa un color style ni variable del sistema.',
    'Aplicar un color style o variable de color de la librería del sistema de diseño.',
  ))
}

function checkText(node: TextNode, issues: DSIssue[]): void {
  const styleId = node.textStyleId
  if (typeof styleId === 'symbol') return // mixed (multiple styles in range)
  if (styleId !== '') return // tiene text style vinculado

  const preview = node.characters.slice(0, 40) + (node.characters.length > 40 ? '…' : '')
  issues.push(makeIssue(
    node,
    'hardcoded_text',
    `Tipografía sin text style vinculado: "${preview}".`,
    'Aplicar el text style correspondiente del sistema de diseño para garantizar consistencia tipográfica.',
  ))
}

// ── Scanner recursivo ──────────────────────────────────────────────────────────
// Estrategia: al encontrar una INSTANCE, la evalúa y NO entra en sus hijos
// (los hijos son gestionados por el componente, no por el diseñador directamente).
// Solo se auditan fills/texts en nodos que están fuera de instancias.

async function scanNode(node: SceneNode, issues: DSIssue[], counter: { n: number }): Promise<void> {
  counter.n++

  switch (node.type) {
    case 'INSTANCE':
      await checkInstance(node, issues)
      return // no recursión dentro de instancias

    case 'FRAME':
    case 'COMPONENT': {
      // Detectar posible componente desvinculado por convención de nombre "Familia/Variante"
      if (node.name.includes('/')) {
        issues.push(makeIssue(
          node,
          'detached_component',
          `Frame con nombre "${node.name}" sigue el patrón Familia/Variante — posible componente desvinculado.`,
          'Si este frame fue un componente, restaurarlo desde la librería o re-vincularlo como instancia.',
        ))
      }
      checkFill(node as FrameNode, issues)
      for (const child of node.children) await scanNode(child, issues, counter)
      break
    }

    case 'TEXT':
      checkText(node, issues)
      break

    case 'RECTANGLE':
    case 'ELLIPSE':
      checkFill(node as RectangleNode, issues)
      break

    case 'GROUP':
    case 'SECTION':
      if ('children' in node) {
        for (const child of (node as GroupNode | SectionNode).children) {
          await scanNode(child, issues, counter)
        }
      }
      break

    default:
      break
  }
}

// ── Punto de entrada público ───────────────────────────────────────────────────

export async function evaluateDS(
  onProgress: (step: string, percent: number) => void,
): Promise<DSReport> {
  const selection = figma.currentPage.children.filter(
    (n) => n.type === 'FRAME' || n.type === 'COMPONENT' || n.type === 'SECTION',
  ) as FrameNode[]

  if (selection.length === 0) {
    throw new Error('La página actual no tiene frames para evaluar.')
  }

  onProgress('Iniciando análisis…', 0)

  const frames: FrameDSResult[] = []
  let totalScanned = 0
  let totalIssues = 0

  for (let i = 0; i < selection.length; i++) {
    const frame = selection[i]
    onProgress(`Analizando "${frame.name}"…`, Math.round((i / selection.length) * 90))

    const issues: DSIssue[] = []
    const counter = { n: 0 }

    for (const child of frame.children) {
      await scanNode(child, issues, counter)
    }

    totalScanned += counter.n
    totalIssues += issues.length
    frames.push({ frameId: frame.id, frameName: frame.name, issues, scannedNodes: counter.n })
  }

  onProgress('Completado', 100)

  return {
    evaluatedAt: new Date().toISOString(),
    frameCount: selection.length,
    totalScanned,
    totalIssues,
    frames,
  }
}
