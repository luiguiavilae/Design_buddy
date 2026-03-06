export interface EvaluationRow {
  fileId: string
  fileName: string
  pageName: string
  userName: string
  overallScore: number   // always parseInt'd before storing
  timestamp: string      // ISO 8601
}

export type AnalyticsState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'empty' }
  | { status: 'data'; rows: EvaluationRow[] }

export type SandboxToUI =
  | { type: 'ANALYTICS_LOADING' }
  | { type: 'ANALYTICS_RESULT'; data: EvaluationRow[] }
  | { type: 'ANALYTICS_ERROR'; message: string }

export type UIToSandbox = never  // no messages from UI in Phase 2
