# Pitfalls Research

**Domain:** Figma plugin tracking via fetch() to Power Automate + Excel Online analytics
**Researched:** 2026-03-05
**Confidence:** MEDIUM — core Figma behaviors verified via official docs; PA CORS specifics verified via community + Microsoft Learn; PA auto-disable confirmed via multiple sources.

---

## Critical Pitfalls

### Pitfall 1: Power Automate HTTP Trigger Does Not Return CORS Headers by Default

**What goes wrong:**
The Analytics plugin (and any browser-context fetch from the Figma UI iframe) sends a request to the Power Automate HTTP trigger URL. The browser blocks the response with a CORS error: `No 'Access-Control-Allow-Origin' header is present on the requested resource`. The POST for tracking silently fails; the GET for reading analytics data fails visibly — the dashboard never renders.

**Why it happens:**
Power Automate's "When an HTTP request is received" trigger does not automatically add `Access-Control-Allow-Origin: *` to responses. The Figma plugin UI runs inside an iframe with a `null` origin. The browser enforces CORS on all responses, including those from PA HTTP triggers. Developers test with Postman (which ignores CORS) and conclude the endpoint works, then discover it fails in the actual plugin.

**How to avoid:**
In every Power Automate flow that will be called from the plugin, add a **Response** action as the last step. In that Response action, add an explicit header:
```
Key:   Access-Control-Allow-Origin
Value: *
```
For the GET flow (Analytics read), also add:
```
Key:   Content-Type
Value: application/json
```
Always test the endpoint using `fetch()` from a browser console or a Figma development plugin — not Postman — before marking configuration done.

**Warning signs:**
- Postman calls succeed but the plugin shows no data or silently fails.
- Browser DevTools (or Figma plugin console) shows: `CORS error` or `blocked by CORS policy`.
- The PA flow run history shows successful execution but the plugin receives nothing.

**Phase to address:** Phase 1 (Tracking module in Designer Buddy) and Phase 2 (Analytics plugin). Must be verified during integration testing of each phase, not deferred.

---

### Pitfall 2: figma.fileKey Is Undefined for Most Plugin Configurations

**What goes wrong:**
`figma.fileKey` returns `undefined` at runtime. The tracking payload is sent with a null/undefined `fileId`, so every row in Excel looks the same and the Analytics dashboard cannot distinguish between files.

**Why it happens:**
`figma.fileKey` is a private plugin API. It requires `"enablePrivatePluginApi": true` in `manifest.json`. Without it, the property always returns `undefined` — regardless of whether the file is a cloud file or a local draft. Since Designer Buddy is an internal BCP plugin (not published to Figma Community), it qualifies as a private plugin, but the manifest must be explicitly opted in.

Additionally: even with `enablePrivatePluginApi: true`, local draft files (files that have never been saved to the cloud) may not have a stable key. In that edge case, `figma.fileKey` can still be `undefined`.

**How to avoid:**
1. Add `"enablePrivatePluginApi": true` to `manifest.json` of Designer Buddy.
2. In tracking code, always guard: `const fileId = figma.fileKey ?? figma.root.name + '_no_key'`. This ensures the payload always has some identifier.
3. Use `figma.root.name` as a human-readable fallback display name regardless.
4. Document that local drafts may produce incomplete records — acceptable for internal use.

**Warning signs:**
- All rows in Excel have an empty `fileId` column.
- `console.log(figma.fileKey)` in development shows `undefined` even though the file has a URL with a key.
- The manifest does not contain `enablePrivatePluginApi`.

**Phase to address:** Phase 1 (Tracking module). Must be validated before the first real tracking event is sent.

---

### Pitfall 3: Power Automate Flow Auto-Disables After 90 Days Without Triggers

**What goes wrong:**
Tracking stops silently. Designers continue using the plugin but no new rows appear in Excel. Leaders check the Analytics dashboard and see stale data. Nobody notices until weeks later because the flow failure is silent (fire-and-forget).

**Why it happens:**
Microsoft Power Automate automatically turns off flows that have not been triggered in 90 days (for M365 plan users without a standalone PA license). Flows that fail continuously for 14 days are also auto-disabled. The flow owner receives an email warning 7 days before shutdown, but if the flow owner is not monitoring, the email goes unnoticed.

