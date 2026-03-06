# Architecture Research

**Domain:** Figma Plugin Tracking + Microsoft Power Automate + Excel Online Analytics
**Researched:** 2026-03-05
**Confidence:** HIGH (Figma API, Power Automate HTTP trigger, Excel Online connector — all verified against official docs)

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│  PRODUCER: Designer Buddy (existing plugin, modified)                │
│                                                                      │
│  src/messageRouter.ts                                                │
│  case 'HANDOFF_START_EVALUATION'                                     │
│    1. evaluateCurrentPage() → EvaluationReport                      │
│    2. send({ type: 'HANDOFF_RESULT', report })    ← unchanged        │
│    3. fireAndForget(trackingPayload)              ← NEW (side-effect)│
│                                                                      │
│  src/modules/tracking/index.ts (NEW)                                 │
│    fireAndForget() → fetch() POST to TRACKING_ENDPOINT_URL          │
│                                                                      │
│  manifest.json networkAccess.allowedDomains                          │
│    + "https://prod-*.logic.azure.com"  ← NEW domain to add          │
└────────────────────────────┬────────────────────────────────────────┘
                             │ POST /tracking-event
                             │ Content-Type: application/json
                             │ body: TrackingEvent JSON
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  MIDDLEWARE 1: Power Automate Flow — "Tracking Writer"               │
│                                                                      │
│  Trigger: When an HTTP request is received (POST)                    │
│  Step 1:  Parse JSON body (fileId, fileName, userName,               │
│           pageName, overallScore, timestamp)                         │
│  Step 2:  Add a row into a table [Excel Online connector]            │
│           → OneDrive BCP / handoff-tracking.xlsx / Table1            │
│  Step 3:  Response action                                            │
│           Status: 200                                                │
│           Headers: Access-Control-Allow-Origin: *                    │
│           Body: { "ok": true }                                       │
│                                                                      │
│  URL format: https://prod-NNN.REGION.logic.azure.com:443/workflows/  │
│              [id]/triggers/manual/paths/invoke?api-version=...&sig=  │
└─────────────────────────────────────────────────────────────────────┘
                             │
                             │ writes row
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STORAGE: Excel Online (OneDrive BCP)                                │
│                                                                      │
│  handoff-tracking.xlsx                                               │
│  Sheet: Evaluations                                                  │
│  Table: EvaluationsTable (named table — required by PA connector)    │
│                                                                      │
│  Columns: fileId | fileName | pageName | userName |                  │
│           overallScore | timestamp                                   │
└─────────────────────────────────────────────────────────────────────┘
                             │
                             │ GET /analytics-data
                             │
┌────────────────────────────┴────────────────────────────────────────┐
│  MIDDLEWARE 2: Power Automate Flow — "Analytics Reader"              │
│                                                                      │
│  Trigger: When an HTTP request is received (GET or POST)             │
│  Step 1:  List rows present in a table [Excel Online connector]      │
│           → Returns array of row objects (up to 256 by default;      │
│             enable pagination for more)                              │
│  Step 2:  Response action                                            │
│           Status: 200                                                │
│           Headers: Content-Type: application/json                    │
│                    Access-Control-Allow-Origin: *                    │
│           Body: { "rows": @{body('List_rows')?['value']} }           │
└────────────────────────────┬────────────────────────────────────────┘
                             │ JSON array response
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  CONSUMER: Handoff Analytics (new standalone plugin)                 │
│                                                                      │
│  analytics-plugin/                                                   │
│    manifest.json (own networkAccess, own id)                         │
│    src/main.ts      → fetch GET to ANALYTICS_ENDPOINT_URL            │
│    src/ui/App.tsx   → Dashboard: filters + table + summary           │
│    dist/ (own build)                                                 │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Boundary |
|-----------|----------------|----------|
| `src/modules/tracking/index.ts` | Constructs payload, fires fetch POST, swallows all errors | Only called from messageRouter; never blocks caller |
| Power Automate Flow 1 (Tracking Writer) | Receives event, writes row to Excel | BCP tenant configures this; plugin only needs the URL |
| `handoff-tracking.xlsx` / EvaluationsTable | Persistent storage of all evaluation events | Single source of truth; no other writer |
| Power Automate Flow 2 (Analytics Reader) | Reads rows, filters optionally, returns JSON | Can add server-side filtering later without changing plugin |
| `analytics-plugin/` | Renders dashboard for design leaders | Completely independent from Designer Buddy; separate manifest |

