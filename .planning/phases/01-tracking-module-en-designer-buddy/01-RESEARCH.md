# Phase 1: Tracking Module en Designer Buddy - Research

**Researched:** 2026-03-06
**Domain:** Figma Plugin Sandbox — fire-and-forget fetch to Power Automate HTTP trigger
**Confidence:** HIGH — all critical behaviors verified against official Figma docs and confirmed by existing project research. No new technologies introduced.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Timestamp field:** Use `report.evaluatedAt` (already set by the evaluator when the analysis ran). Semantically correct: tracks when the evaluation happened, not when the network call fired.
- **Error suppression style:** Use `.catch(err => console.debug('[Tracking]', err))` — NOT fully silent. Errors appear only in the plugin developer console, invisible to designers. Enables developers to diagnose issues during setup and heartbeat checks.
- **Power Automate domain:** Use `*.api.powerplatform.com` wildcard in `allowedDomains`. Works regardless of BCP tenant region; covers all PA flow URLs.

### Claude's Discretion

- RUNBOOK structure, format, and section ordering
- Exact wording of placeholder comments for `TRACKING_ENDPOINT_URL`
- Module file structure within `src/modules/tracking/`

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TRACK-01 | Al terminar una evaluacion de handoff, se registra automaticamente un evento con fileId, fileName, pageName, userName, overallScore y timestamp | `EvaluationReport` already carries `pageName`, `fileName`, `evaluatedAt`, `overallScore`. `buildPayload()` reads from this struct plus `figma.fileKey` and `figma.currentUser?.name`. |
| TRACK-02 | El tracking no bloquea ni retrasa el flujo del disenador (fire-and-forget puro) | `fireAndForget()` calls `fetch()` without `await` and returns `void`. The caller in `messageRouter.ts` calls it after `send({ type: 'HANDOFF_RESULT' })` so the designer sees the result immediately regardless of network latency. |
| TRACK-03 | Si el tracking falla (red, CORS, endpoint no configurado), el plugin sigue funcionando sin errores visibles al usuario | `.catch(err => console.debug('[Tracking]', err))` — errors route to the developer console only. An empty `TRACKING_ENDPOINT_URL` causes a fetch failure that is silently caught. |
| TRACK-04 | El payload incluye `figma.currentUser.name` como userName (requiere permiso `currentuser` en manifest) | Requires `"permissions": ["currentuser"]` in `manifest.json`. Without it, `figma.currentUser` is `null`. Guard: `figma.currentUser?.name ?? 'Unknown'`. |
| TRACK-05 | El payload incluye `figma.fileKey` como fileId (requiere `enablePrivatePluginApi` en manifest) | Requires `"enablePrivatePluginApi": true` in `manifest.json`. Without it, `figma.fileKey` is always `undefined`. Fallback: `figma.fileKey ?? figma.root.name + '_local'`. |
| TRACK-06 | El manifest.json tiene `networkAccess.allowedDomains` con el dominio del endpoint de Power Automate | Add `"*.api.powerplatform.com"` to `allowedDomains`. The `*.logic.azure.com` domain is deprecated as of November 30, 2025. Figma blocks fetch() at the CSP layer for any unlisted domain. |
| OPS-01 | Existe un runbook de operaciones documentado para el equipo BCP | RUNBOOK.md covers: PA Writer flow creation, CORS header config in Response action, Excel EvaluationsTable setup, URL constant update instructions, 30-day heartbeat plan, URL rotation procedure. |
| OPS-02 | Las constantes `TRACKING_ENDPOINT_URL` estan en la parte superior de su archivo con comentario claro; no estan hardcodeadas en el repo publico | `TRACKING_ENDPOINT_URL = ''` as a module-level constant at the top of `src/modules/tracking/index.ts`. Empty string by default so fetch fails silently when not configured. Comment explains how to populate it. |
</phase_requirements>

---

## Summary

