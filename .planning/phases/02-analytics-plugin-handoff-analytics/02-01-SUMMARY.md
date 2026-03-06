---
phase: 02-analytics-plugin-handoff-analytics
plan: "01"
subsystem: ui
tags: [figma-plugin, react, typescript, vite, analytics, mock-data]

# Dependency graph
requires:
  - phase: 01-tracking-module-en-designer-buddy
    provides: tracking postMessage pattern, vite.config.ts build pattern, inlinePlugin with arrow-function replacers

provides:
  - analytics-plugin/ standalone Figma plugin with full project scaffold
  - EvaluationRow, AnalyticsState, SandboxToUI TypeScript types
  - 10-row BCP mock dataset with realistic Spanish designer names and scores
  - postMessage loading/data/error flow from sandbox to UI
  - fetchEvaluations() for real Power Automate endpoint (USE_MOCK flag)
  - Stub App.tsx rendering raw JSON state (to be replaced by dashboard in 02-02)

affects: [02-02-analytics-dashboard, dashboard-ui]

# Tech tracking
tech-stack:
  added: [analytics-plugin own node_modules, @figma/plugin-typings, @vitejs/plugin-react, vite 5, react 18]
  patterns:
    - inlinePlugin closeBundle pattern (identical to Designer Buddy) — reads src/ui/index.html, injects dist/ui.js into <!-- INJECT_SCRIPT -->, writes dist/ui.html
    - Arrow-function replacers in String.replace() to avoid $& React bug
    - es2015 vite build target for QuickJS sandbox compatibility
    - USE_MOCK flag with setTimeout(1000) for deterministic development testing
    - parseInt for overallScore on all ingestion paths (mock typed as number, real endpoint uses parseInt)

key-files:
  created:
    - analytics-plugin/manifest.json
    - analytics-plugin/package.json
    - analytics-plugin/tsconfig.json
    - analytics-plugin/vite.config.ts
    - analytics-plugin/src/types/analytics.ts
    - analytics-plugin/src/main.ts
    - analytics-plugin/src/ui/index.html
    - analytics-plugin/src/ui/main.tsx
    - analytics-plugin/src/ui/App.tsx
  modified: []

key-decisions:
  - "analytics-plugin/ is fully self-contained with its own node_modules — no imports from parent project"
  - "USE_MOCK = true with 1-second setTimeout simulates loading state; switch to false + PA URL for real endpoint"
  - "fetchEvaluations accepts json.value array fallback for Power Automate OData response format"
  - "Stub App.tsx renders raw JSON — full dashboard UI deferred to Plan 02-02"
  - "overallScore typed as number in mock (literals), parseInt used only in fetchEvaluations for real endpoint"

patterns-established:
  - "Standalone analytics-plugin mirrors Designer Buddy build pattern exactly — verified working"
  - "SandboxToUI union type constrains all postMessage types at compile time"

requirements-completed: [DATA-01, DATA-02, DATA-03, DATA-04, DATA-05]

# Metrics
duration: 15min
completed: 2026-03-06
---

# Phase 2 Plan 01: Analytics Plugin Scaffold + Data Layer Summary

**Standalone Figma plugin analytics-plugin/ with React 18 + Vite 5 scaffold, 10-row BCP mock dataset, and postMessage loading/data/error state machine wired end to end**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-06T14:43:00Z
- **Completed:** 2026-03-06T14:59:46Z
- **Tasks:** 1 (scaffold + data layer as single atomic commit)
- **Files modified:** 10 created

## Accomplishments

- Full analytics-plugin/ scaffold with manifest, package.json, tsconfig, vite.config.ts — mirrors Designer Buddy build pattern exactly
- EvaluationRow / AnalyticsState / SandboxToUI TypeScript types defined
- 10-row BCP mock dataset with 4 designers (Andrea Torres, Carlos Mendoza, Lucia Quispe, Diego Vargas), scores across all bands (45–95), timestamps across last 4 weeks
- postMessage state machine: ANALYTICS_LOADING → (1s delay) → ANALYTICS_RESULT with 10 rows
- fetchEvaluations() ready for real PA endpoint; handles OData json.value fallback, parseInt for overallScore, ANALYTICS_ERROR on failure
- Build exits 0; dist/main.js (1.62 kB) and dist/ui.html (142 kB) generated successfully

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold + data layer** - `40d5a94` (feat)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified

- `analytics-plugin/manifest.json` — Figma plugin manifest (Handoff Analytics, *.api.powerplatform.com, currentuser permission)
- `analytics-plugin/package.json` — Same deps as Designer Buddy; scripts: dev, build, typecheck
- `analytics-plugin/tsconfig.json` — lib ES2020 + DOM, target ES2017, typeRoots pointing to @figma/plugin-typings
- `analytics-plugin/vite.config.ts` — Exact copy of Designer Buddy pattern: es2015 target, inlinePlugin with arrow-function replacers
- `analytics-plugin/src/types/analytics.ts` — EvaluationRow, AnalyticsState, SandboxToUI, UIToSandbox types
- `analytics-plugin/src/main.ts` — Plugin sandbox entry: USE_MOCK flag, 10-row MOCK_DATA, fetchEvaluations for real endpoint
- `analytics-plugin/src/ui/index.html` — HTML template with <!-- INJECT_SCRIPT --> placeholder
- `analytics-plugin/src/ui/main.tsx` — React 18 StrictMode createRoot entry
- `analytics-plugin/src/ui/App.tsx` — Stub: renders raw JSON of AnalyticsState (dashboard deferred to 02-02)

## Decisions Made

- analytics-plugin/ is fully self-contained — own node_modules, no imports from parent project
- USE_MOCK = true + setTimeout(1000) for development; switching to false + real PA URL for production
- fetchEvaluations handles `json.value` fallback for Power Automate OData response format
- overallScore stored as numeric literal in mock; parseInt used in fetchEvaluations for real endpoint data
- Stub App.tsx renders raw JSON to verify end-to-end wiring before building the dashboard in Plan 02-02

## Deviations from Plan

None — plan executed exactly as written. The plan specified one logical task (full scaffold + data layer) and it was implemented as a single atomic commit.

## Issues Encountered

`npx tsc --noEmit` reports `figma` and `__html__` as unknown names — same pre-existing condition in parent Designer Buddy project. Vite build succeeds because it uses skipLibCheck and resolves @figma/plugin-typings through the typeRoots config. Not a regression introduced by this plan.

## User Setup Required

None — no external service configuration required for the scaffold. Real endpoint wiring documented in USE_MOCK flag comment inside src/main.ts.

## Next Phase Readiness

- analytics-plugin/ builds and loads cleanly in Figma with mock data
- Plan 02-02 can replace App.tsx stub with the full dashboard UI (KPI cards, table, filters)
- Real endpoint: set USE_MOCK = false and paste PA Reader URL in ANALYTICS_READ_URL in src/main.ts

## Self-Check

- [x] analytics-plugin/dist/main.js exists
- [x] analytics-plugin/dist/ui.html exists
- [x] Commit 40d5a94 exists
- [x] All 9 source files created

## Self-Check: PASSED

---
*Phase: 02-analytics-plugin-handoff-analytics*
*Completed: 2026-03-06*
