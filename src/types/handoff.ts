// ─── Handoff module types (migrated from Evaluador_handoff) ──────────────────

export type Status = 'pass' | 'warn' | 'fail' | 'info'

export interface Finding {
  nodeId: string
  nodeName: string
  message: string
  action: string
  status: Status
}

export interface CriterionResult {
  id: number
  title: string
  weight: 'Alto' | 'Medio' | 'Bajo'
  status: Status
  score: number
  totalChecked: number
  passingCount: number
  findings: Finding[]
  summary: string
}

export interface EvaluationReport {
  pluginVersion: string
  pageName: string
  fileName: string
  evaluatedAt: string
  totalFrames: number
  overallScore: number
  criteria: CriterionResult[]
}

export interface FrameScanData {
  id: string
  name: string
  layoutMode: 'NONE' | 'HORIZONTAL' | 'VERTICAL' | 'GRID'
}

export interface SectionScanData {
  id: string
  name: string
}

export interface CoverPageData {
  pageName: string
  frameId: string
  frameName: string
  textContents: string[]
  instanceNames: string[]
}

export interface ScanResult {
  fileName: string
  pageName: string
  pageId: string
  topLevelFrames: FrameScanData[]
  topLevelNames: string[]
  sections: SectionScanData[]
  connectorCount: number
  coverPageData: CoverPageData | null
  allPagesNames: string[]
  pageCount: number
}