Phase 1 is a minimal, surgical modification of an existing working plugin. No new libraries, no new build infrastructure, no UI changes. The entire delivery is five files: two new TypeScript files, two modified files, and one documentation file.

The tracking fetch happens in the Figma plugin sandbox (`main.ts` / `messageRouter.ts`), not in the UI iframe. This is the safer and simpler context: the sandbox has a native `fetch()` that can POST to any domain listed in `manifest.json` without the null-origin CORS problem that affects the UI iframe. All project-specific QuickJS constraints (plain object headers, string body, `es2015` target) are already handled by the existing `vite.config.ts`.

The highest implementation risk is not in the TypeScript code but in the Power Automate side: the BCP team must create the PA Writer flow with a `Response` action that includes `Access-Control-Allow-Origin: *`, and must pre-create the Excel file with a named `EvaluationsTable` before the first tracking event is sent. The RUNBOOK.md is the deliverable that mitigates this risk.

**Primary recommendation:** Implement the five deliverables in order — type, module, router modification, manifest, RUNBOOK — and test `fireAndForget` with an empty URL before wiring any real endpoint.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.5.x (existing) | Type safety for `TrackingEvent` and `buildPayload` signature | Already configured; `@figma/plugin-typings` provides all Figma API types |
| Figma Plugin API `fetch()` | built-in | HTTP POST to Power Automate | Native to sandbox — no library needed. Already used by `modules/copy` for Groq calls |
| `@figma/plugin-typings` | 1.95.x (existing) | Types for `figma.currentUser`, `figma.fileKey`, `figma.root` | Required for TypeScript to typecheck Figma globals |
| Vite 5.3.x + `inlinePlugin` | existing | Build — no changes needed | The existing `vite.config.ts` handles `es2015` target and QuickJS constraints |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None new | — | — | Zero new dependencies for Phase 1 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native `fetch()` in sandbox | `axios`, `got`, `node-fetch` | No benefit in this context; adds bundle weight; Figma sandbox fetch covers all needs |
| Empty string `TRACKING_ENDPOINT_URL` as placeholder | Hardcoded real URL | Empty string fails silently (TRACK-03). Real URL must never be committed to the public repo (security). |
| `report.evaluatedAt` as timestamp | `new Date().toISOString()` at send time | `evaluatedAt` is semantically correct (when the evaluation ran, not when the network call fired). Locked decision. |

**Installation:** No new packages required. Phase 1 uses only existing dependencies.

---

## Architecture Patterns

### Recommended Project Structure

New and modified files only:

```
src/
├── types/
│   └── tracking.ts          ← NEW: TrackingEvent interface
├── modules/
│   └── tracking/
│       └── index.ts         ← NEW: buildPayload(), fireAndForget(), TRACKING_ENDPOINT_URL
├── messageRouter.ts         ← MODIFIED: import tracking, call after evaluateCurrentPage()
manifest.json                ← MODIFIED: permissions, enablePrivatePluginApi, allowedDomains
RUNBOOK.md                   ← NEW: operational runbook for BCP team
```

All existing files outside this list remain unchanged.

### Pattern 1: Module as Side-Effect Container

**What:** The tracking module is a self-contained side-effect. `messageRouter.ts` stays thin (it only orchestrates). The tracking module owns its own constant, its own payload construction, and its own error suppression.

**When to use:** Any telemetry or analytics event where failure must not degrade the main user flow.

**Example:**
```typescript
// src/modules/tracking/index.ts

import type { TrackingEvent } from '../../types/tracking'
import type { EvaluationReport } from '../../types/handoff'

// Configure this constant with the Power Automate HTTP trigger URL before deploying.
// See RUNBOOK.md for setup instructions.
// Leave empty ('') during development — fetch will fail silently with no impact on users.
export const TRACKING_ENDPOINT_URL = ''

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
  // Intentionally not awaited — caller is never blocked by tracking.
  fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  }).catch(err => console.debug('[Tracking]', err))
  // .catch uses console.debug so errors are visible to developers in the plugin console
  // but completely invisible to designers. An empty url or unreachable endpoint is caught here.
}
```