## Recommended Project Structure

```
designer-buddy/               ← existing plugin (modified)
├── src/
│   ├── modules/
│   │   ├── tracking/
│   │   │   └── index.ts      ← NEW: fireAndForget(), buildPayload()
│   │   ├── handoff/          ← unchanged
│   │   ├── docs/             ← unchanged
│   │   ├── copy/             ← unchanged
│   │   ├── ds/               ← unchanged
│   │   └── users/            ← unchanged
│   ├── messageRouter.ts      ← MODIFIED: add tracking call post-evaluation
│   └── types/
│       └── tracking.ts       ← NEW: TrackingEvent type
├── manifest.json             ← MODIFIED: add Power Automate domain

analytics-plugin/             ← NEW standalone plugin
├── src/
│   ├── main.ts               ← fetch GET to Analytics Reader flow
│   ├── ui/
│   │   ├── main.tsx
│   │   ├── App.tsx           ← Dashboard component
│   │   ├── components/
│   │   │   ├── EvaluationTable.tsx
│   │   │   ├── FilterBar.tsx
│   │   │   └── SummaryCards.tsx
│   │   └── index.html
│   └── types/
│       └── analytics.ts      ← EvaluationRow, AnalyticsResponse
├── manifest.json             ← independent: own id, own networkAccess
├── vite.config.ts            ← same pattern as Designer Buddy
└── package.json
```

### Structure Rationale

- **tracking/ as own module:** Mirrors the existing pattern (handoff/, copy/, ds/, users/). Keeps messageRouter.ts thin — it only orchestrates, tracking module owns the side-effect logic.
- **analytics-plugin/ at root level:** Completely independent. Different users (leaders vs designers), different capabilities, different manifest. Shares zero build config with Designer Buddy.
- **types/tracking.ts:** Single source of truth for the TrackingEvent shape. If Excel columns change, only this type and the PA flow need updating.

## Architectural Patterns

### Pattern 1: Fire-and-Forget Side Effect

**What:** Tracking call is made after the main result is sent to the UI. Errors are caught and silently discarded. The `await` on the tracking fetch is not awaited by the router.

**When to use:** Any telemetry/analytics event where failure must not degrade user experience.

**Trade-offs:** No retry, no confirmation. Acceptable here because: (a) analysts can tolerate missing occasional events, (b) the alternative (blocking UX) is worse.

**Example:**
```typescript
// src/modules/tracking/index.ts
const TRACKING_ENDPOINT_URL = 'PLACEHOLDER_REPLACE_BEFORE_DEPLOY'

export function fireAndForget(payload: TrackingEvent): void {
  // Intentionally not awaited — caller is not blocked
  fetch(TRACKING_ENDPOINT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {
    // Silently discard — tracking failures must never surface to designers
  })
}

// src/messageRouter.ts — inside case 'HANDOFF_START_EVALUATION':
const report = await evaluateCurrentPage(...)
send({ type: 'HANDOFF_RESULT', report })          // user sees result immediately
fireAndForget(buildPayload(report))               // side effect, not awaited
```

### Pattern 2: Figma Sandbox fetch() — CORS Constraint

**What:** The Figma plugin sandbox (`main.ts`) can call `fetch()` directly. The UI iframe also can, but with `null` origin. Power Automate HTTP trigger URLs require the Response action to include `Access-Control-Allow-Origin: *` in its response headers; otherwise, the browser blocks the response.

**When to use:** All outbound HTTP calls from the plugin.

