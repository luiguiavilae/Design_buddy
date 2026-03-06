# Stack Research

**Domain:** Figma plugin tracking + analytics dashboard (fetch to Power Automate + Excel Online)
**Researched:** 2026-03-05
**Confidence:** HIGH for Figma API mechanics, MEDIUM for Power Automate CORS behavior (not officially documented, confirmed by community usage)

---

## Context: Two Components, One Repo

This milestone adds two things to the existing Designer Buddy repo:

1. **Tracking module** — a few lines inserted in `src/messageRouter.ts` that fire-and-forget a POST to Power Automate after each handoff evaluation.
2. **analytics-plugin** — a second, fully independent Figma plugin in `/analytics-plugin/` that fetches data from a second Power Automate flow and renders a dashboard.

No new core technologies are introduced. The stack is the same stack that already works.

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| React | 18.3.x (existing) | UI framework for analytics dashboard | Already in use in Designer Buddy; consistent DX across both plugins |
| TypeScript | 5.5.x (existing) | Type safety for messages, payloads, API responses | Already configured; avoids runtime errors in Power Automate response parsing |
| Vite | 5.3.x (existing) | Build system for analytics-plugin | Same `vite.config.ts` + `inlinePlugin` pattern is proven to work with Figma's constraints |
| `@figma/plugin-typings` | 1.95.x (existing) | TypeScript types for `figma.*` global APIs | Required — without it, `figma.currentUser`, `figma.root`, etc. are untyped |
| Figma Plugin API (fetch) | built-in | HTTP calls from sandbox to Power Automate | Native to Figma sandbox — no library needed, no iframe workaround required |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None new | — | — | The existing stack covers everything needed. Adding date libraries or charting libraries would bloat the plugin unnecessarily |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `vite build --watch` | Dev loop for analytics-plugin | Copy `vite.config.ts` from Designer Buddy, adjust entry paths |
| `tsc --noEmit` | Type-check before building | Run on both `src/` and `analytics-plugin/src/` trees independently |

---

## Installation

No new packages required for Designer Buddy's tracking module.

For analytics-plugin (new `package.json` in `/analytics-plugin/`):

```bash
# Core — same versions as designer-buddy
npm install react@^18.3.0 react-dom@^18.3.0

# Dev — same versions as designer-buddy
npm install -D typescript@^5.5.0 vite@^5.3.0 @vitejs/plugin-react@^4.3.0 @figma/plugin-typings@^1.95.0 @types/react@^18.3.0 @types/react-dom@^18.3.0 @types/node@^25.0.0
```

---

## How fetch() Works in the Figma Plugin Sandbox

This is the most critical technical detail for this milestone.

### Figma has a custom fetch() in the main sandbox

Since approximately 2022, Figma added a native `fetch()` to the main plugin sandbox (the QuickJS environment where `main.ts` / `code.js` runs). This means fetch() works directly in `messageRouter.ts` without any iframe or `postMessage` relay.