### Pattern 2: Integration Point in messageRouter.ts

**What:** The tracking call is placed after the `HANDOFF_RESULT` message is sent to the UI. The designer sees the score immediately. The tracking fetch runs as a non-blocking side effect.

**When to use:** Any case where a side effect must not gate the user-facing result.

**Example:**
```typescript
// src/messageRouter.ts — inside case 'HANDOFF_START_EVALUATION':
import { buildPayload, fireAndForget, TRACKING_ENDPOINT_URL } from './modules/tracking/index'

case 'HANDOFF_START_EVALUATION': {
  try {
    const report = await evaluateCurrentPage((step, percent) => {
      send({ type: 'HANDOFF_PROGRESS', step, percent })
    })
    // 1. Send result to UI first — designer sees score immediately
    send({ type: 'HANDOFF_RESULT', report })
    // 2. Track silently — never blocks, never surfaces errors to designer
    const payload = buildPayload(report, figma.fileKey, figma.currentUser?.name)
    fireAndForget(TRACKING_ENDPOINT_URL, payload)
  } catch (err) {
    send({
      type: 'HANDOFF_ERROR',
      error: err instanceof Error ? err.message : 'Error desconocido',
    })
  }
  break
}
```

### Pattern 3: manifest.json — Three Required Additions

**What:** Three manifest fields unlock Figma APIs and network access needed for tracking.

**Example:**
```json
{
  "name": "Designer Buddy",
  "id": "designer-buddy",
  "api": "1.0.0",
  "main": "dist/main.js",
  "ui": "dist/ui.html",
  "editorType": ["figma"],
  "documentAccess": "dynamic-page",
  "permissions": ["currentuser"],
  "enablePrivatePluginApi": true,
  "networkAccess": {
    "allowedDomains": [
      "https://api.groq.com",
      "*.api.powerplatform.com"
    ]
  }
}
```

Fields added:
- `"permissions": ["currentuser"]` — enables `figma.currentUser` (otherwise `null`)
- `"enablePrivatePluginApi": true` — enables `figma.fileKey` (otherwise `undefined`)
- `"*.api.powerplatform.com"` in `allowedDomains` — allows fetch() to Power Automate URLs

### Pattern 4: TrackingEvent Type

**What:** A flat TypeScript interface matching the Excel table columns and the Power Automate JSON schema.

**Example:**
```typescript
// src/types/tracking.ts

export interface TrackingEvent {
  fileId:       string   // figma.fileKey ?? root.name + '_local'
  fileName:     string   // figma.root.name via EvaluationReport
  pageName:     string   // figma.currentPage.name via EvaluationReport
  userName:     string   // figma.currentUser?.name ?? 'Unknown'
  overallScore: number   // integer 0-100 from EvaluationReport
  timestamp:    string   // ISO 8601 from report.evaluatedAt
}
```

### Anti-Patterns to Avoid