**How to avoid:**
- Assign the flow to a shared service account or a team mailbox, not an individual user's account. This ensures the warning email is seen.
- Configure a scheduled PA flow that pings the HTTP trigger flow with a synthetic heartbeat every 30 days to keep it alive.
- Alternatively, document a quarterly "re-enable check" as a recurring task for the BCP design ops team.
- For initial phases, note this risk explicitly in the handoff documentation given to the BCP team.

**Warning signs:**
- No new rows in Excel for an extended period despite active design work.
- PA flow run history shows the last run was 90+ days ago.
- A flow owner received an email subject "Your flow has been turned off".

**Phase to address:** Phase 1 handoff documentation. The heartbeat schedule should be set up when the PA flows are first created.

---

### Pitfall 4: Power Automate HTTP Trigger URL Changes and Breaks the Plugin

**What goes wrong:**
The URL hardcoded (or stored as a constant `TRACKING_ENDPOINT_URL`) in the plugin becomes invalid. All tracking calls silently fail (fire-and-forget). All Analytics dashboard reads fail visibly. The plugin needs a code change and redistribution to update the URL.

**Why it happens:**
Microsoft migrated all `*.logic.azure.com` PA HTTP trigger URLs to `*.api.powerplatform.com` in August–November 2025. The old URLs stopped working on November 30, 2025. Additionally, regenerating a flow (e.g., when moving it between environments or re-saving after an error) issues a new URL — the old one becomes permanently invalid.

**How to avoid:**
- The current design already uses a `TRACKING_ENDPOINT_URL` constant placeholder — keep this pattern. It makes URL updates a single-line change.
- Store both endpoint URLs (`TRACKING_ENDPOINT_URL` and `ANALYTICS_READ_URL`) as constants at the top of their respective files, clearly commented, so future maintainers know where to update them.
- Confirm that the PA team creates flows in the final production environment (not a personal M365 account) before giving the URLs, since re-creating in a different environment generates a new URL.
- For the Analytics plugin, consider whether the read URL can be entered via the plugin UI (configurable by the design ops lead) rather than hardcoded, to avoid requiring a code release for URL rotation.

**Warning signs:**
- Tracking stops working after a PA flow was modified or re-saved.
- PA team reports they moved the flow to a different environment.
- The PA URL in code still contains `logic.azure.com` (pre-2025 domain, now deprecated).

