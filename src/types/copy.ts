// ─── Copy module types ────────────────────────────────────────────────────────

export type CopyIssueType =
  | 'ortografia'
  | 'semantica'
  | 'tono'
  | 'optimizacion'
  | 'redundancia'
  | 'tecnicismo'
  | 'consistencia'
  | 'voz_marca'

export interface CopyIssue {
  nodeId: string
  originalText: string
  issueType: CopyIssueType
  description: string
  suggestion: string
}

export interface FrameCopyResult {
  frameId: string
  frameName: string
  issues: CopyIssue[]
  textCount: number
}

export interface CopyReport {
  evaluatedAt: string
  frameCount: number
  totalTexts: number
  totalIssues: number
  frames: FrameCopyResult[]
}
