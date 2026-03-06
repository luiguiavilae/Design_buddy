---
phase: 01-tracking-module-en-designer-buddy
plan: 01
subsystem: tracking
tags: [figma-plugin, power-automate, fetch, typescript, silent-tracking]

# Dependency graph
requires: []
provides:
  - TrackingEvent interface with 6 fields (fileId, fileName, pageName, userName, overallScore, timestamp)
  - buildPayload() — maps EvaluationReport + Figma API values to TrackingEvent
  - fireAndForget() — fire-and-forget POST using native fetch, QuickJS-safe
  - TRACKING_ENDPOINT_URL constant (empty, ready for Power Automate URL)
  - Tracking wired into HANDOFF_START_EVALUATION, fires after result is sent to UI
  - manifest.json updated with currentuser permission, enablePrivatePluginApi, *.api.powerplatform.com
affects:
  - 02-analytics-dashboard
  - any phase needing figma.currentUser or figma.fileKey context

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "fire-and-forget pattern: void function calling fetch().catch() without await, never blocking UI"
    - "QuickJS-safe fetch: plain object headers, string URL, no Headers/URL constructors"
    - "Post-result tracking order: send result to UI first, then fire tracking"

key-files:
  created:
    - src/types/tracking.ts
    - src/modules/tracking/index.ts
  modified:
    - src/messageRouter.ts
    - manifest.json

key-decisions:
  - "timestamp field uses report.evaluatedAt (NOT new Date()) — ensures timestamp matches the evaluation, not the tracking call"
  - "Error suppression uses .catch(err => console.debug('[Tracking]', err)) not .catch(() => {}) — devs can see tracking failures in plugin console"
  - "Plain object for fetch headers (not new Headers()) — QuickJS in Figma sandbox does not support Headers constructor"
  - "TRACKING_ENDPOINT_URL defaults to empty string — silent no-op in development, no visible error to designers"
  - "*.api.powerplatform.com in allowedDomains (not *.logic.azure.com — retired November 30, 2025)"
  - "enablePrivatePluginApi: true required for figma.fileKey; permissions: currentuser required for figma.currentUser"

patterns-established:
  - "Fire-and-forget tracking: call after send() to UI, never await, catch all errors silently to debug console"
  - "QuickJS-safe async: avoid Headers constructor, URL constructor, and any ES2020+ syntax in plugin sandbox code"

requirements-completed: [TRACK-01, TRACK-02, TRACK-03, TRACK-04, TRACK-05, TRACK-06, OPS-02]

# Metrics
duration: 2min
completed: 2026-03-06
---

# Phase 1 Plan 1: Silent tracking module with fire-and-forget POST to Power Automate Summary

**Silent handoff evaluation tracking using fire-and-forget fetch() to Power Automate, with QuickJS-safe implementation and manifest permissions for figma.currentUser and figma.fileKey**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-06T14:08:23Z
- **Completed:** 2026-03-06T14:10:10Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created TrackingEvent type with 6 fields and tracking module with buildPayload/fireAndForget/TRACKING_ENDPOINT_URL
- Wired tracking into HANDOFF_START_EVALUATION after the result is sent to the UI (non-blocking)
- Updated manifest.json with the three required fields: permissions, enablePrivatePluginApi, and *.api.powerplatform.com domain

## Task Commits

Each task was committed atomically:

1. **Task 1: Create TrackingEvent type and tracking module** - `3c66ac9` (feat)
2. **Task 2: Wire tracking into messageRouter and update manifest** - `587d2d6` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `src/types/tracking.ts` - TrackingEvent interface with 6 typed fields
- `src/modules/tracking/index.ts` - TRACKING_ENDPOINT_URL constant, buildPayload(), fireAndForget()
- `src/messageRouter.ts` - Added tracking import and wired tracking call after HANDOFF_RESULT
- `manifest.json` - Added permissions, enablePrivatePluginApi, *.api.powerplatform.com domain

## Decisions Made
- `timestamp` uses `report.evaluatedAt` not `new Date()` — ensures timestamp precision matches evaluation time
- Error handler uses `console.debug` not silent catch — developers can observe tracking failures without designers seeing them
- Headers passed as plain object (`{ 'Content-Type': 'application/json' }`) — Figma QuickJS sandbox has no `Headers` constructor
- `TRACKING_ENDPOINT_URL = ''` — empty string is safe for development; fetch fails silently with no visible impact

## Deviations from Plan

None - plan executed exactly as written.

The `npx tsc --noEmit` command in the plan's verify steps produces pre-existing errors unrelated to this plan's changes (all `figma.*` global type errors existed before this plan). Vite build succeeds cleanly with 61 modules transformed.

## Issues Encountered
- `npx tsc --noEmit` has 100+ pre-existing type errors from `figma.*` globals not being found via standalone tsc (the `typeRoots` config in tsconfig.json doesn't work with standalone tsc but Vite resolves Figma typings correctly at build time). This is a pre-existing issue, not introduced by this plan.

## User Setup Required
**External service requires manual configuration before tracking data flows:**
- Set `TRACKING_ENDPOINT_URL` in `src/modules/tracking/index.ts` to the Power Automate HTTP trigger URL
- See the Power Automate setup guide (RUNBOOK.md, to be created in Phase 2) for step-by-step instructions
- During development, leaving the URL empty results in silent no-op (no errors shown to designers)

## Next Phase Readiness
- Tracking data foundation is complete — every handoff evaluation will fire a TrackingEvent to the configured endpoint
- Phase 2 (Analytics Dashboard) can consume tracking data as soon as the Power Automate → Excel Online pipeline is configured
- No blockers

---
*Phase: 01-tracking-module-en-designer-buddy*
*Completed: 2026-03-06*
