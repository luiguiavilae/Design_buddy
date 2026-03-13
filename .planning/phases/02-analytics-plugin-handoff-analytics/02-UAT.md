---
status: testing
phase: 02-analytics-plugin-handoff-analytics
source: [02-01-SUMMARY.md, 02-02-SUMMARY.md]
started: 2026-03-06T00:00:00Z
updated: 2026-03-06T00:00:00Z
---

## Current Test

number: 1
name: Plugin Opens & Shows Loading State
expected: |
  Open Figma, load the analytics-plugin from Plugins menu. The plugin window appears and immediately shows a loading spinner/indicator for about 1 second while it fetches mock data.
awaiting: user response

## Tests

### 1. Plugin Opens & Shows Loading State
expected: Open Figma, load the analytics-plugin. The plugin window appears and immediately shows a loading spinner/indicator for about 1 second while it fetches mock data.
result: [pending]

### 2. Mock Data Loads — 10 Rows Visible
expected: After the ~1 second loading delay, the table populates with 10 evaluation rows. Designers include names like Andrea Torres, Carlos Mendoza, Lucia Quispe, Diego Vargas. Scores range from 45 to 95.
result: [pending]

### 3. Summary Bar Shows Global Average
expected: At the top of the dashboard, a summary bar shows the global average score (a number) and the total row count. These numbers reflect all 10 mock rows.
result: [pending]

### 4. Score Color Coding
expected: Score badges in the table use color coding: red for scores below 60, yellow for 60–80, and green for above 80. You can verify this by looking at the score column across the 10 rows.
result: [pending]

### 5. Designer Dropdown Filter
expected: A dropdown lets you select a specific designer (e.g., "Andrea Torres"). Selecting one filters the table to only show that designer's rows, and the summary bar updates to reflect the filtered count and average.
result: [pending]

### 6. Date Preset Filters (All / Week / Month)
expected: Three date filter buttons are visible — "All", "Week" (last 7 days), "Month" (last 30 days). Clicking "Week" or "Month" filters the table to only rows within that time range. The summary updates accordingly. Clicking "All" restores all rows.
result: [pending]

### 7. Empty State When Filters Match Nothing
expected: If you combine a designer filter and a narrow date range that has no matching rows, the table area shows an empty state message (e.g., "No hay evaluaciones" or similar explanation) instead of a blank table.
result: [pending]

### 8. Sticky Table Headers & Column Ellipsis
expected: When the table has many rows, scrolling down keeps the column headers visible (sticky). Long file names or designer names are truncated with "…" rather than breaking the layout.
result: [pending]

## Summary

total: 8
passed: 0
issues: 0
pending: 8
skipped: 0

## Gaps

[none yet]
