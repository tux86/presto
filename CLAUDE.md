# Presto

Activity report time-tracking app. Monorepo with 3 packages.

## Tech Stack

- **Runtime:** Bun
- **Frontend:** React 19, Vite 6, Tailwind CSS 4, Zustand, TanStack Query, React Router 7, Recharts
- **Backend:** Hono 4, Drizzle ORM, @react-pdf/renderer
- **Database:** PostgreSQL (Drizzle ORM)
- **Shared:** TypeScript types + utilities (dates, country-specific holidays via `date-holidays`)
- **Testing:** Bun test runner, Hono `app.request()` (222 API E2E tests)
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
bun run test               # Run API E2E tests (requires presto_test PostgreSQL DB)
bun run db:generate        # Generate Drizzle migrations
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

- **Routes:** all prefixed with `/api`: `auth`, `clients`, `missions`, `activity-reports`, `reporting`, `settings`, `health`, `config`
- **Errors:** throw `HTTPException` from `hono/http-exception` — don't use `c.json()` with error status codes
- **ORM:** Drizzle ORM with PostgreSQL in `src/db/index.ts` — exports `db`, table references, and relations
- **Schema:** `src/db/schema/pg.schema.ts` — single schema file
- **Ownership checks:** use `findOwned(model, id, userId)` from `db/helpers.ts` — returns the record, throws 404
- **Status guards:** use `ensureDraft(report)` from `lib/helpers.ts` — throws 400 if report is completed
- **Utilities:** `slugify()` in `lib/helpers.ts` for filename-safe strings
- **Query helpers:** `insertReturning()`, `updateReturning()` in `db/helpers.ts` — use PostgreSQL RETURNING clause
- **Relational includes:** use `REPORT_WITH` / `REPORT_WITH_PDF` constants from `db/helpers.ts`
- **Config:** all env vars accessed via `lib/config.ts` — never read `process.env` directly in routes
- **IDs:** nanoid (21-char alphanumeric) generated in JS via `db/id.ts`

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
- **Location:** `packages/backend/tests/` — 15 test suites, 222 tests
- **Database:** PostgreSQL test database (`presto_test`) — fresh migrations each run
- **Setup:** preload script (`setup.ts`) runs Drizzle migrations before tests
- **Ordering:** single entry file (`api.test.ts`) imports all suites sequentially (Bun doesn't guarantee alphabetical file discovery order)
- **Config:** `bunfig.toml` configures preload, `--env-file .env.test` loads test env vars
- **CI:** dedicated `test` job in CI workflow with PostgreSQL service container

## Code Quality

- **Linter/Formatter:** Biome (`biome.json`) — double quotes, semicolons, trailing commas, 2-space indent, 120 char line width
- **Pre-commit hook:** Biome auto-formats staged files — don't manually format
- **Commit convention:** Conventional Commits enforced by Husky + commitlint (`feat:`, `fix:`, `chore:`, etc.)
- **Commit-msg hook:** Validates commit message format

## CI/CD

- **CI** (`.github/workflows/ci.yml`): two parallel jobs — `lint-and-typecheck` (lint → typecheck → build) + `test` (PostgreSQL service container) on PR/push to `main`
- **Release** (`.github/workflows/release.yml`): semantic-release after CI passes on `main` — auto version bump, CHANGELOG, GitHub Release
- **Docker** (`.github/workflows/docker.yml`): builds + pushes single `presto` image to GHCR on release

## User Preferences

- **Store:** `preferences.store.ts` — Zustand in-memory store, synced to server via `GET/PATCH /api/settings`
- **Scope:** theme (light/dark/auto), locale (en/fr/de/es/pt), baseCurrency (ISO 4217)
- **DB table:** `UserSettings` (PK = `userId`, FK cascade to users) — auto-created on first `GET /api/settings`
- **Defaults for new users:** `DEFAULT_THEME`, `DEFAULT_LOCALE`, `DEFAULT_BASE_CURRENCY` env vars
- **Currency:** per-client field (billing) + per-user baseCurrency (reporting aggregation)
- **Multi-currency reporting:** revenues converted to baseCurrency via open.er-api.com (1h cache with retry)
- **Holiday country:** per-client field (all countries via `date-holidays` library)
- **Config store** (`config.store.ts`) remains read-only server config (appName, authDisabled, registrationEnabled)
- **UI:** `PreferencesMenu` component in sidebar — gear icon popover with segmented controls + currency selector

## Environment

- **`.env`** (root) — dev config: database, JWT, app settings. All `dev`, `db:*` scripts load from here.
- **`packages/backend/.env.test`** — test config: PostgreSQL test database. Used only by `bun run test`.
- **`.env.example`** (root) — template with all available env vars.

## Workflow Rules

- **No code review:** Do not review or critique existing code unless explicitly asked. Focus on the task at hand.
- **Update E2E tests:** When modifying backend routes or API behavior, always update the corresponding E2E tests in `packages/backend/tests/` to cover the changes.

## Key Conventions

- i18n: English (default), French, German, Spanish, Portuguese
- Auth is optional, disabled via `AUTH_DISABLED=true` env var
- Registration is controllable via `REGISTRATION_ENABLED` env var (defaults to `true`)
- `JWT_SECRET` must be at least 32 characters; known weak defaults are rejected at startup
- Registration password requires min 8 chars + uppercase + lowercase + digit
- Drizzle schema in `src/db/schema/pg.schema.ts` — PostgreSQL only
- Completed reports are read-only — no entry editing, auto-fill, or clear. Only PDF export is allowed.
