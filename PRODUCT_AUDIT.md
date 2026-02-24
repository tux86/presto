# Presto Product Audit & Roadmap

> **Date:** 2026-02-24
> **Scope:** Full codebase review (schema, routes, services, frontend, shared types)

---

## P0 — Bugs & Anomalies (Fixed)

### ~~#2. Misleading delete confirmation messages~~ DONE

Updated all 5 i18n files. Messages now accurately explain that deletion is blocked when related records exist, instead of falsely claiming cascade deletion.

### ~~#3. Entry value cycle order~~ DONE

Changed cycle in both `CalendarDay.tsx` and `ListDayRow.tsx` from `0 → 1 → 0.5 → 0` to `0 → 0.5 → 1 → 0` (natural incrementing order).

### ~~#6. Utilization rate ignores holidays~~ DONE

`getWorkingDaysInYear()` now accepts an optional `country` parameter and subtracts public holidays. Reporting service passes the user's most common holiday country from their completed reports.

---

## P0 — Remaining Anomalies

### #1. No daily rate on Client entity

Missions have an optional `dailyRate`, but clients don't. Freelancers often have a standard rate per client that applies across all missions. Currently, the rate must be set on every mission individually.

**Plan:** Add optional `defaultDailyRate` field to Client schema. When creating a mission, pre-fill the rate from the client. Existing mission-level override stays as-is.

### #4. COMPLETED → DRAFT revert has no safeguard

A completed (validated) report can be silently reverted to draft. Once a report is sent to a client, reverting should require confirmation.

**Plan:** Add a confirmation dialog on the frontend when clicking "Revert to draft" on a completed report. No backend changes needed — the guard is purely UX.

### #7. No startDate/endDate enforcement on missions

Mission date range fields exist but are purely informational. Nothing prevents creating an activity report outside the mission's date range.

**Plan:** Add backend validation in `POST /api/activity-reports` — if the mission has a start/end date, reject report creation for months outside that range. Show a clear error in the UI.

---

## P1 — Must-Have Features

### #8. Duplicate/Clone report

Freelancers with stable schedules need to clone last month's report as a starting point.

**Plan:** Add `POST /api/activity-reports/:id/clone` endpoint that copies entry values/notes to a new month. Add "Clone to next month" button in the report editor info panel. Validate no duplicate exists for the target month.

### #11. Dashboard "current month" shortcut

No quick way to jump to or highlight the current month's report.

**Plan:** Auto-scroll to current month section on dashboard load. Add a visual highlight (e.g. "Current" badge) on the current month's report card. Add a floating "Today" button when scrolled away.

### #14. Better deletion error UX

When deletion is blocked by FK RESTRICT, the user gets a generic 409 error.

**Plan:** Backend: return structured error with `reason` and `dependentCount` in the 409 response. Frontend: show a specific error message like "Cannot delete — this client has 3 missions. Remove them first." with a link to navigate to the dependent records.

### #15. Data export (CSV/Excel)

No way to export raw data for accountants or tax filing.

**Plan:** Add `GET /api/reporting/export?year=X&format=csv` endpoint. Generate CSV with columns: Client, Mission, Month, Year, Days, Daily Rate, Revenue, Currency. Add "Export CSV" button on the Reporting page.

---

## P2 — Should-Have Features

### #5. Exchange rate fallback

If `er-api.com` is unreachable, the entire reporting dashboard returns 503.

**Plan:** Cache last successful rates to database (new `exchange_rates_cache` table). On API failure, fall back to cached rates with a "rates may be outdated" warning in the response. Show a non-blocking banner in the UI.

### #10. Invoice generation

The #1 product gap. The app tracks days and revenue but stops short of generating invoices.

**Plan:** New `invoices` table (number, date, dueDate, taxRate, paymentTerms, bankDetails, status). New `Invoice` PDF template via `@react-pdf/renderer`. Link invoices to one or more completed activity reports. Add invoice settings to user profile (bank details, VAT number, default payment terms). New `/invoices` page with CRUD + PDF export.

### #13. Mission archive

Inactive missions still clutter the mission list.

**Plan:** Add `isArchived` boolean to Mission schema (default false). Archived missions hidden by default with a "Show archived" toggle. Archived missions cannot have new reports created against them.

### #20. Unfilled month indicators

No mechanism to alert users about missing or incomplete reports.

**Plan:** On the dashboard, for each active mission, compute which months in the current year have no report or have a report with 0 days. Show a warning indicator (e.g. amber dot + tooltip "3 months without reports for Mission X").

---

## P3 — Nice-to-Have Enhancements

### #9. Bulk report creation (multi-month)

**Plan:** Extend the "New activity" modal with a date range picker (from month → to month). Backend creates multiple reports in a single transaction.

### #12. Report notes visible from dashboard

**Plan:** Add a small note icon/excerpt on dashboard report cards when a note exists. Tooltip or expandable section shows the full note.

### #16. Recurring/template reports

**Plan:** Add "Use as template" toggle on reports. On month rollover, auto-suggest creating next month's report with same entry pattern. Implement as a "Clone from previous" suggestion rather than full automation.

### #17. Multi-mission monthly view

**Plan:** New `/calendar` page showing a unified monthly calendar with all missions. Color-coded by client. Click a day to see/edit entries across all reports for that date.

