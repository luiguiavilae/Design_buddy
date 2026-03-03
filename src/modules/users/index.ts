import type { UsersReport, UsersRequest, SyntheticUser } from '../../types/users'

type ProgressCallback = (step: string, percent: number) => void

// ── Extrae descripción textual del frame seleccionado para dar contexto al LLM

export function getUsersContext(): { frameDescription: string; hasSelection: boolean } {
  const selection = figma.currentPage.selection

  if (selection.length === 0) {
    return { frameDescription: '', hasSelection: false }
  }

  const node = selection[0]
  const lines: string[] = []

  lines.push(`Pantalla: "${node.name}"`)

  if (node.type === 'FRAME') {
    const frame = node as FrameNode

    // Extraer textos visibles del frame para dar contexto semántico al LLM
    const texts: string[] = []
    frame.findAll((n) => {
      if (n.type === 'TEXT') {
        const t = (n as TextNode).characters.trim()
        if (t.length > 1) texts.push(t)
      }
      return false
    })

    if (texts.length > 0) {
      lines.push(`Textos en pantalla: ${texts.slice(0, 20).join(' | ')}`)
    }

    lines.push(`Dimensiones: ${Math.round(frame.width)} × ${Math.round(frame.height)} px`)
  }

  return {
    frameDescription: lines.join('\n'),
    hasSelection: true,
  }
}

// ── Construye el prompt para el LLM ──────────────────────────────────────────

function buildPrompt(request: UsersRequest): string {
  const profileLabel =
    request.userType === 'externo'
      ? `usuario externo del segmento "${request.segment}"`
      : `empleado interno con rol "${request.segment}"`

  return `Eres un experto en UX research simulando feedback de usuarios reales.

Contexto del diseño:
${request.figmaContext}

Se te pide simular el feedback de ${request.userCount} usuarios diferentes, cada uno siendo ${profileLabel} de BCP (Banco de Crédito del Perú).

Solicitud del diseñador: ${request.prompt}

Para cada usuario sintético responde con el siguiente JSON (sin texto adicional):
{
  "users": [
    {
      "userNumber": 1,
      "profile": "descripción breve del perfil de este usuario (edad, contexto, familiaridad con apps)",
      "feedback": "feedback honesto y natural de este usuario sobre el diseño mostrado",
      "painPoints": ["punto de dolor 1", "punto de dolor 2"],
      "suggestions": ["sugerencia concreta 1", "sugerencia concreta 2"]
    }
  ]
}

Genera exactamente ${request.userCount} usuarios con perfiles diversos entre sí. El feedback debe ser realista, específico al diseño mostrado, y variado entre usuarios.`
}

// ── Llamada al LLM vía Groq API ──────────────────────────────────────────────

async function callLLM(prompt: string): Promise<SyntheticUser[]> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer YOUR_GROQ_API_KEY`, // reemplazar con tu API key de Groq
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile', // modelo recomendado en Groq para calidad/velocidad
      max_tokens: 4096,
      temperature: 0.8, // algo de variabilidad para que los usuarios sintéticos sean diversos
      messages: [
        {
          role: 'system',
          content: 'Eres un experto en UX research. Responde ÚNICAMENTE con JSON válido, sin texto adicional, sin bloques de código markdown.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Error al contactar Groq (${response.status}): ${errorBody}`)
  }

  const data = await response.json()
  const text = data.choices?.[0]?.message?.content ?? ''

  try {
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    return parsed.users as SyntheticUser[]
  } catch {
    throw new Error('No se pudo procesar la respuesta del servicio de IA')
  }
}

// ── Función principal ─────────────────────────────────────────────────────────

export async function requestUsersFeedback(
  request: UsersRequest,
  onProgress?: ProgressCallback
): Promise<UsersReport> {
  onProgress?.('Preparando contexto del diseño…', 15)

  const prompt = buildPrompt(request)

  onProgress?.('Generando usuarios sintéticos…', 35)

  const users = await callLLM(prompt)

  onProgress?.('Procesando respuestas…', 90)

  return {
    evaluatedAt: new Date().toISOString(),
    userType: request.userType,
    segment: request.segment,
    prompt: request.prompt,
    userCount: request.userCount,
    users,
  }
}