**Phase to address:** Phase 1 and Phase 2 setup. Document the constant locations clearly. Revisit during Phase 2 when the Analytics read URL is added.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcoded endpoint URL in source | Simple initial setup | Requires code release + redistribution every time PA team regenerates the flow | Only for Phase 1 MVP; add a config mechanism in Phase 2 |
| No retry logic on tracking fetch | Simpler fire-and-forget | Occasional dropped events on network flakes; no observable loss for fire-and-forget | Acceptable — fire-and-forget is the stated requirement |
| PA flows owned by individual user | Fast setup | Flow auto-disables if user leaves BCP; 90-day timeout risk | Never for production; assign to shared team account from day 1 |
| Testing tracking with Postman only | Fast iteration | CORS issues missed until plugin integration | Never — always test with an actual browser fetch |
| No schema validation on PA payload | Simpler flow | Malformed rows in Excel if payload shape changes; silent data corruption | Never — add JSON Schema to the PA trigger from day 1 |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Power Automate HTTP trigger | Not adding `Access-Control-Allow-Origin: *` in Response action | Add header explicitly in every PA flow Response action; test from browser |
| Power Automate HTTP trigger | Testing only via Postman (bypasses CORS) | Test via `fetch()` in browser DevTools or the actual Figma plugin in dev mode |
| Excel Online "Add a row" | Excel file not open in OneDrive when flow runs (file lock) | Keep Excel file closed or use SharePoint-hosted file which handles concurrent access better |
| Excel Online "List rows" | Default limit of 256 rows returned silently | Enable Pagination in the List rows action settings; set threshold to 5,000+ |
| Excel Online "List rows" | Table not pre-created — connector requires a named Table object | Create the Excel file with a formatted Table (not just a range) before connecting PA |
| figma.fileKey | Using it without `enablePrivatePluginApi: true` in manifest | Set flag in manifest; test that the key is non-null before sending tracking event |
| figma.currentUser | Assuming it always has a name | Guard: `figma.currentUser?.name ?? 'Unknown'` — currentUser can be null in some contexts |
| manifest.json networkAccess | PA domain not listed in `allowedDomains` | Add `*.api.powerplatform.com` (new PA domain) to `allowedDomains`; old `*.logic.azure.com` no longer needed |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Analytics plugin fetches all rows on every open | Slow dashboard load as Excel grows | PA read flow should accept filter params (date range, designer) and apply them server-side in PA before returning JSON | At ~500+ rows (depends on PA response time) |
| PA flow cold start delay on GET | Analytics dashboard takes 5–15 seconds to load on first open | Expected behavior; show a loading state in the UI. Flows "warm up" after first invocation | Every time flow hasn't been triggered recently |
| Figma plugin UI making fetch before `figma.currentUser` resolves | Tracking payload sent with null userName | Read `figma.currentUser` synchronously (it's available immediately in the sandbox) before initiating the fetch | Day 1 if not guarded |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| PA HTTP trigger URL committed to public GitHub repo | Anyone with the URL can POST arbitrary rows to the Excel sheet | Keep URL as placeholder in committed code; distribute real URL via private channel (e.g., Notion doc, Teams message) to the team |
| No JSON Schema on PA HTTP trigger | Malformed payloads accepted silently, garbage rows in Excel | Define JSON Schema in the PA trigger's "Request Body JSON Schema" field from day 1 |
| Using `allowedDomains: ["*"]` in manifest | Figma Community requires public justification; exposes plugin to make requests to any domain | Use specific domain: `["*.api.powerplatform.com"]` or the exact PA environment domain |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Tracking failure surfaces as an error notification | Designer is confused or alarmed by a network error unrelated to their work | Wrap tracking fetch in `.catch(() => {})` — complete silence on failure is the correct behavior |
| Analytics dashboard has no loading state | Designer thinks the plugin crashed when PA cold-start takes 10+ seconds | Show spinner with "Loading data..." from the moment fetch is initiated |
| Analytics dashboard shows raw ISO timestamps | Leaders cannot parse `2026-03-05T14:32:00Z` at a glance | Format dates as `DD/MM/YYYY HH:mm` in the plugin UI before rendering |
| Dashboard shows `undefined` for files with no fileKey | Leaders see blank rows for local drafts | Display `figma.root.name` as the filename fallback; never expose raw undefined values |

---

## "Looks Done But Isn't" Checklist

- [ ] **Tracking fires silently on failure:** Verify that a 500 from PA or a network timeout does NOT display any error to the designer. Test by pointing `TRACKING_ENDPOINT_URL` to a non-existent URL.
- [ ] **CORS on both flows:** Verify that both the POST (tracking) and GET (analytics read) PA flows return `Access-Control-Allow-Origin: *`. Test with browser DevTools Network tab, not Postman.
- [ ] **fileKey guard in payload:** Verify `fileId` field is never `undefined` in the sent payload. Log the payload in dev mode before the fetch.
- [ ] **allowedDomains includes PA domain:** Confirm the PA environment URL domain is listed in `manifest.json` `networkAccess.allowedDomains`. A CSP error in the plugin console means the domain is missing.
- [ ] **Excel table exists before flow runs:** Confirm the PA team has pre-created the Excel file with a named Table before the first tracking event is sent. "Add a row" fails silently if no table exists.
- [ ] **PA flows owned by shared account:** Confirm flows are not owned by an individual BCP employee's personal M365 account.
- [ ] **256-row pagination enabled:** Confirm the "List rows" flow has Pagination enabled before testing the Analytics dashboard with more than 256 evaluation records.
- [ ] **Tracking inserted after score calculation:** Confirm the tracking call is placed after `evaluateCurrentPage()` resolves and the score is available — not before.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| CORS not configured on PA flows | LOW | Open each PA flow, add Response action with CORS header, save. No code change needed in plugin. |
| PA flow auto-disabled | LOW | Re-enable the flow in PA portal. Set up heartbeat schedule to prevent recurrence. |
| PA trigger URL changed | MEDIUM | Update `TRACKING_ENDPOINT_URL` constant in source, rebuild plugin, redistribute to team. If Analytics URL also changed, update Analytics plugin too. |
| figma.fileKey undefined (missing manifest flag) | LOW | Add `"enablePrivatePluginApi": true` to manifest.json, rebuild, redistribute. |
| Excel table missing / wrong structure | MEDIUM | PA team must recreate Excel file with correct table schema. Existing rows cannot be recovered if never written. Verify structure in a staging run before production. |
| 256-row pagination not enabled | LOW | Open PA read flow, enable Pagination in List rows settings, save. No code change in plugin. |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| CORS headers missing in PA Response action | Phase 1 (integration test of tracking POST) | `fetch()` test from browser DevTools returns 200 with `Access-Control-Allow-Origin: *` header |
| figma.fileKey undefined | Phase 1 (manifest setup) | `console.log(figma.fileKey)` in dev mode returns a non-undefined string |
| PA flow auto-disables after 90 days | Phase 1 handoff | Flow is assigned to a team account; heartbeat schedule documented or configured |
| PA trigger URL changes | Phase 1 and Phase 2 setup | `TRACKING_ENDPOINT_URL` and `ANALYTICS_READ_URL` are single-line constants with a clear comment |
| Excel table missing or wrong structure | Phase 1 pre-launch | PA team confirms table exists; a test row is written and visible in Excel before launch |
| 256-row pagination not enabled in PA read flow | Phase 2 (Analytics plugin integration test) | Test read with >256 rows; all rows returned |
| PA cold-start latency on analytics GET | Phase 2 (Analytics UI) | Loading spinner shown immediately; no blank screen during wait |
| Tracking fires before score is computed | Phase 1 (tracking insertion point) | Verify payload in dev logs shows `overallScore` with a numeric value |

---

## Sources

- [Making Network Requests — Figma Developer Docs](https://developers.figma.com/docs/plugins/making-network-requests/) — CORS null origin restriction, allowedDomains enforcement (HIGH confidence)
- [figma API reference — figma.fileKey](https://developers.figma.com/docs/plugins/api/figma/) — requires enablePrivatePluginApi (HIGH confidence)
- [Figma Forum: figma.fileKey is undefined](https://forum.figma.com/ask-the-community-7/figma-filekey-is-undefined-41748) — public plugin vs private plugin distinction (MEDIUM confidence)
- [Limits of automated, scheduled, and instant flows — Microsoft Learn](https://learn.microsoft.com/en-us/power-automate/limits-and-config) — PA throughput and retention limits (HIGH confidence, updated 2026-01-26)
- [PA HTTP Trigger URL Migration to api.powerplatform.com — John Liu .NET](https://johnliu.net/blog/2025/9/about-the-old-trigger-url-will-stop-working-on-november-30-2025) — URL deprecation confirmed (MEDIUM confidence)
- [Power Automate flow auto-disables after 90 days — Marks Group](https://www.marksgroup.net/blog/microsoft-flow-flows-automatically-turn-off/) — 90-day inactivity policy (MEDIUM confidence, multiple community sources agree)
- [Power Automate: How to Read More Than 256 Rows — Ellis Karim's Blog](https://elliskarim.com/2025/04/19/power-automate-how-to-read-more-than-256-rows-from-an-excel-table/) — 256-row default limit and pagination fix (MEDIUM confidence)
- [Rows missing after Add a row into a table — Power Platform Community](https://powerusers.microsoft.com/t5/Building-Flows/Rows-missing-in-Excel-file-after-using-Add-a-row-into-a-table/td-p/519105) — Excel concurrency issue (MEDIUM confidence)
- [CORS and the null origin — MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Access-Control-Allow-Origin) — null origin browser behavior (HIGH confidence)

---
*Pitfalls research for: Figma plugin tracking via fetch() to Power Automate + Excel Online*
*Researched: 2026-03-05*
