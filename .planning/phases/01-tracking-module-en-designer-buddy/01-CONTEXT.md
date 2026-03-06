# Phase 1: Tracking Module en Designer Buddy - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Insert a silent tracking module into Designer Buddy. After each handoff evaluation completes, fire a POST request to Power Automate with the evaluation data. The designer sees no UI changes and no errors — tracking is fully invisible to end users.

</domain>

<decisions>
## Implementation Decisions

### Timestamp field
- Use `report.evaluatedAt` (already set by the evaluator when the analysis ran)
- Semantically correct: tracks when the evaluation happened, not when the network call fired

### Error suppression style
- Use `.catch(err => console.debug('[Tracking]', err))` — NOT fully silent
- Errors appear only in the plugin developer console, invisible to designers
- Enables developers to diagnose issues during setup and heartbeat checks

### Power Automate domain
- Use `*.api.powerplatform.com` wildcard in `allowedDomains`
- Works regardless of BCP tenant region; covers all PA flow URLs

### Claude's Discretion
- RUNBOOK structure, format, and section ordering
- Exact wording of placeholder comments for `TRACKING_ENDPOINT_URL`
- Module file structure within `src/modules/tracking/`

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `EvaluationReport` (src/types/handoff.ts): has `pageName`, `fileName`, `evaluatedAt`, `overallScore` — most payload fields come directly from this type
- `src/messageRouter.ts`: integration point is `case 'HANDOFF_START_EVALUATION'` — after `const report = await evaluateCurrentPage(...)`, before `send({ type: 'HANDOFF_RESULT', report })`

### Established Patterns
- Module pattern: flat single file per module (e.g., `src/modules/handoff/evaluator/index.ts`) — tracking follows same pattern as `src/modules/tracking/index.ts`
- No `new Headers()` in QuickJS: use plain object `{ 'Content-Type': 'application/json' }` for fetch headers
- QuickJS target: `build.target: 'es2015'` in vite.config.ts already handles transpilation

### Integration Points
- `src/messageRouter.ts` — import `buildPayload` and `fireAndForget` from tracking module; call after `evaluateCurrentPage()` resolves
- `manifest.json` — add `currentuser` to `permissions`, add `enablePrivatePluginApi: true`, add `*.api.powerplatform.com` to `allowedDomains`
- Figma API nullability: `figma.currentUser?.name ?? 'Unknown'`, `figma.fileKey ?? figma.root.name + '_local'`

</code_context>

<specifics>
## Specific Ideas

- `TRACKING_ENDPOINT_URL` is an empty string constant with a comment explaining how to configure it when the Power Automate flow is ready
- `fireAndForget` must never `await` — call it without await so it never blocks the caller
- The `body` of the fetch must be `JSON.stringify(payload)` as a string (QuickJS constraint)
- `figma.fileKey` can be null in local files — fallback to `figma.root.name + '_local'`

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-tracking-module-en-designer-buddy*
*Context gathered: 2026-03-06*
