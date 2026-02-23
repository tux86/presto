# Presto

Activity report time-tracking app. Monorepo with 3 packages.

## Tech Stack

- **Runtime:** Bun
- **Frontend:** React 19, Vite 6, Tailwind CSS 4, Zustand, TanStack Query, React Router 7, Recharts
- **Backend:** Hono 4, Drizzle ORM, @react-pdf/renderer
- **Database:** PostgreSQL, MySQL/MariaDB, SQLite — runtime dialect switching via `DB_PROVIDER` env var or auto-detected from `DATABASE_URL`
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
bun run test               # Run API E2E tests (in-memory SQLite, no DB needed)
bun run db:generate        # Generate Drizzle migrations (uses DB_DIALECT env var)
bun run db:migrate         # Apply migrations programmatically
bun run db:reset           # Wipe all data (for dev)
bun run db:seed            # Seed sample data (run db:reset first)
bun run db:studio          # Open Drizzle Studio
docker compose up -d       # Start PostgreSQL (dev)
```

## Docker

- `docker-compose.yml` — dev: PostgreSQL (DB explorer: `bun run db:studio` → Drizzle Studio)
- `docker-compose.production.yml` — production: PostgreSQL + Presto app (:8080)
- `Dockerfile` — multi-stage build, single image, migrations run programmatically at startup

## Path Aliases

- Frontend: `@/*` → `packages/frontend/src/*`

## Backend Patterns

- **Routes:** all prefixed with `/api`: `auth`, `clients`, `missions`, `activity-reports`, `reporting`, `health`, `config`
- **Errors:** throw `HTTPException` from `hono/http-exception` — don't use `c.json()` with error status codes
- **ORM:** Drizzle ORM with runtime dialect factory in `src/db/index.ts` — exports `db`, table references, and relations
- **Schemas:** per-dialect schema files in `src/db/schema/{pg,mysql,sqlite}.schema.ts`
- **Ownership checks:** use `findOwned(model, id, userId)` from `db/helpers.ts` — returns the record, throws 404
- **Status guards:** use `ensureDraft(report)` from `lib/helpers.ts` — throws 400 if report is completed
- **Utilities:** `slugify()` in `lib/helpers.ts` for filename-safe strings
- **Query helpers:** `insertReturning()`, `updateReturning()` in `db/helpers.ts` — handle MySQL's lack of RETURNING
- **Relational includes:** use `REPORT_WITH` / `REPORT_WITH_PDF` constants from `db/helpers.ts`
- **Config:** all env vars accessed via `lib/config.ts` — never read `process.env` directly in routes
- **IDs:** CUID2 generated in JS via `@paralleldrive/cuid2` — works on all dialects

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
- **Database:** in-memory SQLite (`DATABASE_URL=file::memory:`) — fresh each run, no external DB needed
- **Setup:** preload script (`setup.ts`) runs Drizzle migrations before tests
- **Ordering:** single entry file (`api.test.ts`) imports all suites sequentially (Bun doesn't guarantee alphabetical file discovery order)
- **Config:** `bunfig.toml` configures preload, `--env-file .env.test` loads test env vars
- **CI:** dedicated `test` job in CI workflow (SQLite in-memory, no service container needed)

## Code Quality

- **Linter/Formatter:** Biome (`biome.json`) — double quotes, semicolons, trailing commas, 2-space indent, 120 char line width
- **Pre-commit hook:** Biome auto-formats staged files — don't manually format
- **Commit convention:** Conventional Commits enforced by Husky + commitlint (`feat:`, `fix:`, `chore:`, etc.)
- **Commit-msg hook:** Validates commit message format

## CI/CD

- **CI** (`.github/workflows/ci.yml`): two parallel jobs — `lint-and-typecheck` (lint → typecheck → build) + `test` (SQLite in-memory) on PR/push to `main`
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

## Environment

- **`.env`** (root) — dev config: database, JWT, app settings. All `dev`, `db:*` scripts load from here.
- **`packages/backend/.env.test`** — test config: in-memory SQLite. Used only by `bun run test`.
- **`.env.example`** (root) — template with all available env vars.

## Key Conventions

- i18n: English (default), French, German, Spanish, Portuguese
- Auth is optional, controlled by `AUTH_ENABLED` env var
- Registration is controllable via `REGISTRATION_ENABLED` env var (defaults to `true`)
- `JWT_SECRET` must be at least 32 characters; known weak defaults are rejected at startup
- Registration password requires min 8 chars + uppercase + lowercase + digit
- Drizzle schemas use dialect-specific constructors — one schema file per database (pg, mysql, sqlite)
- Completed reports are read-only — no entry editing, auto-fill, or clear. Only PDF export is allowed.
