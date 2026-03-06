---
phase: 01-tracking-module-en-designer-buddy
plan: 02
subsystem: infra
tags: [power-automate, excel, runbook, operations, cors, figma]

# Dependency graph
requires:
  - phase: 01-tracking-module-en-designer-buddy
    plan: 01
    provides: "Silent tracking module with TRACKING_ENDPOINT_URL constant wired into plugin"
provides:
  - "RUNBOOK.md operational guide enabling BCP team to configure Power Automate and Excel end-to-end"
  - "Step-by-step PA flow creation with JSON schema, CORS header, and Excel column mapping"
  - "Heartbeat plan and URL rotation procedure for ongoing maintenance"
  - "Troubleshooting table covering 5 known failure modes"
affects: [phase-2, operations, bcp-team-handoff]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "RUNBOOK-first ops handoff: all external service setup documented before any activation"
    - "CORS header in PA Response action required for Figma iframe fetch to succeed"

key-files:
  created:
    - RUNBOOK.md
  modified: []

key-decisions:
  - "RUNBOOK stored at repo root for maximum discoverability by new team members"
  - "PA JSON schema included verbatim so BCP can paste directly without transcription errors"
  - "CORS Access-Control-Allow-Origin: * documented as mandatory (not optional) — plugin fetch fails without it"
  - "timestamp stored as Text/ISO 8601 string, not Excel date — avoids timezone conversion bugs"
  - "URL rotation procedure explicitly warns against committing PA trigger URL to git"
  - "30-day heartbeat cadence chosen based on PA 90-day auto-disable threshold with 3x safety margin"

patterns-established:
  - "Ops docs: include exact JSON schema as copyable block, not prose description"
  - "Ops docs: name the responsible owner role (not person) for recurring tasks"

requirements-completed: [OPS-01]

# Metrics
duration: 15min
completed: 2026-03-06
---

# Phase 1 Plan 02: RUNBOOK.md Summary

**RUNBOOK.md covering Power Automate Tracking Writer flow setup with Excel EvaluationsTable, CORS configuration, heartbeat cadence, and URL rotation procedure for BCP team self-service activation**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-06T00:00:00Z
- **Completed:** 2026-03-06T00:15:00Z
- **Tasks:** 2 (1 auto + 1 human-verify checkpoint)
- **Files modified:** 1

## Accomplishments

- Created RUNBOOK.md (299 lines) covering all 9 required operational areas
- PA JSON schema and example payload included verbatim for copy-paste use by BCP
- CORS requirement documented as mandatory step with explicit consequence if omitted
- Heartbeat plan assigns a named owner role and 30-day check cadence
- Troubleshooting table covers 5 known failure modes identified in RESEARCH.md
- Human reviewer approved RUNBOOK as complete and actionable

## Task Commits

Each task was committed atomically:

1. **Task 1: Write RUNBOOK.md** - `335837c` (feat)
2. **Task 2: Human review of RUNBOOK completeness** - checkpoint approved (no commit — verification only)

## Files Created/Modified

- `RUNBOOK.md` — Operational guide for BCP team: PA flow setup, Excel table schema, plugin configuration, heartbeat plan, URL rotation, and troubleshooting quick reference

## Decisions Made

- RUNBOOK placed at repo root for maximum discoverability — first file a new team member finds
- PA JSON schema pasted verbatim so BCP can copy directly into the PA trigger configuration without risk of transcription error
- CORS header documented as mandatory with explicit consequence (plugin fetch fails silently) — not optional
- `timestamp` stored as ISO 8601 text string to avoid Excel date/timezone conversion issues
- 30-day heartbeat cadence provides 3x safety margin before PA 90-day auto-disable threshold
- URL rotation procedure explicitly prohibits committing PA trigger URL to git or sharing in public channels

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

**This entire plan IS the user setup documentation.** RUNBOOK.md must be followed by a BCP team member before the tracking system becomes operational. Key steps:

1. Create Excel workbook with `EvaluationsTable` (6 columns in exact order)
2. Create PA HTTP trigger flow with JSON schema and CORS response header
3. Copy PA trigger URL into `TRACKING_ENDPOINT_URL` in `src/modules/tracking/index.ts`
4. Rebuild plugin and redistribute binaries
5. Run a test evaluation and verify row appears in Excel within 30 seconds

## Next Phase Readiness

- Phase 1 is fully complete: tracking module is coded (01-01) and operational guide is written (01-02)
- BCP team can now activate the tracking system independently using RUNBOOK.md
- Phase 2 (Analytics dashboard) can proceed — it will read from the same EvaluationsTable that RUNBOOK configures
- No blockers for Phase 2

---
*Phase: 01-tracking-module-en-designer-buddy*
*Completed: 2026-03-06*
