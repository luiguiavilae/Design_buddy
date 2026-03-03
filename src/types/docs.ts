// ─── Docs module types (migrated from Plugin_generador_handoff) ──────────────

export interface Section {
  id: string
  name: string
  isRequired: boolean
  order: number
}

export interface Page {
  id: string
  name: string
  isRequired: boolean
  isEnabled: boolean
  isDevicePage?: boolean
  separatorBefore?: boolean
  subPages?: string[]
  sections: Section[]
  order: number
}

export interface ProjectConfig {
  projectName: string
  projectType?: string
  pages: Page[]
  createdAt: string
}

export const PROJECT_TYPES = [
  'Mobile App',
  'Web App',
  'Dashboard',
  'Landing Page',
  'Design System',
  'Otro',
] as const

export type ProjectType = (typeof PROJECT_TYPES)[number]
