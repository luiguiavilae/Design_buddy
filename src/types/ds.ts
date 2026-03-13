// ─── Design System audit types ────────────────────────────────────────────────

export type DSIssueType =
  | 'broken_component'    // mainComponent === null
  | 'local_component'     // mainComponent.remote === false
  | 'detached_component'  // FRAME con nombre "Familia/Variante" — probable instancia desvinculada
  | 'hardcoded_fill'      // fills sin fillStyleId
  | 'hardcoded_text'      // TEXT sin textStyleId
  | 'visual_override'     // instancia con fills/strokes/effects sobreescritos

export interface DSIssue {
  nodeId: string
  nodeName: string
  nodeType: string
  issueType: DSIssueType
  description: string
  suggestion: string
}

export interface FrameDSResult {
  frameId: string
  frameName: string
  issues: DSIssue[]
  scannedNodes: number
}

export interface DSReport {
  evaluatedAt: string
  frameCount: number
  totalScanned: number
  totalIssues: number
  frames: FrameDSResult[]
}
