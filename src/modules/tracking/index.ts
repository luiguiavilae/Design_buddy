// Configure this constant with your Power Automate HTTP trigger URL before deploying.
// See RUNBOOK.md for step-by-step setup instructions.
// Leave empty ('') during development — fetch will fail silently without impacting users.
export const TRACKING_ENDPOINT_URL = ''

import type { EvaluationReport } from '../../types/handoff'
import type { TrackingEvent } from '../../types/tracking'

export function buildPayload(
  report: EvaluationReport,
  fileKey: string | null | undefined,
  userName: string | null | undefined,
): TrackingEvent {
  return {
    fileId:       fileKey ?? (figma.root.name + '_local'),
    fileName:     report.fileName,
    pageName:     report.pageName,
    userName:     userName ?? 'Unknown',
    overallScore: report.overallScore,
    timestamp:    report.evaluatedAt,
  }
}

export function fireAndForget(url: string, payload: TrackingEvent): void {
  // Intentionally not awaited — tracking never blocks the caller.
  fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },   // plain object — QuickJS has no Headers constructor
    body:    JSON.stringify(payload),
  }).catch(err => console.debug('[Tracking]', err))
  // console.debug is visible to devs in plugin console; invisible to designers.
  // An empty url or unreachable endpoint is silently caught here.
}