**Trade-offs:** Fetch from sandbox (main.ts) does not have the null-origin CORS problem that the iframe has. However, Power Automate's Response action must still be configured with the CORS header for the Analytics Reader flow (GET), because the response body is read. For the Tracking Writer flow (POST, fire-and-forget), a missing CORS header on the response is not a problem since the plugin discards the response anyway — the `fetch()` will still send; only reading the response body fails.

**Critical nuance:** Both flows should include `Access-Control-Allow-Origin: *` in Response action headers for correctness and forward compatibility. This is set in the Power Automate flow configuration, not in the plugin code.

### Pattern 3: Power Automate as Typed HTTP Gateway

**What:** Each PA flow defines a JSON schema via "Use sample payload to generate schema." This schema is what Power Automate uses to expose the body fields as dynamic content in subsequent steps.

**When to use:** Whenever mapping incoming POST body fields to Excel column values.

**Trade-offs:** Schema is defined once; if the payload shape changes, the PA flow schema must be regenerated. Coordinate changes between the plugin release and the PA flow update.

## Data Flow

### Flow A — Tracking Event (Designer Buddy → Excel)

```
[evaluateCurrentPage() resolves with EvaluationReport]
    ↓
[messageRouter sends HANDOFF_RESULT to UI]           ← user sees score
    ↓ (non-blocking)
[fireAndForget(buildPayload(report))]
    ↓
[fetch POST to Power Automate Tracking Writer URL]
    ↓
[PA: parse JSON body against schema]
    ↓
[PA: Excel Online "Add a row into a table" → EvaluationsTable]
    ↓
[PA: Response 200 { ok: true }]  ← discarded by plugin
```

### Flow B — Analytics Read (Analytics Plugin → Dashboard)

```
[Analytics Plugin opens / user clicks Refresh]
    ↓
[main.ts: fetch GET to Power Automate Analytics Reader URL]
    ↓
[PA: Excel Online "List rows present in a table"]
    ↓
[PA: Response 200 { rows: [...] }]
    ↓
[main.ts receives JSON, posts to UI iframe via postMessage]
    ↓
[App.tsx renders EvaluationTable with filter controls]
```

### Payload Formats

**TrackingEvent — sent by Designer Buddy to Tracking Writer:**
```json
{
  "fileId":       "AbCdEfGhIjKl",
  "fileName":     "Onboarding v3",
  "pageName":     "Page 1",
  "userName":     "Ana García",
  "overallScore": 87,
  "timestamp":    "2026-03-05T14:23:11.000Z"
}
```

Notes:
- `fileId` maps to `figma.fileKey` — may be `null` for local files; send empty string `""` in that case
- `fileName` maps to `figma.root.name`
- `pageName` maps to `figma.currentPage.name` (captured inside evaluator or at send time)
- `userName` maps to `figma.currentUser?.name ?? 'Unknown'`
- `overallScore` is `EvaluationReport.overallScore` (integer 0–100)
- `timestamp` is `new Date().toISOString()` — ISO 8601, UTC

**AnalyticsResponse — returned by Analytics Reader to Analytics Plugin:**
```json
{
  "rows": [
    {
      "fileId":       "AbCdEfGhIjKl",
      "fileName":     "Onboarding v3",
      "pageName":     "Page 1",
      "userName":     "Ana García",
      "overallScore": "87",
      "timestamp":    "2026-03-05T14:23:11.000Z"
    }
  ]
}
```

Notes:
- Excel Online "List rows present in a table" returns all columns as strings. `overallScore` will arrive as a string; the plugin must `parseInt()` it before rendering or sorting.
- Default pagination cap is 256 rows. Enable pagination in the PA action for datasets beyond that. For BCP's team size (tens of designers, daily evaluations), 256 rows is sufficient for several months.
- The Excel connector throttles at 100 API calls per connection per 60 seconds. At analytics-plugin usage patterns (manual opens), this is not a concern.

**Power Automate HTTP Trigger configuration for Tracking Writer:**

```
Method: POST
Request Body JSON Schema (generated from sample above):
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

Response Action:
  Status Code: 200
  Headers:
    Access-Control-Allow-Origin: *
    Content-Type: application/json
  Body: { "ok": true }
```