- **Awaiting fireAndForget:** `await fireAndForget(...)` blocks the case handler and makes tracking latency visible to the designer. The function must return `void` and be called without `await`.
- **Using `new Headers(...)` for fetch options:** QuickJS does not support `Headers` constructor. Use a plain object `{ 'Content-Type': 'application/json' }` — confirmed by existing codebase pattern from Groq fetch calls.
- **Using `new URL(...)` as the fetch argument:** Figma sandbox fetch only accepts a plain string URL, not a `URL` object.
- **Hardcoding the real PA URL in source:** The URL must be a placeholder in committed code. The real URL is distributed via private channel (Notion, Teams) and set only at deploy time. The GitHub repo is public.
- **Placing the tracking call before `send({ type: 'HANDOFF_RESULT' })`:** The designer would see a hang if the PA endpoint is slow (cold starts: 2-5 seconds). Always send the result first.
- **Catching errors with `.catch(() => {})` (fully silent):** The locked decision is `.catch(err => console.debug('[Tracking]', err))` — developer-visible but designer-invisible. Fully silent suppresses even setup debugging.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP POST | Custom XMLHttpRequest wrapper | Native `fetch()` in Figma sandbox | Already available; no library needed |
| Payload serialization | Manual string concatenation | `JSON.stringify(payload)` | Standard; handles all special characters |
| Error boundary for tracking | Try/catch wrapping the call site in router | `.catch()` inside `fireAndForget()` | Encapsulates error handling in the module; router stays clean |
| TypeScript types for Figma APIs | Manual type declarations | `@figma/plugin-typings` (already installed) | Authoritative types for `figma.currentUser`, `figma.fileKey`, `figma.root` |

**Key insight:** This phase is a glue layer, not new infrastructure. Every primitive needed already exists in the codebase or the Figma runtime.

---

## Common Pitfalls

### Pitfall 1: figma.fileKey Returns undefined Without enablePrivatePluginApi

**What goes wrong:** All tracking rows in Excel have an empty or undefined `fileId`. Files are indistinguishable in the analytics dashboard.

**Why it happens:** `figma.fileKey` is a private plugin API. It silently returns `undefined` for any plugin without `"enablePrivatePluginApi": true` in `manifest.json`. The property exists in the typings but returns `undefined` at runtime.

**How to avoid:** Add `"enablePrivatePluginApi": true` to `manifest.json`. Always guard: `figma.fileKey ?? figma.root.name + '_local'` so the payload is never `undefined`.

**Warning signs:** All rows in Excel have an empty `fileId` column. `console.log(figma.fileKey)` in dev returns `undefined` even though the file has a URL with a key.

### Pitfall 2: figma.currentUser Is Null Without "currentuser" Permission

**What goes wrong:** `figma.currentUser?.name` returns `undefined`. All tracking rows show `'Unknown'` as the designer name.

**Why it happens:** The `"currentuser"` permission must be declared in `manifest.json`. Without it, `figma.currentUser` is always `null` — even in fully published plugins.

**How to avoid:** Add `"permissions": ["currentuser"]` to `manifest.json`. Always guard: `figma.currentUser?.name ?? 'Unknown'`.

**Warning signs:** All rows in Excel show `'Unknown'` in the `userName` column.

### Pitfall 3: Tracking Call Placed Before HANDOFF_RESULT Send

**What goes wrong:** Designer experiences a hang after the evaluation completes. If the Power Automate endpoint is slow (cold start: 2–5 seconds) or `fireAndForget` is accidentally awaited, the result is delayed.

**Why it happens:** `evaluateCurrentPage()` resolves with the report. If tracking runs before `send({ type: 'HANDOFF_RESULT' })`, the UI waits for tracking before showing the score.

**How to avoid:** Always send `HANDOFF_RESULT` first, then call `fireAndForget`. The tracking call must come after. The function must never be awaited.

**Warning signs:** UI hangs for 2–5 seconds after evaluation finishes before showing the score.

### Pitfall 4: Power Automate URL Domain Not in allowedDomains

**What goes wrong:** The fetch call is blocked by Figma's CSP before it leaves the client. No network request is made. The developer console shows a CSP error.

**Why it happens:** Figma blocks all fetch() calls to domains not listed in `manifest.json networkAccess.allowedDomains`. The old `*.logic.azure.com` domain is deprecated (retired November 30, 2025). New PA URLs follow `*.api.powerplatform.com`.

**How to avoid:** Add `"*.api.powerplatform.com"` to `allowedDomains`. Figma supports wildcard patterns in this field. The wildcard covers all PA environment-specific subdomains.

**Warning signs:** CSP error in Figma plugin console. No requests appear in PA flow run history.

