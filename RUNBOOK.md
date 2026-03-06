# Designer Buddy — Tracking Module Runbook

**Audience:** BCP Design Operations team member responsible for configuring the evaluation tracking system.
**Last updated:** 2026-03-06

---

## Overview

Designer Buddy includes a silent tracking module that automatically records handoff evaluations to an Excel table in OneDrive or SharePoint. Every time a designer runs an evaluation inside Figma, the plugin fires a POST request to a Power Automate (PA) HTTP flow, which writes one row to an Excel table named `EvaluationsTable`. The tracking is invisible to designers — no UI changes, no spinners, no error messages if the endpoint is unreachable.

To activate tracking, the BCP team must complete three steps: create the Excel table, create the Power Automate Tracking Writer flow, and paste the resulting PA trigger URL into the plugin source code. This document walks through each step end-to-end.

---

## Prerequisites

Before starting, confirm you have:

- A **Power Automate** license with permission to create flows that use the **HTTP trigger** (requires at minimum a Power Automate per-user or per-flow plan — the free tier does not include HTTP triggers).
- Access to **SharePoint Online or OneDrive for Business** where the tracking Excel workbook will live.
- The Designer Buddy plugin installed in your Figma account (for end-to-end verification in Step 4).
- Access to the **Designer Buddy plugin source code** (`src/modules/tracking/index.ts`) — either directly as a developer, or a contact who can make the code change and rebuild the plugin.
- Access to **Power Automate portal** at [make.powerautomate.com](https://make.powerautomate.com).

---

## Step 1: Create the Excel EvaluationsTable

1. Open **OneDrive for Business** or navigate to the SharePoint site where you want to store tracking data.
2. Create a new **Excel workbook**. Name it something recognizable, for example: `DesignerBuddy-Tracking.xlsx`.
3. Open the workbook in Excel Online.
4. In **Sheet1** (or any sheet), enter the following column headers in row 1, in this exact order:

   | Column | Header text | Excel column type |
   |--------|-------------|-------------------|
   | A | `fileId` | Text |
   | B | `fileName` | Text |
   | C | `pageName` | Text |
   | D | `userName` | Text |
   | E | `overallScore` | Number |
   | F | `timestamp` | Text |

   > **Important:** `timestamp` is stored as a plain text string in ISO 8601 format (e.g., `2026-03-06T14:23:11.000Z`), not as an Excel date value. Set the column type to **Text** to prevent Excel from interpreting it as a number.

5. Select all six header cells plus at least one empty row below them (A1:F2).
6. Go to **Insert → Table**. Check "My table has headers." Click **OK**.
7. Click the table. In the **Table Design** tab (or Table Tools), change the **Table Name** to exactly: `EvaluationsTable`

   > The table name must match exactly — Power Automate uses it to locate the table when writing rows. Capitalization matters.

8. Save the workbook.

---

## Step 2: Create the Power Automate Tracking Writer Flow

### 2a. Create the flow

1. Go to [make.powerautomate.com](https://make.powerautomate.com).
2. Click **Create** → **Instant cloud flow**.
3. Name it: `Designer Buddy — Tracking Writer`.
4. Select trigger: **When an HTTP request is received**.
5. Click **Create**.

### 2b. Configure the HTTP trigger

1. Click the trigger card to expand it.
2. In the **Request Body JSON Schema** field, paste the following schema exactly:

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

   > Pasting the schema tells Power Automate to parse the incoming JSON and expose each property as a dynamic content token. Without the schema, the flow cannot map individual fields to Excel columns.

### 2c. Add the Excel row action

1. Click **+ New step**.
2. Search for **Excel Online (Business)**.
3. Select action: **Add a row into a table**.
4. Fill in the action fields:
   - **Location:** Select your SharePoint site or OneDrive for Business
   - **Document Library:** Documents (or the library where you saved the Excel file)
   - **File:** Select `DesignerBuddy-Tracking.xlsx`
   - **Table:** Select `EvaluationsTable`
5. Map each column using the dynamic content tokens from the HTTP trigger:

   | Column | Value (dynamic content) |
   |--------|------------------------|
   | fileId | `fileId` |
   | fileName | `fileName` |
   | pageName | `pageName` |
   | userName | `userName` |
   | overallScore | `overallScore` |
   | timestamp | `timestamp` |

### 2d. Add the Response action (required for CORS)

1. Click **+ New step**.
2. Search for **Response**.
3. Select the **Request → Response** action.
4. Configure it as follows:
   - **Status Code:** `200`
   - **Headers:** Add a new header:
     - Name: `Access-Control-Allow-Origin`
     - Value: `*`
   - **Body:** (leave empty or put `{}`)

   > **This header is required.** Without `Access-Control-Allow-Origin: *`, the Figma plugin developer console will log a CORS error on every evaluation. The tracking data still reaches Excel (because fire-and-forget discards the response), but the error clutters debugging sessions. Add the header from day one.

### 2e. Save and copy the trigger URL

1. Click **Save**.
2. After saving, click the HTTP trigger card again to expand it.
3. Copy the **HTTP POST URL**. It will look like:

   ```
   https://prod-xx.westus.logic.azure.com:443/workflows/...
   ```

   or more commonly for newer environments:

   ```
   https://prod-xx.xxxxxxxxxx.api.powerplatform.com/...
   ```

4. Store this URL securely. You will need it in Step 3.

   > **Security note:** This URL is a secret. Anyone who has it can write rows to your Excel table. Do not post it in Slack, GitHub, Jira, or any public channel. Share it only via Notion, Teams private message, or a secure credential store.

---

## Step 3: Configure the Plugin with the Endpoint URL

1. Open `src/modules/tracking/index.ts` in the Designer Buddy repository.
2. At the top of the file, find this line:

   ```typescript
   export const TRACKING_ENDPOINT_URL = ''
   ```

3. Replace the empty string with the PA trigger URL you copied in Step 2e:

   ```typescript
   export const TRACKING_ENDPOINT_URL = 'https://prod-xx.xxxxxxxxxx.api.powerplatform.com/...'
   ```

4. Save the file.
5. Rebuild the plugin:

   ```bash
   npm run build
   ```

6. Distribute the updated plugin binaries to your team:
   - `dist/main.js`
   - `dist/ui.html`

   Replace the existing binaries wherever the plugin is hosted or distributed internally.

   > **Warning:** Never commit the real URL to the public GitHub repository. The repo is public and the URL is a secret endpoint. If you accidentally commit it, regenerate the PA trigger URL immediately by recreating the flow trigger, then update the constant and rebuild.

---

## Step 4: Verify the Integration

### 4a. Test with Postman or Hoppscotch (recommended first)

Before testing from Figma, verify that the PA flow works correctly with a direct HTTP request.

Send a POST request to the trigger URL with this example payload:

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

Headers to include:
- `Content-Type: application/json`

Expected response: HTTP `200 OK` with `Access-Control-Allow-Origin: *` in the response headers.

After sending, open the Excel workbook and confirm a new row appeared in `EvaluationsTable` within ~30 seconds.

### 4b. Test from Figma

1. Open Designer Buddy in a Figma file (cloud-hosted file, not a local draft).
2. Run a handoff evaluation on any page.
3. After the evaluation result appears, wait ~30 seconds.
4. Open the Excel workbook and confirm a new row appeared in `EvaluationsTable`.
5. Check the PA flow run history at [make.powerautomate.com](https://make.powerautomate.com) — the run should show as **Succeeded**.

### 4c. Common verification issues

- **Rows show `Unknown` for `userName`:** The plugin binary is missing the `currentuser` permission. Check that `manifest.json` contains `"permissions": ["currentuser"]` and rebuild.
- **`fileId` values end in `_local`:** The designer is working in a local draft file that has not been saved to Figma cloud. This is expected behavior — the plugin falls back to the file name with a `_local` suffix. Instruct designers to evaluate cloud-hosted files for accurate `fileId` tracking.
- **No rows appear and PA run history is empty:** The PA trigger URL domain may not be in `manifest.json`. Confirm `*.api.powerplatform.com` is listed in `networkAccess.allowedDomains`.
- **CORS error in Figma developer console:** The PA Response action is missing `Access-Control-Allow-Origin: *`. Return to Step 2d and add the header, then save and re-save the flow.

---

## Heartbeat Plan (Ongoing Operations)

Power Automate HTTP trigger flows auto-disable after **90 days of inactivity**. If the flow auto-disables, tracking stops silently — no errors appear to designers, rows simply stop appearing in Excel.

### Monthly heartbeat procedure

Every **30 days**, a named owner (recommended: the Design Ops lead or whoever owns the BCP design tooling) must:

1. Open Designer Buddy in any Figma cloud file.
2. Run a full handoff evaluation.
3. Wait 30 seconds, then check the `EvaluationsTable` in Excel.
4. Confirm a new row appeared with the correct data.
5. Log the check date in a Notion page or internal doc (e.g., "Tracking heartbeat — 2026-04-06 — OK").

If the row does not appear, follow the troubleshooting steps below and check whether the PA flow was auto-disabled.

### If the flow is auto-disabled

1. Go to [make.powerautomate.com](https://make.powerautomate.com).
2. Find the `Designer Buddy — Tracking Writer` flow.
3. Click **Turn on** to re-enable it.
4. Check whether the HTTP trigger URL changed after re-enabling (it sometimes does).
5. If the URL changed, follow the URL Rotation Procedure below.

**Assigned owner:** _[Fill in name and role before distributing this runbook]_

---

## URL Rotation Procedure

The PA trigger URL must be updated whenever:
- The flow is recreated from scratch.
- The PA environment is migrated to a new tenant.
- The URL is accidentally exposed and must be regenerated for security reasons.
- The trigger URL changes after a flow re-enable.

### Steps to rotate the URL

1. Get the new trigger URL from the PA flow trigger card (expand the HTTP trigger in the flow editor).
2. Open `src/modules/tracking/index.ts` in the Designer Buddy repository.
3. Update `TRACKING_ENDPOINT_URL`:

   ```typescript
   export const TRACKING_ENDPOINT_URL = 'https://new-url-here...'
   ```

4. Save and rebuild:

   ```bash
   npm run build
   ```

5. Distribute the updated `dist/main.js` and `dist/ui.html` to all team members.
6. Verify with a test evaluation that rows appear in Excel again (Step 4b above).

**Never share the URL via public channels or commit it to git.** Use Notion, Teams private message, or a secure credential store exclusively.

---

## Troubleshooting Quick Reference

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| No rows appearing in Excel | `TRACKING_ENDPOINT_URL` is empty string or the URL is stale | Update the constant in `src/modules/tracking/index.ts` and rebuild |
| `[Tracking]` CORS error in plugin dev console | `Access-Control-Allow-Origin: *` header missing in PA Response action | Add the header in the PA flow Response action (Step 2d), save and re-save the flow |
| All rows show `Unknown` for `userName` | Plugin binary missing `currentuser` permission in `manifest.json` | Verify `"permissions": ["currentuser"]` exists in `manifest.json`, rebuild and redistribute |
| All `fileId` values end in `_local` | Designer is evaluating a local draft file not saved to Figma cloud | Inform designers to use cloud-hosted Figma files; `_local` suffix is expected fallback behavior |
| PA flow run history shows no activity | PA URL domain not in `manifest.json` `allowedDomains` | Confirm `*.api.powerplatform.com` is listed in `networkAccess.allowedDomains` in `manifest.json` |

---

## Appendix: Key Files Reference

| File | Purpose |
|------|---------|
| `src/modules/tracking/index.ts` | Contains `TRACKING_ENDPOINT_URL` — edit this to activate tracking |
| `src/types/tracking.ts` | TypeScript interface for the tracking event payload |
| `src/messageRouter.ts` | Calls the tracking module after each handoff evaluation completes |
| `manifest.json` | Contains `permissions`, `enablePrivatePluginApi`, and `allowedDomains` entries required for tracking |
| `dist/main.js` | Plugin sandbox binary — redistribute after rebuilding |
| `dist/ui.html` | Plugin UI binary — redistribute after rebuilding |
