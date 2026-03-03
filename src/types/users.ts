// ─── Users module types ───────────────────────────────────────────────────────

export type UserType = 'interno' | 'externo'

// ── Segmentos para usuarios externos ─────────────────────────────────────────
export const EXTERNAL_SEGMENTS = [
  'Cliente Persona Natural',
  'Cliente Persona Jurídica',
  'Cliente PYME',
  'Cliente Premium',
  'Cliente Nuevo',
] as const

export type ExternalSegment = (typeof EXTERNAL_SEGMENTS)[number]

// ── Roles para usuarios internos ──────────────────────────────────────────────
export const INTERNAL_ROLES = [
  'Asesor de Ventas',
  'Asesor de Servicio',
  'Analista',
  'Gerente de Agencia',
  'Gestor de Cobranza',
  'Especialista de Producto',
] as const

export type InternalRole = (typeof INTERNAL_ROLES)[number]

export interface SyntheticUser {
  userNumber: number
  profile: string
  feedback: string
  painPoints: string[]
  suggestions: string[]
}

export interface UsersReport {
  evaluatedAt: string
  userType: UserType
  segment: string
  prompt: string
  userCount: number
  users: SyntheticUser[]
}

// ── Request payload para el LLM ───────────────────────────────────────────────
export interface UsersRequest {
  userType: UserType
  segment: string
  prompt: string
  userCount: number
  figmaContext: string // descripción textual del frame seleccionado
}
