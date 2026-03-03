import voiceRules from './rules/bcp-voice.json'
import type { CopyIssue } from '../../types/copy'

interface ForbiddenEntry { term: string; fix: string }
interface JargonEntry    { term: string; fix: string }

function norm(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function issue(nodeId: string, text: string, description: string, suggestion: string): CopyIssue {
  return { nodeId, originalText: text, issueType: 'voz_marca', description, suggestion }
}

export function detectComponentType(nodeName: string): string | null {
  const lower = nodeName.toLowerCase()
  const map = voiceRules.componentTypeMap as Record<string, string>
  for (const [key, value] of Object.entries(map)) {
    if (lower.includes(key)) return value
  }
  return null
}

function checkForbidden(text: string, nodeId: string): CopyIssue | null {
  const n = norm(text)
  for (const entry of voiceRules.forbidden as ForbiddenEntry[]) {
    if (n.includes(norm(entry.term))) {
      return issue(nodeId, text, `Término fuera del tono BCP: "${entry.term}"`, entry.fix)
    }
  }
  return null
}

function checkPassiveVoice(text: string, nodeId: string): CopyIssue | null {
  const n = norm(text)
  for (const pattern of voiceRules.passiveVoice) {
    if (n.includes(norm(pattern))) {
      return issue(
        nodeId, text,
        'Voz pasiva detectada. El BCP usa voz activa para sonar más directo y humano.',
        'Reescribir con sujeto activo. Ej: "ha sido procesada" → "está lista" / "Listo ✓"'
      )
    }
  }
  return null
}

function checkBankJargon(text: string, nodeId: string): CopyIssue | null {
  const n = norm(text)
  for (const entry of voiceRules.bankJargon as JargonEntry[]) {
    if (n.includes(norm(entry.term))) {
      return issue(
        nodeId, text,
        `Jerga bancaria sin traducción: "${entry.term}". Pilares BCP: Simple · Cercana · Oportuna.`,
        `Reemplazar por lenguaje cotidiano: ${entry.fix}`
      )
    }
  }
  return null
}

function checkFalseUrgency(text: string, nodeId: string): CopyIssue | null {
  const n = norm(text)
  for (const trigger of voiceRules.falseUrgency) {
    if (n.includes(norm(trigger))) {
      return issue(
        nodeId, text,
        'Urgencia artificial detectada. Genera desconfianza y contradice el tono de aliado del BCP.',
        'Reemplazar por fecha o condición específica real. Si no hay urgencia real, eliminar el trigger.'
      )
    }
  }
  return null
}

function checkErrorMessage(text: string, nodeId: string, componentType: string | null): CopyIssue | null {
  if (componentType !== 'error_message') return null
  const { incompletePatterns, actionPhrases } = voiceRules.errorMessageRules
  const n = norm(text)
  const isIncomplete = incompletePatterns.some((p) => new RegExp(p, 'i').test(n))
  if (!isIncomplete) return null
  const hasAction = actionPhrases.some((phrase) => n.includes(norm(phrase)))
  if (hasAction) return null
  return issue(
    nodeId, text,
    'Mensaje de error incompleto: falta indicar qué puede hacer el usuario.',
    'Estructura: [Qué pasó] + [Qué hacer ahora]. Ej: "Sin conexión. Revisa tu internet e intenta de nuevo."'
  )
}

function checkLength(text: string, nodeId: string, componentType: string | null): CopyIssue | null {
  if (!componentType) return null
  const limits = voiceRules.lengthLimits as Record<string, { maxWords: number; maxChars: number }>
  const limit = limits[componentType]
  if (!limit) return null
  const wordCount = text.trim().split(/\s+/).length
  const charCount = text.trim().length
  if (wordCount > limit.maxWords || charCount > limit.maxChars) {
    return issue(
      nodeId, text,
      `Texto demasiado largo para "${componentType}" (${wordCount} palabras / ${charCount} chars). Límite BCP: ${limit.maxWords} palabras / ${limit.maxChars} chars.`,
      'Reducir al verbo + objeto esencial. Eliminar artículos y preposiciones innecesarias.'
    )
  }
  return null
}

export function checkVozMarca(text: string, nodeId: string, nodeName: string = ''): CopyIssue[] {
  const issues: CopyIssue[] = []
  const componentType = detectComponentType(nodeName)
  const result =
    checkForbidden(text, nodeId)     ||
    checkPassiveVoice(text, nodeId)  ||
    checkFalseUrgency(text, nodeId)  ||
    checkBankJargon(text, nodeId)    ||
    checkErrorMessage(text, nodeId, componentType) ||
    checkLength(text, nodeId, componentType)
  if (result) issues.push(result)
  return issues
}