### #18. Annual summary PDF

**Plan:** Add `GET /api/reporting/pdf?year=X` endpoint. Generate a year-end summary PDF with all clients, missions, monthly totals, and grand total. Useful for tax declarations.

### #19. Report approval workflow

**Plan:** Add `SUBMITTED` status between DRAFT and COMPLETED. Optional — only used if client-facing sharing (#23) is implemented. Submitted reports are read-only but not yet finalized.

### #21. Quick entry from dashboard

**Plan:** Add a "Mark today" widget on the dashboard. Shows active missions with today's entry status. One-click toggle to mark the day as worked (1) or half-day (0.5).

### #22. Per-entry hourly rate or amount override

**Plan:** Add optional `hours` field to ReportEntry. If set, revenue = hours x hourly rate instead of days x daily rate. Requires adding hourly rate option alongside daily rate on missions.

### #23. Client-facing report sharing (read-only link)

**Plan:** Add `shareToken` (nanoid) column to ActivityReport. New public route `GET /api/shared/:token` returns read-only report data. No auth required. Share button in report editor generates/revokes the link.

### #24. Backup/restore

**Plan:** Add `GET /api/export` (full JSON dump of user data) and `POST /api/import` (restore from JSON). Include clients, missions, reports, entries, settings. Add UI in user profile settings.

### #25. Keyboard shortcuts in calendar view

**Plan:** Arrow keys to navigate between days, Enter/Space to cycle value, Tab to focus note input, Escape to deselect. Use a `useCalendarKeyboard` hook with `useEffect` keydown listener.

---

## Priority Matrix

| Priority | Item | Status | Impact | Effort |
|----------|------|--------|--------|--------|
| **P0 — Fix** | #2 Misleading delete message | DONE | Low | Low |
| **P0 — Fix** | #3 Entry cycle order | DONE | Medium | Low |
| **P0 — Fix** | #6 Utilization ignores holidays | DONE | Medium | Low |
| **P0 — Fix** | #1 Default daily rate on Client | TODO | Medium | Low |
| **P0 — Fix** | #4 Revert-to-draft safeguard | TODO | Low | Low |
| **P0 — Fix** | #7 Mission date range enforcement | TODO | Low | Low |
| **P1 — Must-have** | #8 Duplicate/clone report | TODO | High | Low |
| **P1 — Must-have** | #11 Current month shortcut | TODO | High | Low |
| **P1 — Must-have** | #14 Better deletion error UX | TODO | Medium | Low |
| **P1 — Must-have** | #15 CSV/Excel export | TODO | High | Medium |
| **P2 — Should-have** | #5 Exchange rate fallback | TODO | Medium | Medium |
| **P2 — Should-have** | #10 Invoice generation | TODO | Very High | High |
| **P2 — Should-have** | #13 Mission archive | TODO | Medium | Low |
| **P2 — Should-have** | #20 Unfilled month indicators | TODO | High | Medium |
| **P3 — Nice-to-have** | #9 Bulk report creation | TODO | Medium | Low |
| **P3 — Nice-to-have** | #12 Notes on dashboard cards | TODO | Low | Low |
| **P3 — Nice-to-have** | #16 Recurring/template reports | TODO | Medium | Medium |
| **P3 — Nice-to-have** | #17 Multi-mission monthly view | TODO | High | High |
| **P3 — Nice-to-have** | #18 Annual summary PDF | TODO | Medium | Medium |
| **P3 — Nice-to-have** | #19 Report approval workflow | TODO | Medium | High |
| **P3 — Nice-to-have** | #21 Quick entry from dashboard | TODO | Medium | Medium |
| **P3 — Nice-to-have** | #22 Per-entry hourly rate | TODO | Medium | High |
| **P3 — Nice-to-have** | #23 Client-facing share link | TODO | High | Medium |
| **P3 — Nice-to-have** | #24 Backup/restore | TODO | Medium | Medium |
| **P3 — Nice-to-have** | #25 Keyboard shortcuts | TODO | Medium | Medium |

---

## Suggested Implementation Order

**Sprint 1 — Quick wins (P0 remaining + P1 low-effort)**
1. #4 Revert-to-draft confirmation dialog
2. #1 Default daily rate on Client
3. #7 Mission date range enforcement
4. #8 Duplicate/clone report
5. #11 Current month dashboard shortcut

**Sprint 2 — Core value (P1 remaining + P2 low-effort)**
6. #14 Better deletion error UX
7. #13 Mission archive
8. #15 CSV/Excel export
9. #12 Notes on dashboard cards

**Sprint 3 — Reliability & reporting**
10. #5 Exchange rate fallback
11. #20 Unfilled month indicators
12. #18 Annual summary PDF
13. #9 Bulk report creation

**Sprint 4 — Invoicing**
14. #10 Invoice generation (full feature)

**Sprint 5 — Power user features**
15. #25 Keyboard shortcuts
16. #21 Quick entry from dashboard
17. #24 Backup/restore
18. #23 Client-facing share link

**Backlog**
19. #16 Recurring/template reports
20. #17 Multi-mission monthly view
21. #19 Report approval workflow
22. #22 Per-entry hourly rate
