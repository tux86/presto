# Presto

Activity report time-tracking app. Monorepo with 3 packages.

## Tech Stack

- **Runtime:** Bun
- **Frontend:** React 19, Vite 6, Tailwind CSS 4, Zustand, TanStack Query, React Router 7, Recharts
- **Backend:** Hono 4, Prisma 7, @react-pdf/renderer
- **Database:** PostgreSQL 16 (supports MySQL, SQLite, SQL Server, CockroachDB via Prisma provider swap)
- **Shared:** TypeScript types + utilities (dates, country-specific holidays via `date-holidays`)
- **Testing:** Bun test runner, Hono `app.request()` (101 API E2E tests)
- **Language:** TypeScript 5.7, strict mode

## Project Structure

```
packages/
  backend/     # Hono API server (port 3001 dev, 8080 Docker)
  frontend/    # React SPA (port 5173 dev, proxies /api → backend)
  shared/      # Shared types and utils (@presto/shared)
```

## Commands

```bash
bun install                # Install all dependencies
bun run dev                # Start backend + frontend
bun run dev:backend        # Backend only (hot reload)
bun run dev:frontend       # Frontend only
bun run build              # Build all packages
bun run typecheck          # Type-check all packages
bun run lint               # Lint + format check (Biome)
bun run lint:fix           # Auto-fix lint + format issues
bun run test               # Run API E2E tests (requires presto_test DB)
bun run db:generate        # Generate Prisma client
bun run db:push            # Push schema changes to dev DB (no migration file)
bun run db:migrate         # Apply committed migrations (migrate deploy)
bun run db:migrate:dev     # Create new migration from schema changes (migrate dev)
bun run db:seed            # Seed sample data
docker compose up -d       # Start PostgreSQL + pgweb (dev)
```

## Docker

- `docker-compose.yml` — dev: PostgreSQL + pgweb (DB explorer on :8081)
- `docker-compose.production.yml` — production: PostgreSQL + Presto app (:8080)
- `Dockerfile` — multi-stage build, single image, `CMD` runs migrations then starts server

## Path Aliases

- Frontend: `@/*` → `packages/frontend/src/*`

## Backend Patterns

- **Routes:** all prefixed with `/api`: `auth`, `clients`, `missions`, `activity-reports`, `reporting`, `health`, `config`
- **Errors:** throw `HTTPException` from `hono/http-exception` — don't use `c.json()` with error status codes
- **Ownership checks:** use `findOwned(model, id, userId)` from `lib/helpers.ts` — returns the record, throws 404
- **Status guards:** use `ensureDraft(report)` from `lib/helpers.ts` — throws 400 if report is completed
- **Utilities:** `slugify()` in `lib/helpers.ts` for filename-safe strings
- **Prisma includes:** use `REPORT_INCLUDE` / `REPORT_INCLUDE_PDF` constants for consistent query shapes
- **Config:** all env vars accessed via `lib/config.ts` — never read `process.env` directly in routes

## Frontend Patterns

- **State:** Zustand stores in `stores/` for global state (auth, config, preferences)
- **Data fetching:** TanStack Query hooks per resource in `hooks/` (e.g., `use-activity-reports.ts`)
- **Components:** shared UI in `components/ui/`, feature components in `components/{feature}/`
- **Pages:** one file per route in `pages/`
- **i18n:** `useT()` hook returns `{ t, locale }` — translation files in `i18n/fr.ts` and `i18n/en.ts`
- **Responsive:** `useIsMobile()` hook + Tailwind breakpoints (375px+, 768px+, 1024px+)
- **Styling:** Tailwind utility classes, `cn()` helper for conditional classes

## Testing

- **Framework:** Bun test runner with `app.request()` (in-process, no server needed)
- **Location:** `packages/backend/tests/` — 9 test suites, 101 tests
- **Database:** isolated `presto_test` PostgreSQL database
- **Setup:** preload script (`setup.ts`) runs `prisma migrate deploy` + `TRUNCATE CASCADE` before tests
- **Ordering:** single entry file (`api.test.ts`) imports all suites sequentially (Bun doesn't guarantee alphabetical file discovery order)
- **Config:** `bunfig.toml` configures preload, `--env-file .env.test` loads test env vars
- **CI:** dedicated `test` job in CI workflow with PostgreSQL service container

## Code Quality

- **Linter/Formatter:** Biome (`biome.json`) — double quotes, semicolons, trailing commas, 2-space indent, 120 char line width
- **Pre-commit hook:** Biome auto-formats staged files — don't manually format
- **Commit convention:** Conventional Commits enforced by Husky + commitlint (`feat:`, `fix:`, `chore:`, etc.)
- **Commit-msg hook:** Validates commit message format

## CI/CD

- **CI** (`.github/workflows/ci.yml`): two parallel jobs — `lint-and-typecheck` (lint → generate → typecheck → build) + `test` (PostgreSQL service → generate → migrate → test) on PR/push to `main`
- **Release** (`.github/workflows/release.yml`): semantic-release after CI passes on `main` — auto version bump, CHANGELOG, GitHub Release
- **Docker** (`.github/workflows/docker.yml`): builds + pushes single `presto` image to GHCR on release

## User Preferences

- **Store:** `preferences.store.ts` — Zustand persist store (`presto-preferences` in localStorage)
- **Scope:** theme (light/dark/auto), locale (en/fr)
- **Defaults:** server env var `APP_LOCALE` applied on first visit via `initFromServerDefaults()`
- **Currency:** per-client field (all ISO 4217 currencies via `Intl.supportedValuesOf`)
- **Holiday country:** per-client field (all countries via `date-holidays` library)
- **Config store** (`config.store.ts`) remains read-only server config (appName, authEnabled, registrationEnabled)
- **UI:** `PreferencesMenu` component in sidebar — gear icon popover with segmented controls

## Key Conventions

- i18n: English (default) + French
- Auth is optional, controlled by `AUTH_ENABLED` env var
- Registration is controllable via `REGISTRATION_ENABLED` env var (defaults to `true`)
- `JWT_SECRET` must be at least 32 characters; known weak defaults are rejected at startup
- Registration password requires min 8 chars + uppercase + lowercase + digit
- Prisma schema uses only cross-DB compatible types (String, Float, Boolean, DateTime, Int, enum, cuid)
- Completed reports are read-only — no entry editing, auto-fill, or clear. Only PDF export is allowed.