**Power Automate HTTP Trigger configuration for Analytics Reader:**

```
Method: GET (or POST — GET has no body; POST allows future filter params)
Recommended: POST with optional filter fields to allow server-side filtering later

Response Action:
  Status Code: 200
  Headers:
    Access-Control-Allow-Origin: *
    Content-Type: application/json
  Body: { "rows": @{body('List_rows_present_in_a_table')?['value']} }
```

### manifest.json networkAccess — Designer Buddy

The Power Automate generated URL domain follows this pattern:
`https://prod-NNN.REGION.logic.azure.com`

Since the specific prod number and region are only known after the PA flow is created, the manifest should use a wildcard pattern or the exact domain once known. Figma does not support wildcards in `allowedDomains` — exact subdomains are required.

**Recommended approach:** Use a placeholder comment in the manifest during development. When the PA flow URL is available, add the exact domain:

```json
{
  "networkAccess": {
    "allowedDomains": [
      "https://api.groq.com",
      "https://prod-121.westeurope.logic.azure.com"
    ]
  }
}
```

For the Analytics Plugin's `manifest.json`, add only the Analytics Reader domain (may be different prod number).

## Build Order — Recommended Sequence

Build in this order to minimize blocked waiting time:

1. **Define TrackingEvent type** (`src/types/tracking.ts`) — no dependencies, enables parallel work
2. **Build tracking module** (`src/modules/tracking/index.ts`) — depends on type; testable with placeholder URL
3. **Modify messageRouter.ts** — add fireAndForget call; requires tracking module
4. **Update Designer Buddy manifest.json** — add PA domain; requires PA flow URL (coordinate with BCP team)
5. **Create analytics-plugin scaffold** — vite.config, manifest, directory structure
6. **Build Analytics Plugin UI** — dashboard components with mock data first, real endpoint later
7. **Wire Analytics Plugin to PA endpoint** — once PA Analytics Reader flow is live

**Why this order:**
- Steps 1–3 can be done before BCP team creates any PA flow. Use placeholder URL constant.
- Step 4 is blocked on BCP having created the Tracking Writer flow.
- Steps 5–6 are independent of BCP — build the dashboard against hardcoded mock data to validate UX.
- Step 7 is blocked on BCP having created the Analytics Reader flow.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0–50 evaluations/month | Current architecture — no changes needed. 256-row default pagination is sufficient. |
| 50–500 evaluations/month | Enable pagination in PA "List rows" action. Consider filtering server-side (pass date range in POST body to Analytics Reader). |
| 500+ evaluations/month | Split Excel workbook by quarter/year. PA flow checks current sheet dynamically. Or migrate storage to SharePoint List (better query support). |

### Scaling Priorities

1. **First bottleneck:** Excel file size. The connector caps at 25 MB per file and 5 MB per request. At one row per evaluation (~200 bytes), this is ~125,000 rows — far beyond BCP's realistic volume.
2. **Second bottleneck:** 256-row default pagination on "List rows." Solved by enabling pagination in PA flow settings (no code change in plugin).

## Anti-Patterns

### Anti-Pattern 1: Await the Tracking Fetch in the Router

**What people do:** `await fetch(TRACKING_ENDPOINT_URL, ...)` inside the `HANDOFF_START_EVALUATION` case before sending the result.

**Why it's wrong:** Adds latency to the handoff evaluation UX. If the PA flow is down or slow (PA cold starts can take 2–5 seconds), the designer sees a hang. The tracking is a side effect and must not gate the main value.

**Do this instead:** `fireAndForget()` — call and never await. The function returns void and catches all errors internally.

### Anti-Pattern 2: Fetch from the UI Iframe Instead of the Sandbox

**What people do:** Make the tracking `fetch()` call from `App.tsx` (React UI) instead of from `main.ts` (plugin sandbox).

**Why it's wrong:** The UI iframe has `null` origin. Power Automate's HTTP trigger does not send `Access-Control-Allow-Origin: *` by default — it requires an explicit Response action with that header. Even with the header, preflight OPTIONS requests may fail because PA HTTP triggers only accept POST/GET as configured. This creates fragile, hard-to-debug CORS failures.