### Pitfall 5: String.replace() With React Bundle Content ($& Expansion)

**What goes wrong:** The `inlinePlugin` in `vite.config.ts` corrupts the HTML bundle. Figma shows "An error occurred while running this plugin."

**Why it happens:** React 18's reconciler contains the string `"$&/"` in its source. When used as the second argument to `String.replace()`, JavaScript interprets `$&` as "insert the matched string," corrupting the output.

**How to avoid:** This pitfall is already handled in the existing `vite.config.ts` — all `.replace()` calls use arrow function replacers. Do not change the `inlinePlugin` code during Phase 1. No modifications to `vite.config.ts` are needed.

**Warning signs:** "An error occurred while running this plugin" in Figma after build.

### Pitfall 6: Power Automate CORS — Missing Access-Control-Allow-Origin Header

**What goes wrong:** The tracking POST fails. The developer console shows a CORS error. PA flow run history may show a successful execution, but the plugin receives nothing readable.

**Why it happens:** Power Automate's HTTP trigger does not automatically add `Access-Control-Allow-Origin: *` to responses. For tracking (fire-and-forget from the sandbox), the CORS error occurs when the browser tries to read the response — but since `fireAndForget` discards the response, this only shows as a console error, not a user-visible error. For Phase 1, this is non-critical because the response is discarded anyway. Still, the PA team should configure it correctly from day 1 for consistency with Phase 2.

**How to avoid:** In the Power Automate Tracking Writer flow, add a Response action with header `Access-Control-Allow-Origin: *`. Document this requirement clearly in RUNBOOK.md.

**Warning signs:** `console.debug('[Tracking]', err)` logs a CORS error. Postman tests succeed but browser-based tests fail.

---

## Code Examples

Verified patterns from existing codebase and official sources:

### Fetch from Figma Sandbox (confirmed pattern — existing Groq call in copy module)

```typescript
// Pattern: plain string URL, plain object headers, string body — QuickJS compatible
fetch('https://api.groq.com/...', {
  method:  'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
  body:    JSON.stringify(requestBody),
}).catch(err => console.debug('[Module]', err))
```

### EvaluationReport Structure (src/types/handoff.ts — existing)

```typescript
export interface EvaluationReport {
  pluginVersion: string
  pageName:      string   // ← use for payload.pageName
  fileName:      string   // ← use for payload.fileName
  evaluatedAt:   string   // ← use for payload.timestamp (ISO 8601)
  totalFrames:   number
  overallScore:  number   // ← use for payload.overallScore (integer 0-100)
  criteria:      CriterionResult[]
}
```

### Power Automate JSON Schema for Tracking Writer Flow

Configure this in the PA HTTP trigger's "Request Body JSON Schema" field (paste as-is):

```json
{
  "type": "object",
  "properties": {
    "fileId":       { "type": "string" },
    "fileName":     { "type": "string" },
    "pageName":     { "type": "string" },
    "userName":     { "type": "string" },
    "overallScore": { "type": "integer" },
    "timestamp":    { "type": "string" }
  }
}
```

### Expected Payload Shape (for RUNBOOK testing section)

```json
{
  "fileId":       "AbCdEfGhIjKl",
  "fileName":     "Onboarding BCP v3",
  "pageName":     "Pantallas principales",
  "userName":     "Ana García",
  "overallScore": 87,
  "timestamp":    "2026-03-06T14:23:11.000Z"
}
```

### Excel EvaluationsTable — Required Column Structure

