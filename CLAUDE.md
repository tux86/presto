# Presto

Activity report time-tracking app. Monorepo with 3 packages.

## Tech Stack

- **Runtime:** Bun
- **Frontend:** React 19, Vite 6, Tailwind CSS 4, Zustand, TanStack Query, React Router 7, Recharts
- **Backend:** Hono 4, Prisma 7, @react-pdf/renderer
- **Database:** PostgreSQL 16 (supports MySQL, SQLite, SQL Server, CockroachDB via Prisma provider swap)
- **Shared:** TypeScript types + utilities (dates, French holidays)
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
bun run format             # Format all files
bun run db:generate        # Generate Prisma client
bun run db:migrate         # Run database migrations
bun run db:seed            # Seed sample data
docker compose up -d       # Start PostgreSQL + Presto (Docker)
```

## Path Aliases

- Frontend: `@/*` → `packages/frontend/src/*`

## Backend API Routes

All prefixed with `/api`: `auth`, `clients`, `missions`, `activity-reports`, `reporting`, `health`, `config`

## Code Quality

- **Linter/Formatter:** Biome (`biome.json`) — double quotes, semicolons, trailing commas, 2-space indent, 120 char line width
- **Commit convention:** Conventional Commits enforced by Husky + commitlint (`feat:`, `fix:`, `chore:`, etc.)
- **Pre-commit hook:** Biome auto-formats staged files
- **Commit-msg hook:** Validates commit message format

## CI/CD

- **CI** (`.github/workflows/ci.yml`): lint → typecheck → build on PR/push to `main`
- **Release** (`.github/workflows/release.yml`): semantic-release after CI passes on `main` — auto version bump, CHANGELOG, GitHub Release
- **Docker** (`.github/workflows/docker.yml`): builds + pushes single `presto` image to GHCR + Docker Hub on release

## Key Conventions

- No test framework — no tests exist yet
- i18n: French (default) + English, translation files in `packages/frontend/src/i18n/`
- Responsive: mobile (375px+), tablet (768px+), desktop (1024px+) via Tailwind breakpoints + `useIsMobile` hook
- Auth is optional, controlled by `AUTH_ENABLED` env var
- Prisma schema uses only cross-DB compatible types (String, Float, Boolean, DateTime, Int, enum, cuid)
