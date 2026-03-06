---
phase: 1
slug: tracking-module-en-designer-buddy
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-06
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | TypeScript compiler (`tsc --noEmit`) + manual Figma plugin runtime testing |
| **Config file** | `tsconfig.json` (root) |
| **Quick run command** | `npx tsc --noEmit` |
| **Full suite command** | `npm run build` |
| **Estimated runtime** | ~10 seconds |

No automated test framework (Jest, Vitest) is configured. Validation is via TypeScript compilation (catches type errors) and manual runtime testing in Figma.

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit`
- **After every plan wave:** Run `npm run build`
- **Before `/gsd:verify-work`:** `npm run build` must succeed + manual runtime test in Figma dev mode confirms silent failure on empty URL
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 0 | TRACK-01 | TypeScript compile | `npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 0 | OPS-02 | TypeScript compile | `npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 1-01-03 | 01 | 0 | TRACK-06 | TypeScript compile | `npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 1-01-04 | 01 | 1 | TRACK-01, TRACK-02 | TypeScript compile | `npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 1-01-05 | 01 | 1 | TRACK-02 | Manual | Load plugin in Figma dev mode; verify score appears immediately | N/A | ⬜ pending |
| 1-01-06 | 01 | 1 | TRACK-03 | Manual | Set URL=''; run evaluation; verify no error UI appears | N/A | ⬜ pending |
| 1-01-07 | 01 | 1 | TRACK-04 | Manual | Log payload; verify userName field not 'Unknown' for logged-in user | N/A | ⬜ pending |
| 1-01-08 | 01 | 1 | TRACK-05 | Manual | Log payload; verify fileId matches Figma file URL key | N/A | ⬜ pending |
| 1-01-09 | 01 | 1 | OPS-01 | Manual review | Review RUNBOOK.md before marking phase done | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/types/tracking.ts` — defines `TrackingEvent` interface (TRACK-01)
- [ ] `src/modules/tracking/index.ts` — `buildPayload`, `fireAndForget`, `TRACKING_ENDPOINT_URL` (TRACK-02, TRACK-03, OPS-02)
- [ ] `manifest.json` — add `permissions`, `enablePrivatePluginApi`, `allowedDomains` update (TRACK-04, TRACK-05, TRACK-06)
- [ ] `src/messageRouter.ts` — import and call tracking after `evaluateCurrentPage()` (TRACK-01, TRACK-02)
- [ ] `RUNBOOK.md` — operational documentation for BCP team (OPS-01)

No test framework installation needed — TypeScript + Vite build serve as compile-time validation.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `fireAndForget` does not block caller | TRACK-02 | Runtime async behavior, not detectable by tsc | Load plugin in Figma dev mode; run evaluation; verify result UI appears immediately |
| Empty URL causes silent failure | TRACK-03 | Runtime network behavior | Set `TRACKING_ENDPOINT_URL = ''`; run evaluation; verify no error UI or console error appears to designer |
| `userName` populated from `figma.currentUser` | TRACK-04 | Figma runtime API, not detectable by tsc | Log payload in dev console; verify userName field is not 'Unknown' for logged-in user |
| `fileId` populated from `figma.fileKey` | TRACK-05 | Figma runtime API, not detectable by tsc | Log payload in dev console; verify fileId matches file URL key |
| Designer sees no UI change | UI contract | Visual regression, not automated | Run full evaluation flow; verify UI is identical to pre-phase behavior |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
