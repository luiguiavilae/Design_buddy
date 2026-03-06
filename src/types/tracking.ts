export interface TrackingEvent {
  fileId:       string   // figma.fileKey ?? figma.root.name + '_local'
  fileName:     string   // from EvaluationReport
  pageName:     string   // from EvaluationReport
  userName:     string   // figma.currentUser?.name ?? 'Unknown'
  overallScore: number   // integer 0-100 from EvaluationReport
  timestamp:    string   // ISO 8601 from report.evaluatedAt (NOT new Date() — locked decision)
}