**Do this instead:** Make all external `fetch()` calls from the plugin sandbox (`main.ts` / `messageRouter.ts`). The sandbox fetch is not subject to the same browser CORS restrictions. Use postMessage to pass results back to the UI if needed.

### Anti-Pattern 3: Using Excel Rows Without a Named Table

**What people do:** Write data to arbitrary Excel cells (A1:F1, etc.) without creating a named Excel Table object.

**Why it's wrong:** Power Automate's Excel Online connector requires a formal Excel Table (Insert → Table in Excel) to use "Add a row into a table" and "List rows present in a table." Without a named table, neither action works. The connector also requires the file to be in `.xlsx` format (not `.xlsb`, `.xlsm` for standard row operations).

**Do this instead:** Create `handoff-tracking.xlsx` with a named Table (`EvaluationsTable`) with the six columns before configuring any PA flow.

### Anti-Pattern 4: Single PA Flow for Both Write and Read

**What people do:** Use one PA flow that handles both writing events and reading analytics.

**Why it's wrong:** Write path (from Designer Buddy) and read path (from Analytics Plugin) have different callers, different frequencies, different response shapes, and different failure modes. A single flow would need conditional logic on the incoming request, increasing complexity. PA flows are cheap to create — two flows is the correct model.

**Do this instead:** Two separate flows, each with a single responsibility. This also makes it easy to evolve the read path (add filters, pagination, new columns) without touching the write path.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Power Automate Tracking Writer | POST from plugin sandbox; fire-and-forget | URL stored as `TRACKING_ENDPOINT_URL` constant; add to `networkAccess.allowedDomains` |
| Power Automate Analytics Reader | GET/POST from Analytics Plugin sandbox | URL stored as `ANALYTICS_ENDPOINT_URL` constant; own `networkAccess.allowedDomains` |
| Excel Online (via PA) | Managed entirely by PA flows — plugin never touches Excel directly | BCP team owns the workbook; plugin only sees JSON rows |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| messageRouter.ts ↔ tracking/index.ts | Direct function call (`fireAndForget`) | tracking module must not import from messageRouter (one-way dependency) |
| Plugin sandbox ↔ Plugin UI (Designer Buddy) | `figma.ui.postMessage` / `onmessage` — existing pattern | Tracking is fully in sandbox; UI is never involved |
| Analytics Plugin sandbox ↔ Analytics Plugin UI | `figma.ui.postMessage` — same pattern | Sandbox fetches data, UI renders it |
| Designer Buddy ↔ Analytics Plugin | No direct communication — decoupled via shared Excel storage | This is intentional. Analytics plugin is read-only consumer. |

## Sources

- Figma Plugin API — Making Network Requests: https://developers.figma.com/docs/plugins/making-network-requests (HIGH confidence — official docs, verified 2026-03)
- Excel Online (Business) Connector reference: https://learn.microsoft.com/en-us/connectors/excelonlinebusiness/ (HIGH confidence — official Microsoft docs, updated 2025-08)
- Power Automate "When an HTTP request is received" trigger pattern: https://manueltgomes.com/reference/power-automate-trigger-reference/when-an-http-request-is-received-trigger/ (MEDIUM confidence — community reference, consistent with official docs)
- Power Automate Excel connector known limitations (256-row pagination, 25MB file cap, 100 API calls/60s throttle): https://learn.microsoft.com/en-us/connectors/excelonlinebusiness/ (HIGH confidence — official)
- Figma forum — null origin and CORS with fetch from plugin iframe: https://forum.figma.com/ask-the-community-7/fetch-requests-made-from-our-plugin-to-our-api-are-setting-the-origin-header-to-null-7354 (MEDIUM confidence — community, consistent with official Figma docs statement)

---
*Architecture research for: Figma Plugin Tracking → Power Automate → Excel Online → Analytics Plugin*
*Researched: 2026-03-05*
