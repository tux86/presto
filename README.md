<div align="center">
  <img src="packages/frontend/public/favicon.svg" alt="Presto" width="64" />

  <h1>Presto</h1>

  <p><strong>Self-hosted activity report generator for freelancers and consultants.</strong><br/>
  Track clients, missions, and billable days. Export professional PDF reports in one click.</p>

  [![CI](https://img.shields.io/github/actions/workflow/status/tux86/presto/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/tux86/presto/actions/workflows/ci.yml)
  [![Release](https://img.shields.io/github/v/release/tux86/presto?style=flat-square&color=blue)](https://github.com/tux86/presto/releases)
  [![Docker Hub](https://img.shields.io/docker/v/axforge/presto?sort=semver&style=flat-square&logo=docker&logoColor=white&label=Docker%20Hub)](https://hub.docker.com/r/axforge/presto)
  [![License: MIT](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![Bun](https://img.shields.io/badge/Bun-runtime-f9f1e1?style=flat-square&logo=bun&logoColor=black)](https://bun.sh/)
</div>

<br/>

<p align="center">
  <img src="docs/images/demo-dashboard.png" alt="Presto — Activity Reports Dashboard" width="100%" />
</p>
<p align="center">
  <img src="docs/images/demo-activity-report.png" alt="Presto — Activity Report Editor" width="100%" />
</p>
<p align="center">
  <img src="docs/images/demo-reporting.png" alt="Presto — Reporting & Revenue Charts" width="100%" />
</p>

---

## Why Presto?

Most time-tracking tools are built for teams. Presto is built for **independent freelancers and consultants** who need one thing: a clean monthly activity report they can send to their client.

- **Single Docker image** — no separate frontend/backend/worker containers to manage
- **PDF-ready activity reports** — calendar view with billable days, ready to print or email
- **Works without auth** — disable login for single-user setups, no account needed
- **Your data, your server** — fully self-hosted, no cloud dependency, MIT licensed

---

## Features

### Activity Reports
- Calendar-based day tracking with **half-day precision** (0, 0.5, or 1 per day)
- **Auto-fill workdays** — one click fills all weekdays, skipping weekends and public holidays
- **Country-specific holidays** — per-client holiday calendar (all countries supported via [`date-holidays`](https://github.com/commenthol/date-holidays))
- **Draft / Completed workflow** — lock reports to prevent accidental edits
- Report notes for delivery comments or internal tracking
- Clear all entries or revert completed reports back to draft

### Company, Client & Mission Management
- Create **companies** (your own legal entities) with name, address, and business ID
- Set a default company used automatically on new reports
- Organize work by **client** and **mission** (project/contract)
- Per-client **currency** (all ISO 4217 currencies) and **holiday country**
- Optional client fields: email, phone, address, business ID (SIRET, VAT, etc.)
- Daily rate tracking per mission with date ranges
- Active/inactive mission status

### PDF Export
- Professional, print-ready reports generated server-side with [`@react-pdf/renderer`](https://react-pdf.org/)
- Multilingual output — export in **English**, **French**, **German**, **Spanish**, or **Portuguese**
- Includes company info, client details, mission name, calendar grid, totals, and notes
- Filename auto-generated from client, mission, and period

### Revenue Dashboards & Multi-Currency
- Yearly overview with **total days**, **total revenue**, and **average daily rate**
- Monthly breakdown charts (days worked + revenue per month)
- Per-client revenue distribution
- **Multi-currency support** — per-client billing currency with automatic conversion to your base currency via [open.er-api.com](https://www.exchangerate-api.com/)
- Configurable base currency per user (any ISO 4217 code)

### Authentication & Security
- **Optional auth** — disable for single-user setups (`AUTH_DISABLED=true`)
- JWT-based authentication with bcrypt password hashing
- User registration with password policies (min 8 chars, uppercase, lowercase, digit)
- Registration can be disabled after initial setup (`REGISTRATION_ENABLED=false`)
- Per-IP rate limiting on auth endpoints
- Secure headers (CSP, HSTS) and CORS configuration
- Multi-user support with full data isolation (ownership checks on all resources)

### User Experience
- **Dark / Light / Auto theme** — system-aware with manual override
- **5 languages** — English, French, German, Spanish, Portuguese
- **Command palette** — quick navigation and actions via keyboard shortcut
- **Responsive design** — mobile (375px+), tablet (768px+), desktop (1024px+)
- Searchable select components for clients, missions, and currencies
- User preferences synced to server (theme, locale, base currency)

### Deployment
- **Single Docker image** — backend + frontend served together
- Auto-runs database migrations on startup
- Built-in health check endpoint (`/api/health`)
- **PostgreSQL** — powered by Drizzle ORM
- Configurable via environment variables (see below)

---

## Quick Start

### Docker Compose (recommended)

```bash
curl -O https://raw.githubusercontent.com/tux86/presto/main/docker-compose.production.yml

# Required: generate secrets before starting
export POSTGRES_PASSWORD="$(openssl rand -base64 32)"
export JWT_SECRET="$(openssl rand -base64 48)"

docker compose -f docker-compose.production.yml up -d
```

Open [http://localhost:8080](http://localhost:8080) and create your account.

### Docker Run

```bash
docker run -d \
  --name presto \
  -p 8080:8080 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/presto" \
  -e JWT_SECRET="$(openssl rand -base64 48)" \
  axforge/presto:latest
```

> Requires an existing PostgreSQL database. Migrations run automatically on startup.

### Single-User Mode

To skip login entirely, set `AUTH_DISABLED=true`. A default user is auto-created and all requests are associated with it.

---

## Configuration

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | **(required)** | PostgreSQL connection string |
| `JWT_SECRET` | **(required)** | Secret for signing JWT tokens (min 32 chars) |
| `AUTH_DISABLED` | `false` | Disable authentication for single-user mode |
| `REGISTRATION_ENABLED` | `true` | Allow new user registration |
| `PORT` | `8080` | HTTP server port |
| `APP_NAME` | `Presto` | Application name shown in the UI |
| `CORS_ORIGINS` | — | Comma-separated allowed origins |
| `RATE_LIMIT_MAX` | `20` | Max auth requests per window |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Rate limit window in ms (default: 15 min) |
| `DEFAULT_THEME` | `dark` | Default theme for new users (`light`, `dark`, `auto`) |
| `DEFAULT_LOCALE` | `en` | Default language (`en`, `fr`, `de`, `es`, `pt`) |
| `DEFAULT_BASE_CURRENCY` | `EUR` | Default base currency (ISO 4217) |

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Runtime** | [Bun](https://bun.sh/) |
| **Frontend** | React 19, Vite 6, Tailwind CSS 4, Zustand, TanStack Query, React Router 7, Recharts |
| **Backend** | Hono 4, Drizzle ORM, @react-pdf/renderer |
| **Database** | PostgreSQL 17 |
| **Language** | TypeScript 5.7 (strict mode) |
| **Testing** | Bun test runner, 206 API E2E tests |
| **CI/CD** | GitHub Actions, semantic-release, Docker Hub |

---

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed setup, project structure, and guidelines.

```bash
git clone https://github.com/tux86/presto.git
cd presto
bun install
cp .env.example .env          # edit: set POSTGRES_PASSWORD + JWT_SECRET
docker compose up -d           # start PostgreSQL
bun run db:migrate
bun run dev                    # http://localhost:5173
```

### Testing

206 API E2E tests using Bun's test runner with Hono's `app.request()` — no running server needed.

```bash
bun run test
```

---

## License

[MIT](LICENSE)