| Column Name | Type in Excel | Notes |
|-------------|---------------|-------|
| fileId | Text | May be empty for local drafts |
| fileName | Text | Always populated from `figma.root.name` |
| pageName | Text | Always populated from `report.pageName` |
| userName | Text | 'Unknown' for incognito sessions |
| overallScore | Number | Integer 0–100 |
| timestamp | Text | ISO 8601 string; Excel stores as text |

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `fetch()` from UI iframe via postMessage relay | `fetch()` directly from plugin sandbox (`main.ts`) | ~2022 (Figma added sandbox fetch) | Simpler, fewer CORS issues; no postMessage indirection |
| `*.logic.azure.com` Power Automate URLs | `*.api.powerplatform.com` URLs | August–November 2025 (retired November 30, 2025) | Old URLs are permanently invalid; all new flows use new domain |
| `new Headers({...})` for fetch options | Plain object `{ 'Content-Type': '...' }` | Figma QuickJS constraint (always) | `Headers` constructor not available in QuickJS; plain objects always work |

**Deprecated/outdated:**
- `*.logic.azure.com` in `allowedDomains`: Any URL still using this domain will fail. All new PA flows generate `*.api.powerplatform.com` URLs.
- `figma.ui.postMessage` relay for tracking fetch: The old pattern works but is unnecessary overhead when fetch() is available directly in the sandbox.

---

## Open Questions

1. **When will BCP create the Power Automate Tracking Writer flow?**
   - What we know: The plugin code can be completed and tested with an empty `TRACKING_ENDPOINT_URL` before any PA flow exists.
   - What's unclear: Timeline for BCP to configure PA, Excel file, and share the endpoint URL.
   - Recommendation: Implement all five deliverables with placeholder URL. Treat RUNBOOK.md as the handoff artifact to BCP. The plugin is ready to track as soon as BCP fills in the URL.

2. **Will `figma.fileKey` be non-null in BCP's environment?**
   - What we know: `enablePrivatePluginApi: true` enables it for cloud-hosted files. Local draft files return `null`.
   - What's unclear: Whether BCP designers ever work with local draft files that haven't been saved to Figma's cloud.
   - Recommendation: The `figma.fileKey ?? figma.root.name + '_local'` fallback handles this gracefully. Document in RUNBOOK that local draft evaluations may show a `_local` suffix in the `fileId` column.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | TypeScript compiler (`tsc --noEmit`) + manual Figma plugin runtime testing |
| Config file | `tsconfig.json` (root) |
| Quick run command | `npx tsc --noEmit` |
| Full suite command | `npm run build` (includes TypeScript compile + Vite build) |

No automated test framework (Jest, Vitest) is configured in this project. Validation is via TypeScript compilation (catches type errors) and manual runtime testing in Figma.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TRACK-01 | Payload has all 6 fields with correct types | TypeScript compile | `npx tsc --noEmit` | ❌ Wave 0 — create `src/types/tracking.ts`, `src/modules/tracking/index.ts` |
| TRACK-02 | `fireAndForget` does not block the caller | Manual | Load plugin in Figma dev mode; verify score appears immediately | N/A — runtime behavior |
| TRACK-03 | Empty URL causes silent failure, no visible error to designer | Manual | Set `TRACKING_ENDPOINT_URL = ''`; run evaluation; verify no error UI appears | N/A — runtime behavior |
| TRACK-04 | `figma.currentUser?.name` populates `userName` | Manual | Log payload in dev mode; verify userName field is not 'Unknown' for a logged-in user | N/A — runtime behavior |
| TRACK-05 | `figma.fileKey` populates `fileId` | Manual | Log payload in dev mode; verify fileId matches Figma file URL key | N/A — runtime behavior |
| TRACK-06 | Manifest has `*.api.powerplatform.com` in allowedDomains | TypeScript compile + manual | `npx tsc --noEmit`; inspect `manifest.json` diff | ❌ Wave 0 — modify `manifest.json` |
| OPS-01 | RUNBOOK.md exists with all required sections | Manual review | Review RUNBOOK.md before marking phase done | ❌ Wave 0 — create `RUNBOOK.md` |
| OPS-02 | `TRACKING_ENDPOINT_URL = ''` at top of tracking module with comment | TypeScript compile | `npx tsc --noEmit` | ❌ Wave 0 — create `src/modules/tracking/index.ts` |

