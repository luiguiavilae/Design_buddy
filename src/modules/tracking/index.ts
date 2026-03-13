import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../../config/tracking'
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

export function fireAndForget(payload: TrackingEvent): void {
  if (SUPABASE_URL === 'REPLACE_ME') return

  const body = JSON.stringify({
    file_id:       payload.fileId,
    file_name:     payload.fileName,
    user_name:     payload.userName,
    timestamp:     payload.timestamp,
    overall_score: payload.overallScore,
  })

  // Intentionally not awaited — tracking never blocks the caller.
  fetch(`${SUPABASE_URL}/rest/v1/evaluations`, {
    method:  'POST',
    headers: {
      'apikey':        SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type':  'application/json',
      'Prefer':        'return=minimal',
    },
    body,
  }).catch(err => console.debug('[Tracking]', err))
  // console.debug is visible to devs in plugin console; invisible to designers.
}
