# Presto

Activity report time-tracking app. Monorepo with 3 packages.

## Tech Stack

- **Runtime:** Bun
- **Frontend:** React 19, Vite 6, Tailwind CSS 4, Zustand, TanStack Query, React Router 7, Recharts
- **Backend:** Hono 4, Prisma 6, @react-pdf/renderer
- **Database:** PostgreSQL 16 (supports MySQL, SQLite, SQL Server, CockroachDB via Prisma provider swap)
- **Shared:** TypeScript types + utilities (dates, French holidays)
- **Language:** TypeScript 5.7, strict mode

## Project Structure

```
packages/
  backend/     # Hono API server (port 3001)
  frontend/    # React SPA (port 5173, proxies /api → backend)
  shared/      # Shared types and utils (@presto/shared)
```

## Commands

```bash
bun install                # Install all dependencies
bun run dev                # Start backend + frontend
bun run dev:backend        # Backend only (hot reload)
bun run dev:frontend       # Frontend only
bun run build              # Build all packages
bun run db:generate        # Generate Prisma client
bun run db:migrate         # Run database migrations
bun run db:seed            # Seed sample data
docker-compose up -d       # Start PostgreSQL
```

## Path Aliases

- Frontend: `@/*` → `packages/frontend/src/*`

## Backend API Routes

All prefixed with `/api`: `auth`, `clients`, `missions`, `activity-reports`, `reporting`, `health`, `config`

## Key Conventions

- No ESLint/Prettier configured — follow existing code style
- No test framework — no tests exist yet
- i18n: French (default) + English, translation files in `packages/frontend/src/i18n/`
- Responsive: mobile (375px+), tablet (768px+), desktop (1024px+) via Tailwind breakpoints + `useIsMobile` hook
- Auth is optional, controlled by `AUTH_ENABLED` env var
- Prisma schema uses only cross-DB compatible types (String, Float, Boolean, DateTime, Int, enum, cuid)