### Sampling Rate

- **Per task commit:** `npx tsc --noEmit`
- **Per wave merge:** `npm run build` (full Vite build to `dist/`)
- **Phase gate:** `npm run build` succeeds with zero TypeScript errors AND manual runtime test in Figma dev mode confirms silent failure on empty URL before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/types/tracking.ts` — defines `TrackingEvent` interface (TRACK-01)
- [ ] `src/modules/tracking/index.ts` — `buildPayload`, `fireAndForget`, `TRACKING_ENDPOINT_URL` (TRACK-02, TRACK-03, OPS-02)
- [ ] `manifest.json` — add `permissions`, `enablePrivatePluginApi`, `allowedDomains` update (TRACK-04, TRACK-05, TRACK-06)
- [ ] `src/messageRouter.ts` — import and call tracking after `evaluateCurrentPage()` (TRACK-01, TRACK-02)
- [ ] `RUNBOOK.md` — operational documentation for BCP team (OPS-01)

No test framework installation needed — TypeScript + Vite build serve as the compile-time validation layer. Runtime behaviors are validated manually in Figma's plugin development environment.

---

## Sources

### Primary (HIGH confidence)

- [Figma Plugin Making Network Requests](https://developers.figma.com/docs/plugins/making-network-requests/) — Confirms `fetch()` works directly in plugin sandbox, `null` origin in iframe, `networkAccess.allowedDomains` enforcement, wildcard support. Verified in project research 2026-03-05.
- [Figma Plugin global fetch() API Reference](https://developers.figma.com/docs/plugins/api/properties/global-fetch/) — Confirms string-only URL, plain object headers, string/Uint8Array body only. Verified in project research 2026-03-05.
- [Figma Plugin Manifest Reference](https://developers.figma.com/docs/plugins/manifest/) — `permissions`, `enablePrivatePluginApi`, `networkAccess` fields. Verified in project research 2026-03-05.
- Existing codebase (`src/modules/copy/index.ts`) — Confirms the fetch pattern with plain object headers works in QuickJS (production-verified via Groq API calls).
- Existing `src/types/handoff.ts` — Confirms `EvaluationReport` has `pageName`, `fileName`, `evaluatedAt`, `overallScore` as direct fields — no transformation needed for payload.
- `MEMORY.md` project memory — Confirms QuickJS constraints (`es2015` target, no `new Headers()`, arrow function replacers in `inlinePlugin`).

### Secondary (MEDIUM confidence)

- [PA URL migration to api.powerplatform.com — Microsoft Learn](https://learn.microsoft.com/en-us/answers/questions/5621765/flow-has-a-new-trigger-url) — New domain format and November 2025 retirement deadline.
- Project `.planning/research/STACK.md`, `.planning/research/ARCHITECTURE.md`, `.planning/research/PITFALLS.md` — Synthesized research from 2026-03-05 covering Power Automate HTTP trigger patterns, CORS requirements, Excel Online table requirements, 90-day flow auto-disable, 256-row pagination.
- [Figma Forum: figma.fileKey undefined](https://forum.figma.com/archive-21/figma-filekey-undefined-in-private-plugin-20209) — Community confirmation that `enablePrivatePluginApi` is required.

### Tertiary (LOW confidence)

None — all critical claims are verified by HIGH or MEDIUM sources.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; existing stack verified in production
- Architecture: HIGH — all patterns derived from existing codebase conventions and official Figma docs
- Pitfalls: HIGH — sourced from official Figma docs and project's own prior research verified 2026-03-05
- RUNBOOK content: MEDIUM — Power Automate flow setup steps sourced from community references consistent with Microsoft docs

**Research date:** 2026-03-06
**Valid until:** 2026-06-06 (90 days — stable platform APIs; re-validate if Figma Plugin API version changes or Microsoft changes PA HTTP trigger behavior)