**Official Figma docs confirm** (https://developers.figma.com/docs/plugins/making-network-requests/):
> "Previously, to make network requests within a plugin, you had to implement an iframe to handle sending and receiving data. While plugins implemented this way will continue to function normally, we recommend using the simpler Fetch API approach."

### Differences from standard browser fetch()

Figma's sandbox fetch is NOT the standard WhatWG fetch. Key differences (confirmed at https://developers.figma.com/docs/plugins/api/properties/global-fetch/):

| Aspect | Standard Browser | Figma Sandbox |
|--------|-----------------|---------------|
| First argument | `string \| URL \| Request` | `string` only — no `URL` or `Request` object |
| Headers | `Headers \| Record<string, string>` | Plain object only — no `Headers` instance |
| Body | `BodyInit` (many types) | `string \| Uint8Array` only |
| Response headers | `.headers` (Headers object) | `.headersObject` (plain object) |

**Implication:** For the tracking POST, the payload must be `JSON.stringify(payload)` (a string). This is already what we want.

### CORS behavior: sandbox vs UI iframe

| Context | Origin | CORS Requirement |
|---------|--------|-----------------|
| Main sandbox (main.ts) | Figma's server origin | Standard CORS applies — server must allow Figma's origin or `*` |
| UI iframe (ui.html) | `null` (sandboxed iframe) | API must respond with `Access-Control-Allow-Origin: *` specifically |

The tracking fetch happens in `messageRouter.ts` (main sandbox), not in the UI iframe. This is the safer context because CORS is less restrictive. Community-confirmed that Power Automate HTTP triggers do accept requests from Figma plugins.

### networkAccess in manifest.json

Every domain the plugin calls via fetch must be listed in `manifest.json`. Without it, Figma blocks the request at the CSP layer before it leaves the client.

**Required addition to Designer Buddy's `manifest.json`:**

```json
{
  "networkAccess": {
    "allowedDomains": [
      "https://api.groq.com",
      "*.api.powerplatform.com"
    ]
  }
}
```

The wildcard `*.api.powerplatform.com` covers the new Power Automate URL format (migrated from `logic.azure.com` starting August 2025, old URLs retired November 30, 2025). The new URL pattern is `{EnvironmentID}.aa.environment.api.powerplatform.com`.

**For analytics-plugin's `manifest.json`:**

```json
{
  "networkAccess": {
    "allowedDomains": [
      "*.api.powerplatform.com"
    ]
  }
}
```

---

## How figma.currentUser Works

### Permission required

`figma.currentUser` requires the `"currentuser"` permission declared in `manifest.json`:

```json
{
  "permissions": ["currentuser"]
}
```

Without this, `figma.currentUser` is `null`. Designer Buddy's current manifest does not have this — it must be added.

### Available properties

```typescript
figma.currentUser.name      // string — display name in Figma
figma.currentUser.id        // string — user ID
figma.currentUser.photoUrl  // string | null — avatar URL
figma.currentUser.color     // string — assigned color in the session
figma.currentUser.sessionId // number — current session ID
```

For tracking, only `.name` is needed. `.id` is useful as a stable identifier if names change.

---

## How figma.fileKey Works — Critical Limitation

### fileKey requires enablePrivatePluginApi

`figma.fileKey` is **NOT available to standard plugins**. It is only available to:
- Private plugins with `enablePrivatePluginApi: true` in manifest.json
- Figma-owned internal tools (Jira/Asana widgets)

**Official Figma docs:** "The file key of the current file this plugin is running on. Only private plugins and Figma-owned resources have access to this."

**Designer Buddy is an internal BCP plugin** — it will never be published to the Figma Community. This means it qualifies as a private plugin and can use `enablePrivatePluginApi: true`.

**Required manifest addition:**

```json
{
  "enablePrivatePluginApi": true
}
```

With this flag set, `figma.fileKey` returns the file key string (same as the `xxxxxxx` portion of the URL `figma.com/file/xxxxxxx/...`), or `null` for files not hosted on Figma (e.g., local draft files).

### Fallback when fileKey is null

`figma.fileKey` is null for local draft files. The payload should handle this gracefully:

```typescript
fileId: figma.fileKey ?? 'local-draft'
```

### Alternative: figma.root.name

`figma.root.name` (the document name) is always available without any permission flags. It provides the human-readable file name that matches what designers see in Figma. This is more useful in the dashboard than the opaque fileKey ID.

**Use both:** `fileId = figma.fileKey ?? 'unknown'` + `fileName = figma.root.name`.

---

## Power Automate Payload Format

### POST (tracking — Designer Buddy → Flow 1)

```typescript
const payload = {
  fileId:      figma.fileKey ?? 'unknown',
  fileName:    figma.root.name,
  userName:    figma.currentUser?.name ?? 'unknown',
  userId:      figma.currentUser?.id ?? 'unknown',
  timestamp:   new Date().toISOString(),   // ISO 8601, Excel-friendly
  overallScore: report.overallScore,       // number 0-100
}

fetch(TRACKING_ENDPOINT_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
}).catch(() => {})  // fire-and-forget, swallow errors silently
```

Power Automate's "When an HTTP request is received" trigger parses the JSON body automatically when you define the JSON schema in the flow configuration. No additional headers beyond `Content-Type: application/json` are needed.

### GET (analytics — Plugin Analytics → Flow 2)

Power Automate HTTP triggers use POST by default. For reading data, configure Flow 2 to accept POST with an empty body or a body with filter params, then return the Excel rows as a JSON array in a "Response" action:

```typescript
const response = await fetch(ANALYTICS_ENDPOINT_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'get_all' }),
})
const data = await response.json() as EvaluationRecord[]
```

Power Automate's Response action must set `Content-Type: application/json` in the flow's response headers and return the data as a JSON body.

### Expected response structure from Flow 2

```typescript
interface EvaluationRecord {
  fileId:       string
  fileName:     string
  userName:     string
  userId:       string
  timestamp:    string  // ISO 8601
  overallScore: number
}
```

---

## Folder Structure for analytics-plugin

Each Figma plugin requires its own `manifest.json` and its own compiled output. The analytics-plugin is a fully independent plugin — different Figma Plugin ID, different build output, different manifest.

```
designer-buddy/                        ← existing repo root
├── manifest.json                      ← Designer Buddy manifest (modified)
├── src/                               ← Designer Buddy source (modified)
│   ├── main.ts
│   ├── messageRouter.ts               ← tracking fetch inserted here
│   └── ...
├── dist/                              ← Designer Buddy build output
│
└── analytics-plugin/                  ← new, fully independent plugin
    ├── manifest.json                  ← separate plugin ID, separate networkAccess
    ├── package.json                   ← independent deps (same versions)
    ├── tsconfig.json                  ← copied from root, paths adjusted
    ├── vite.config.ts                 ← copied from root, input paths adjusted
    ├── src/
    │   ├── main.ts                    ← analytics plugin sandbox entry
    │   ├── ui/
    │   │   ├── index.html             ← UI template with <!-- INJECT_SCRIPT -->
    │   │   └── main.tsx               ← React entry for dashboard
    │   └── ui/
    │       └── Dashboard.tsx          ← dashboard component
    └── dist/                          ← analytics-plugin build output
        ├── main.js
        └── ui.html
```

### Why a separate package.json in analytics-plugin/

Each plugin is independently developed and built. Sharing `node_modules` from the root is possible but creates coupling. A separate `package.json` ensures:
- Independent `npm run build` from `analytics-plugin/`
- Clear ownership boundary — no accidental dependency bleeding
- Can be moved to a separate repo later if needed

### vite.config.ts for analytics-plugin

Copy Designer Buddy's `vite.config.ts` verbatim. Change only the input paths:

```typescript
input: {
  main: resolve(__dirname, 'src/main.ts'),
  ui:   resolve(__dirname, 'src/ui/main.tsx'),   // NOT the .html
},
```

The `inlinePlugin` reads `src/ui/index.html` as template (same pattern). All the same `build.target: 'es2015'` and `inlinePlugin` rules apply — QuickJS still needs ES2015 transpilation, and `$&` replacement still needs arrow function replacers.

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| fetch() from main sandbox (main.ts) | postMessage to UI iframe, iframe does fetch | Old pattern. Adds indirection and message-passing code. Still works but unnecessary since Figma sandbox has native fetch. |
| `*.api.powerplatform.com` in allowedDomains | Exact URL of each flow | Exact URLs include environment IDs that change per tenant. Wildcard is more resilient. |
| `enablePrivatePluginApi: true` for fileKey | Use `figma.root.name` only as file identifier | `root.name` is not unique across files with the same name. fileKey is the canonical unique ID. |
| Separate `package.json` per plugin | Monorepo with shared `node_modules` | Simpler for a two-plugin repo at this scale; avoids build script conflicts. |
| Power Automate as sole backend | Azure Functions, Supabase, any backend | Requirement: zero additional cost, within M365 BCP. Power Automate is the constraint, not a choice. |
| POST for both write and read flows | GET for read flow | Power Automate HTTP trigger is natively POST. Making it accept GET requires extra flow configuration. POST with a JSON body for filtering is simpler. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `axios` or any HTTP client library | Adds bundle weight to plugin; Figma sandbox fetch is sufficient | Native Figma sandbox `fetch()` |
| `new URL(...)` as first argument to fetch | Not supported in Figma sandbox fetch — only string URLs allowed | Plain string: `fetch('https://...')` |
| `new Headers(...)` for request headers | Not supported in Figma sandbox — only plain objects | Plain object: `{ 'Content-Type': 'application/json' }` |
| `logic.azure.com` URLs | Deprecated by Microsoft, retired November 30, 2025 | New `*.api.powerplatform.com` URLs generated from the flow designer |
| `figma.fileKey` without `enablePrivatePluginApi: true` | Returns `undefined` — silently wrong | Add `"enablePrivatePluginApi": true` to manifest.json |
| `figma.currentUser` without `"currentuser"` in permissions | Returns `null` — silently wrong | Add `"permissions": ["currentuser"]` to manifest.json |
| Charting libraries (Chart.js, Recharts) | Excessive bundle size for a Figma plugin UI; CSS + HTML table is sufficient | Native HTML table with inline styles (existing Designer Buddy pattern) |
| `async/await` without try/catch on tracking fetch | Unhandled promise rejection could surface in Figma console and potentially affect the plugin | Wrap in `.catch(() => {})` for true fire-and-forget |

---

## Stack Patterns by Variant

**For the tracking module in Designer Buddy (minimal change):**
- Insert after `evaluateCurrentPage()` resolves, before `send({ type: 'HANDOFF_RESULT' })`
- Use `fetch().catch(() => {})` — never `await` the tracking call
- Declare `const TRACKING_ENDPOINT_URL = 'PLACEHOLDER'` as a module-level constant
- Add `"currentuser"` to permissions, `"enablePrivatePluginApi": true`, and `*.api.powerplatform.com` to allowedDomains in manifest.json

**For analytics-plugin (new plugin):**
- Main sandbox (`main.ts`) handles `fetch()` to Power Automate Flow 2 and sends result to UI via `figma.ui.postMessage()`
- React UI renders dashboard from the message data
- Filter state (by designer, by date range) is React state — no persisted storage needed
- Dashboard UI has no Figma API access — it only renders what the sandbox sends

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `@figma/plugin-typings@^1.95.0` | TypeScript 5.x | Plugin typings ship type definitions for `figma.currentUser`, `figma.fileKey`, `figma.fetch`. Versions below 1.90 may not have the fetch typings. |
| `vite@^5.3.0` | `@vitejs/plugin-react@^4.3.0` | Already proven working in Designer Buddy. Do not upgrade Vite to 6.x without testing — the inlinePlugin closeBundle hook behavior may change. |
| `react@^18.3.0` | `react-dom@^18.3.0` | Must be same major version. React 18 is required for concurrent mode; 17 would also work but no reason to downgrade. |

---

## Sources

- [Figma Plugin Making Network Requests](https://developers.figma.com/docs/plugins/making-network-requests/) — Confirms fetch() works in main sandbox, null-origin behavior in iframe, networkAccess enforcement via CSP — HIGH confidence
- [Figma Plugin global fetch() API Reference](https://developers.figma.com/docs/plugins/api/properties/global-fetch/) — Confirms string-only URL, plain object headers, string/Uint8Array body — HIGH confidence
- [Figma Plugin Manifest Reference](https://developers.figma.com/docs/plugins/manifest/) — All manifest.json fields including networkAccess patterns, permissions, enablePrivatePluginApi — HIGH confidence
- [Figma Plugin How Plugins Run](https://developers.figma.com/docs/plugins/how-plugins-run/) — Main sandbox vs UI iframe execution contexts — HIGH confidence
- [Figma API figma.currentUser](https://developers.figma.com/docs/plugins/api/) — "currentuser" permission required in manifest — HIGH confidence
- [Figma Forum: figma.fileKey undefined in private plugin](https://forum.figma.com/archive-21/figma-filekey-undefined-in-private-plugin-20209) — Confirms enablePrivatePluginApi required — MEDIUM confidence
- [Power Automate URL Migration to api.powerplatform.com](https://learn.microsoft.com/en-us/answers/questions/5621765/flow-has-a-new-trigger-url) — New domain format, November 2025 deadline — HIGH confidence
- [Power Automate HTTP Trigger Reference](https://manueltgomes.com/reference/power-automate-trigger-reference/when-an-http-request-is-received-trigger/) — POST trigger setup, JSON body parsing — MEDIUM confidence
- [Figma Forum: fetch requests setting Origin to null](https://forum.figma.com/ask-the-community-7/fetch-requests-made-from-our-plugin-to-our-api-are-setting-the-origin-header-to-null-7354) — Null origin is specific to UI iframe fetch, not main sandbox fetch — MEDIUM confidence (community-sourced)
- [Figma Plugin Monorepo examples](https://github.com/yuanqing/figma-plugins) — Each plugin gets own manifest.json and build output — HIGH confidence

---

*Stack research for: Figma plugin tracking + Power Automate + Handoff Analytics plugin*
*Researched: 2026-03-05*
