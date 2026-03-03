// ─── Unified message protocol UI ↔ Plugin ────────────────────────────────────
import type { ProjectConfig } from './docs'
import type { EvaluationReport } from './handoff'
import type { CopyReport } from './copy'
import type { UsersReport, UsersRequest } from './users'

// ── UI → Plugin ───────────────────────────────────────────────────────────────
export type UIMessage =
  // Docs
  | { type: 'DOCS_GET_FILE_INFO' }
  | { type: 'DOCS_BUILD_PROJECT'; payload: ProjectConfig }
  // Handoff
  | { type: 'HANDOFF_START_EVALUATION' }
  | { type: 'HANDOFF_NAVIGATE_TO_NODE'; nodeId: string }
  // Copy
  | { type: 'COPY_START_EVALUATION' }
  // Users
  | { type: 'USERS_GET_CONTEXT' }
  | { type: 'USERS_REQUEST_FEEDBACK'; payload: UsersRequest }
  // General
  | { type: 'CLOSE' }

// ── Plugin → UI ───────────────────────────────────────────────────────────────
export type PluginMessage =
  // Docs
  | { type: 'DOCS_FILE_INFO'; payload: { fileName: string } }
  | { type: 'DOCS_BUILD_SUCCESS' }
  | { type: 'DOCS_BUILD_ERROR'; payload: { message: string } }
  // Handoff
  | { type: 'HANDOFF_PROGRESS'; step: string; percent: number }
  | { type: 'HANDOFF_RESULT'; report: EvaluationReport }
  | { type: 'HANDOFF_ERROR'; error: string }
  // Copy
  | { type: 'COPY_PROGRESS'; step: string; percent: number }
  | { type: 'COPY_RESULT'; report: CopyReport }
  | { type: 'COPY_ERROR'; error: string }
  // Users
  | { type: 'USERS_CONTEXT'; payload: { frameDescription: string; hasSelection: boolean } }
  | { type: 'USERS_RESULT'; report: UsersReport }
  | { type: 'USERS_ERROR'; error: string }
  | { type: 'USERS_PROGRESS'; step: string; percent: number }
