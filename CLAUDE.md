# Presto

Activity report (CRA) generator for one freelancer. Single user, local-first.

## Stack

- **Runtime:** Bun (TypeScript runs directly; no server build step in dev)
- **Server:** Hono, ~15 routes, no middleware beyond an error handler
- **Storage:** SQLite via `bun:sqlite`, raw SQL, no ORM
- **Frontend:** React 19, Vite, Tailwind CSS 4, React Router, Recharts
- **PDF:** `@react-pdf/renderer`, rendered server-side
- **Lint/format:** Biome · **Tests:** `bun test`

## Commands

```bash
bun run dev          # API :3001 + Vite :5173
bun start            # build UI, then serve everything from :3001
bun test             # ~150 tests, no database needed
bun run typecheck
bun run lint:fix
bun run build        # UI only
bun run build:server # single-file server bundle (Docker)
bun run seed --reset # deterministic demo data for development
bun run import:v1 <export.json> [--dry-run]
```

## Structure

```
src/core/    pure logic: dates, holidays, grid, totals, yearly rollup, CSV
src/db/      schema + migrations + queries
src/pdf/     the client-facing document
src/server/  routes, config, validation
src/ui/      React app
src/i18n/    en.ts (source of truth) + fr.ts, shared by UI and PDF
```

**The one architectural rule:** `src/core/` imports nothing from `db/`, `server/`, `pdf/`, or `ui/`.
Tests point at `core/` and `pdf/`; the HTTP layer gets smoke tests only.

## Things that are the way they are on purpose

- **No auth, no users, no multi-tenancy.** One person, one machine. Do not add ownership checks.
- **No `ReportEntry` table.** A month's work is two sparse JSON columns on `report`, keyed by
  day-of-month. Nothing queries across days.
- **Weekend and holiday flags are computed, never stored.** Changing a client's holiday country
  must correct every report that uses it.
- **`buildMonthGrid` takes a `HolidayLookup`, not a country string.** `date-holidays` is over a
  megabyte and must never reach the browser bundle. The server sends holiday dates with
  `/api/state` and named holidays with the report detail.
- **No currency conversion.** Revenue is grouped per currency. Do not add an FX API.
- **Theme and language live in `localStorage`**, not the database.
- **Completed reports are frozen** except the private note and the status itself.
- **`note` is printed on the client's PDF; `privateNote` never leaves the machine.** Keep them
  visually distinct in the UI, and keep the PDF test that asserts the private note is absent.

## Conventions

- Migrations: append to `MIGRATIONS` in `src/db/schema.ts`; never edit a shipped entry.
- New strings go in `src/i18n/en.ts` first — `fr.ts` is typed against it.
- Errors: throw `HTTPException`, or the helpers in `src/server/errors.ts`
  (`notFound`, `badRequest`, `required`, `assertUnused`).
- IDs: `newId()` in `src/db/index.ts` (21 hex chars from `crypto.randomUUID`).
- Conventional Commits, enforced by commitlint. Releases are automatic from `main`.

## Workflow rules

- **No unsolicited code review.** Do not critique existing code unless asked.
- **Update tests with behaviour.** Changing `core/` or a route means updating `tests/`.
- **Every dependency must justify itself.** Prefer stdlib and Bun built-ins.
