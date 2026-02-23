# Contributing to Presto

Thanks for your interest in contributing! Here's how to get started.

## Prerequisites

- [Bun](https://bun.sh/) (latest)
- [Docker](https://www.docker.com/) (for PostgreSQL)

## Development Setup

```bash
git clone https://github.com/tux86/presto.git
cd presto
bun install
cp .env.example .env
# Edit .env: set POSTGRES_PASSWORD and JWT_SECRET (min 32 chars)
docker compose up -d
bun run db:migrate
bun run db:generate
bun run db:seed
bun run dev
```

This starts the backend (hot reload) on `http://localhost:3001` and the frontend (Vite HMR) on `http://localhost:5173`. The frontend proxies `/api` requests to the backend.

### Commands

```bash
bun run dev              # Start backend + frontend
bun run dev:backend      # Backend only
bun run dev:frontend     # Frontend only
bun run build            # Production build (all packages)
bun run typecheck        # Type-check all packages
bun run lint             # Lint + format check (Biome)
bun run lint:fix         # Auto-fix lint + format
bun run db:generate      # Regenerate Prisma client after schema changes
bun run db:push          # Push schema changes to dev DB (no migration file)
bun run db:migrate       # Apply pending migrations (uses migrate deploy)
bun run db:migrate:dev   # Create new migration from schema changes (uses migrate dev)
bun run db:seed          # Seed sample data
bun run test             # Run API E2E tests (requires presto_test DB)
```

## Testing

API E2E tests use Bun's test runner with Hono's `app.request()` for in-process HTTP testing — no running server needed. Tests run against an isolated `presto_test` PostgreSQL database.

### One-time setup

```bash
# Create the test database
docker exec -it presto-postgres psql -U presto -c "CREATE DATABASE presto_test;"

# Create .env.test from the example
cp packages/backend/.env.test.example packages/backend/.env.test
# Edit packages/backend/.env.test: set the password to match your .env POSTGRES_PASSWORD
```

### Running tests

```bash
bun run test
```

Tests automatically run `prisma migrate deploy` and truncate all tables before each run, so your dev database is never affected.

## Project Structure

Presto is a Bun monorepo with three packages.

```
packages/
├── backend/                  # @presto/backend — Hono API server
│   ├── src/
│   │   ├── app.ts            # Hono app, route registration
│   │   ├── index.ts          # Server entry point
│   │   ├── lib/config.ts     # Environment variable configuration
│   │   └── routes/           # auth, clients, missions, activity-reports, reporting
│   └── prisma/
│       └── schema.prisma     # Database schema
├── frontend/                 # @presto/frontend — React SPA
│   └── src/
│       ├── App.tsx           # Route definitions
│       ├── pages/            # Dashboard, ActivityReportEditor, Clients, Missions, Reporting, Login
│       ├── components/       # Shared UI components
│       ├── stores/           # Zustand state stores
│       ├── hooks/            # Custom hooks (useIsMobile, etc.)
│       └── i18n/             # French and English translation files
└── shared/                   # @presto/shared — Shared types and utilities
    └── src/
        └── index.ts
```

## Environment Variables

Copy `.env.example` to `.env` and fill in the required values (`JWT_SECRET` must be at least 32 characters, `POSTGRES_PASSWORD` must be set).

### Database

| Variable | Default | Description |
|---|---|---|
| `POSTGRES_USER` | `presto` | PostgreSQL username |
| `POSTGRES_PASSWORD` | **required** | PostgreSQL password |
| `POSTGRES_DB` | `presto` | PostgreSQL database name |
| `POSTGRES_PORT` | `5432` | Host port mapped to PostgreSQL |
| `DATABASE_URL` | _(constructed)_ | Full Prisma connection string |

### Backend

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | Backend HTTP port |
| `JWT_SECRET` | **required** (min 32 chars) | Secret for signing JWT tokens |
| `AUTH_ENABLED` | `true` | Enable/disable authentication |
| `REGISTRATION_ENABLED` | `true` | Enable/disable user registration |
| `CORS_ORIGINS` | `http://localhost:5173` | Allowed CORS origins (comma-separated) |
| `APP_NAME` | `Presto` | Application name in public config API |
| `APP_THEME` | `light` | Default theme (`light` or `dark`) |
| `APP_LOCALE` | `fr` | Default locale (`fr` or `en`) |
| `DEFAULT_USER_EMAIL` | `admin@localhost` | Default admin email |
| `DEFAULT_USER_PASSWORD` | _(empty)_ | Default admin password |
| `RATE_LIMIT_MAX` | `20` | Max auth requests per IP per window (`0` to disable) |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Rate limit window in ms (default: 15 min) |

### Docker (Production)

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8080` | Host port for the Presto container |
| `POSTGRES_PASSWORD` | **required** | PostgreSQL password (no default in production) |
| `JWT_SECRET` | **required** | JWT signing secret (no default in production) |

## API Routes

All routes are prefixed with `/api`.

| Route | Description |
|---|---|
| `GET /api/health` | Health check — returns `{ status: "ok" }` |
| `GET /api/config` | Public configuration (app name, theme, locale, auth status) |
| `/api/auth/*` | Login, register, and current user (`/me`) |
| `/api/clients/*` | CRUD for clients |
| `/api/missions/*` | CRUD for missions (linked to clients) |
| `/api/activity-reports/*` | CRUD for monthly activity reports, PDF export |
| `/api/reporting/*` | Aggregated reporting and analytics data |

Authentication uses JWT bearer tokens. When `AUTH_ENABLED=false`, all protected endpoints are accessible without a token.

## Switching Databases

Presto's Prisma schema uses only cross-database compatible field types. To use a different engine, update the `provider` in `packages/backend/prisma/schema.prisma` and set `DATABASE_URL` accordingly.

Supported: `postgresql`, `mysql`, `sqlite`, `sqlserver`, `cockroachdb`.

## Branch Strategy

- Create feature branches from `main`
- Use descriptive branch names: `feat/add-export-csv`, `fix/login-redirect`

## Commit Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/) enforced by commitlint.

```
feat: add CSV export for activity reports
fix: correct date calculation for leap years
chore: update dependencies
docs: improve API reference section
refactor: extract shared date utilities
```

A pre-commit hook runs Biome to auto-format staged files. A commit-msg hook validates the message format.

## Code Style

- **Formatter/Linter:** [Biome](https://biomejs.dev/) (configured in `biome.json`)
- Double quotes, semicolons, trailing commas, 2-space indent, 120 char line width
- Run `bun run lint` to check, `bun run lint:fix` to auto-fix

## Pull Requests

1. Keep PRs focused on a single change
2. Fill out the PR template
3. Ensure CI passes (lint, typecheck, build, test)
4. Describe how to test your changes

## Reporting Issues

Use the [issue templates](https://github.com/tux86/presto/issues/new/choose) for bug reports and feature requests.
