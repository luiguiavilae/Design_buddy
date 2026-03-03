import type { CopyReport, FrameCopyResult, CopyIssue, CopyIssueType } from '../../types/copy'
import { checkVozMarca } from './vozMarca'

type ProgressCallback = (step: string, percent: number) => void

const tick = () => new Promise<void>((r) => setTimeout(r, 50))

// ── Textos que NO son contenido de usuario (se excluyen de la evaluación) ─────
const EXCLUDED_PATTERNS = [
  /^(frame|section|layer|group|component)\s*\d*/i,
  /^\d+$/,                    // solo números
  /^[^a-záéíóúüñ\w]/i,       // empieza con símbolo especial
]

function isContentText(text: string): boolean {
  const trimmed = text.trim()
  if (trimmed.length < 2) return false
  if (EXCLUDED_PATTERNS.some((p) => p.test(trimmed))) return false
  return true
}

// ── Evaluaciones determinísticas ──────────────────────────────────────────────

function checkOrtografia(text: string): CopyIssue | null {
  // Patrones comunes de errores ortográficos en español
  const errors: [RegExp, string][] = [
    [/\bmas\b(?!\s+o\s)/i, 'Posible falta de tilde: "más" (adverbio) lleva tilde'],
    [/\btu\b(?!\s+\w)/i, 'Posible falta de tilde: "tú" (pronombre) lleva tilde'],
    [/\bel\b(?=\s+(que|cual)\b)/i, 'Posible confusión: "él" (pronombre) lleva tilde'],
    [/\bsi\b(?=\s+(quieres|deseas|puedes|tienes))/i, 'Posible falta de tilde: "sí" (afirmación) lleva tilde'],
    [/\bque\b.*\?$/i, 'Posible falta de tilde interrogativa: "qué"'],
    [/\bcomo\b.*\?/i, 'Posible falta de tilde: "cómo" en pregunta lleva tilde'],
    [/\besta\b(?!\s+\w+ando|\s+\w+iendo)/i, 'Posible falta de tilde: "está" (verbo) lleva tilde'],
    [/\bsolo\b/i, 'Verificar uso de "solo": si puede reemplazarse por "solamente", no necesita tilde'],
  ]

  for (const [pattern, message] of errors) {
    if (pattern.test(text)) {
      return {
        nodeId: '',
        originalText: text,
        issueType: 'ortografia',
        description: message,
        suggestion: 'Revisar la ortografía y uso de tildes en este texto',
      }
    }
  }
  return null
}

function checkOptimizacion(text: string): CopyIssue | null {
  // Textos excesivamente largos para UI
  if (text.length > 120) {
    return {
      nodeId: '',
      originalText: text,
      issueType: 'optimizacion',
      description: `Texto demasiado largo (${text.length} caracteres). En interfaces, los textos de más de 120 caracteres reducen la legibilidad.`,
      suggestion: 'Acortar el texto manteniendo el mensaje esencial. Considera dividir en dos elementos si el contenido lo requiere.',
    }
  }
  return null
}

function checkRedundancia(text: string): CopyIssue | null {
  const redundantPhrases = [
    [/\bhaz clic en el botón\b/i, 'Redundante: "botón" ya implica que se puede hacer clic'],
    [/\bselecciona la opción\b/i, 'Redundante: "opción" ya implica que se puede seleccionar'],
    [/\bintroduce los datos de tu\b/i, 'Redundante: simplificar a "Ingresa tu..."'],
    [/\bpor favor.*por favor\b/i, '"Por favor" duplicado'],
    [/\bactualmente en este momento\b/i, '"Actualmente" y "en este momento" son redundantes entre sí'],
  ]

  for (const [pattern, message] of redundantPhrases) {
    if (pattern.test(text)) {
      return {
        nodeId: '',
        originalText: text,
        issueType: 'redundancia',
        description: message,
        suggestion: 'Eliminar la redundancia para un texto más limpio y directo',
      }
    }
  }
  return null
}

