# Phase 2: Analytics Plugin — Handoff Analytics - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Create the standalone `analytics-plugin/` Figma plugin for design leaders. It fetches evaluation records from a Power Automate Reader endpoint, displays a dashboard with filters and score summaries, and starts with hardcoded mock data. Wiring to the real endpoint is done in this same phase by flipping a flag.

New features (trend charts, column sorting, refresh button, URL config) are Phase 3.

</domain>

<decisions>
## Implementation Decisions

### Visual style
- Same BCP dark-gradient header as Designer Buddy: `linear-gradient(135deg, #0a1628, #1a2d5a)`
- Plugin title in header: **"Handoff Analytics"**
- Single screen — no tabs. One purpose, no navigation.
- Footer: small version label at the bottom (e.g., `v1.0 · Equipo Diseño BCP`) in 9px gray text
- All styles inline (same pattern as Designer Buddy App.tsx — no CSS modules, no Tailwind)

### Table overflow and layout
- Table has fixed height with `overflow-y: auto` (internal scroll)
- SummaryBar and FilterBar remain sticky/visible above the table at all times
- Column widths fixed (total ~360px usable inside 380px plugin):
  - Archivo: 110px
  - Diseñador: 90px
  - Fecha: 80px
  - Score: 50px (+ padding)
- Long text truncated with `overflow: hidden; text-overflow: ellipsis; white-space: nowrap`
- Sticky column headers (`position: sticky; top: 0`) within the scrollable table container

### DesignerSummary placement
- Positioned **below the table** (flow: SummaryBar → FilterBar → Table → DesignerSummary)
- Section title visible: "Promedio por diseñador" in small gray text
- Three columns: Diseñador | Promedio (with color coding) | Total evaluaciones
- Responds to active filters — when the designer filter is active, DesignerSummary reflects filtered data only

### Mock data strategy
- `USE_MOCK = true` constant at top of `main.ts` — flip to `false` to wire real endpoint
- `ANALYTICS_READ_URL = ''` constant alongside — paste PA Reader URL when ready
- Mock dataset: **8-10 rows**, realistic:
  - 4-5 different designer names (BCP-style names in Spanish)
  - Timestamps spread across the last 3-4 weeks
  - Score distribution covering all three bands: <60 (red), 60-80 (yellow), >80 (green)
- Mock data sent after `setTimeout(1000)` so loading spinner is visible during development
- Mock data defined inline in `main.ts` as `const MOCK_DATA: EvaluationRow[]`
- When USE_MOCK switches to false: `fetchEvaluations(ANALYTICS_READ_URL)` runs; mock data and setTimeout are bypassed

### Claude's Discretion
- Exact pixel heights for the table scroll container (adjust to fill available space)
- Exact color values for table header background and row alternating/hover states
- Spinner implementation (CSS animation vs character)
- Error state and empty state copy (Spanish, friendly tone)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `App.tsx` (Designer Buddy): entire CSS inline style block is copy-paste base for the analytics plugin header, body background (`#f8f8fc`), font stack (`Inter, -apple-system`), and color variables
- `HandoffTab.tsx`: `ScoreColor()` function maps score → CSS class. Analytics uses same thresholds per REQUIREMENTS: <60 red, 60-80 yellow, >80 green (note: slightly different from HandoffTab's ≥50 cutoff — use REQUIREMENTS thresholds)
- `src/types/tracking.ts`: `TrackingEvent` fields map directly to `EvaluationRow` (fileId, fileName, pageName, userName, overallScore, timestamp) — same shape, different direction

### Established Patterns
- Fetch in sandbox (`main.ts`), never in React iframe — avoids null-origin CORS issue
- `inlinePlugin` in `vite.config.ts` with arrow function replacers (mandatory — avoids `$&` React bug)
- `build.target: 'es2015'` in vite config — transpiles `??` and `?.` for QuickJS
- Plain object headers in fetch: `{ 'Content-Type': 'application/json' }` (no `new Headers()` in QuickJS)
- State pattern: `useState` + `useEffect` in React, no Redux needed at this scale
- Message types defined in `src/types/messages.ts` — analytics plugin needs its own `src/types/analytics.ts`

### Integration Points
- `analytics-plugin/` is fully independent: own `manifest.json`, `package.json`, `vite.config.ts`, `dist/`
- No shared code with Designer Buddy — copy patterns, not imports
- `manifest.json` needs: `networkAccess.allowedDomains: ["*.api.powerplatform.com"]`, `permissions: ["currentuser"]`, `enablePrivatePluginApi: true`
- PA Reader returns all fields as strings — `parseInt(row.overallScore)` before any comparison or sort

</code_context>

<specifics>
## Specific Ideas

- Layout mockup confirmed by user:
  ```
  [█ Header BCP (dark gradient)  ]
  [ SummaryBar                   ]
  [ FilterBar                    ]
  [-- EvaluationTable (scroll) --]
  [ row 1...                     ]
  [------------------------------]
  [ DesignerSummary              ]
  [ v1.0 · Equipo Diseño BCP     ]
  ```
- Timestamps: format with `new Date(ts).toLocaleString('es-PE')` — DD/MM/YYYY HH:mm output for Peruvian locale
- `overallScore` arrives as string from Excel via PA — must `parseInt()` before rendering, sorting, or averaging
- Mock toggle pattern confirmed:
  ```ts
  const USE_MOCK = true
  const ANALYTICS_READ_URL = ''
  if (USE_MOCK) {
    setTimeout(() => figma.ui.postMessage({ type: 'ANALYTICS_RESULT', data: MOCK_DATA }), 1000)
  } else {
    fetchEvaluations(ANALYTICS_READ_URL).then(...)
  }
  ```

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-analytics-plugin-handoff-analytics*
*Context gathered: 2026-03-06*