function checkTecnicismo(text: string): CopyIssue | null {
  const techTerms = [
    [/\b(API|SDK|backend|frontend|deploy|endpoint|payload|token)\b/i, 'Tecnicismo de desarrollo no apropiado para usuarios finales'],
    [/\b(null|undefined|NaN|error 4\d{2}|error 5\d{2})\b/i, 'Término técnico no apropiado para usuarios finales'],
    [/\b(id|uuid|hash|string|boolean|integer)\b/i, 'Término de programación no apropiado para usuarios finales'],
    [/\bverifica tu (conexión|network|DNS|cache)\b/i, 'Tecnicismo de red. Usar lenguaje más accesible'],
    [/\b(cache|buffer|timeout|request|response)\b/i, 'Tecnicismo técnico. Reemplazar por lenguaje cotidiano'],
  ]

  for (const [pattern, message] of techTerms) {
    if ((pattern as RegExp).test(text)) {
      return {
        nodeId: '',
        originalText: text,
        issueType: 'tecnicismo',
        description: message as string,
        suggestion: 'Reemplazar el término técnico por lenguaje que cualquier usuario pueda entender',
      }
    }
  }
  return null
}

function checkTono(text: string): CopyIssue | null {
  const toneIssues: [RegExp, string, string][] = [
    [
      /\b(debes|tienes que|es obligatorio|es necesario que)\b/i,
      'Tono imperativo o coercitivo. Puede generar fricción en el usuario',
      'Usar tono más amable: "Te recomendamos...", "Para continuar..."',
    ],
    [
      /\b(error|fallo|falló|incorrecto|inválido|equivocado)\b/i,
      'Lenguaje negativo que puede generar ansiedad. Considerar reformular',
      'Usar lenguaje constructivo: "Verifica que...", "Asegúrate de..."',
    ],
    [
      /\b(imposible|no puedes|no es posible|no se puede)\b/i,
      'Tono bloqueante. Mejor explicar qué SÍ puede hacer el usuario',
      'Reformular: "En este momento..." o explicar la alternativa disponible',
    ],
  ]

  for (const [pattern, message, suggestion] of toneIssues) {
    if (pattern.test(text)) {
      return {
        nodeId: '',
        originalText: text,
        issueType: 'tono',
        description: message,
        suggestion,
      }
    }
  }
  return null
}

function evaluateText(text: string, nodeId: string, nodeName: string): CopyIssue[] {
  const issues: CopyIssue[] = []

  const checks = [
    checkOrtografia(text),
    checkOptimizacion(text),
    checkRedundancia(text),
    checkTecnicismo(text),
    checkTono(text),
  ]

  for (const issue of checks) {
    if (issue) {
      issues.push({ ...issue, nodeId })
    }
  }

  issues.push(...checkVozMarca(text, nodeId, nodeName))

  return issues
}

// ── Extracción de textos de frames ────────────────────────────────────────────

function extractTextsFromFrame(frame: FrameNode): Array<{ nodeId: string; text: string; nodeName: string }> {
  const results: Array<{ nodeId: string; text: string; nodeName: string }> = []

  frame.findAll((node) => {
    if (node.type !== 'TEXT') return false
    const textNode = node as TextNode
    const text = textNode.characters.trim()
    if (isContentText(text)) {
      results.push({ nodeId: textNode.id, text, nodeName: textNode.name })
    }
    return false
  })

  return results
}

// ── Evaluador principal ───────────────────────────────────────────────────────

export async function evaluateCopy(onProgress?: ProgressCallback): Promise<CopyReport> {
  const selection = figma.currentPage.selection

  // Filtrar solo frames de la selección
  const frames = selection.filter((n) => n.type === 'FRAME') as FrameNode[]

  if (frames.length === 0) {
    throw new Error('Selecciona al menos un frame en el canvas antes de evaluar')
  }

  onProgress?.('Extrayendo textos de los frames seleccionados…', 15)
  await tick()

  const frameResults: FrameCopyResult[] = []
  let totalTexts = 0
  let totalIssues = 0

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i]
    const percent = 15 + Math.round(((i + 1) / frames.length) * 70)
    onProgress?.(`Evaluando frame: ${frame.name}…`, percent)
    await tick()

    const texts = extractTextsFromFrame(frame)
    totalTexts += texts.length

    const issues: CopyIssue[] = []
    for (const { nodeId, text, nodeName } of texts) {
      const found = evaluateText(text, nodeId, nodeName)
      issues.push(...found)
    }

    totalIssues += issues.length
    frameResults.push({
      frameId: frame.id,
      frameName: frame.name,
      issues,
      textCount: texts.length,
    })
  }

  onProgress?.('Generando reporte…', 95)
  await tick()

  return {
    evaluatedAt: new Date().toISOString(),
    frameCount: frames.length,
    totalTexts,
    totalIssues,
    frames: frameResults,
  }
}
