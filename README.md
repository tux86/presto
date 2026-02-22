<div align="center">
  <img src="packages/frontend/public/favicon.svg" alt="Presto" width="64" />

  <h1>Presto</h1>

  <p><strong>Self-hosted time tracking for freelancers and consultants.</strong><br/>
  Generate monthly activity reports, track clients and missions, and export everything as PDF.</p>

  [![CI](https://img.shields.io/github/actions/workflow/status/tux86/presto/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/tux86/presto/actions/workflows/ci.yml)
  [![Release](https://img.shields.io/github/v/release/tux86/presto?style=flat-square&color=blue)](https://github.com/tux86/presto/releases)
  [![Docker Hub](https://img.shields.io/docker/v/axforge/presto?sort=semver&style=flat-square&logo=docker&logoColor=white&label=Docker%20Hub)](https://hub.docker.com/r/axforge/presto)
  [![License: MIT](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)
</div>

<br/>

<p align="center">
  <img src="docs/images/demo-login.png" alt="Presto — Login Page" width="100%" />
</p>
<p align="center">
  <img src="docs/images/demo-dashboard.png" alt="Presto — Activity Reports Dashboard" width="100%" />
</p>
<p align="center">
  <img src="docs/images/demo-reporting.png" alt="Presto — Reporting & Revenue Charts" width="100%" />
</p>

## Why Presto?

Most time-tracking tools are built for teams. Presto is built for **independent freelancers** who need one thing: a clean monthly activity report they can send to their client.

- **Single Docker image** — no separate frontend/backend/worker containers to manage
- **PDF-ready activity reports** — calendar view with billable days, ready to print or email
- **Works without auth** — disable login for single-user setups, no account needed
- **Your data, your server** — fully self-hosted, no cloud dependency, MIT licensed

## Features

| | |
|---|---|
| Monthly activity reports | Calendar-based day tracking per mission |
| Client & mission management | Organize work across multiple clients |
| PDF export | Professional, print-ready reports via @react-pdf/renderer |
| Revenue dashboards | Visual charts for activity and revenue analysis |
| Dark mode | System-aware theme with manual override |
| i18n | French (default) and English |
| Responsive | Mobile, tablet, and desktop layouts |
| Multi-database | PostgreSQL, MySQL, SQLite, SQL Server, CockroachDB |

## Quick Start

```bash
curl -O https://raw.githubusercontent.com/tux86/presto/main/docker-compose.production.yml

# Required: set secrets before starting
export POSTGRES_PASSWORD="$(openssl rand -base64 32)"
export JWT_SECRET="$(openssl rand -base64 48)"

docker compose -f docker-compose.production.yml up -d
```

Open [http://localhost:8080](http://localhost:8080).

See the [Docker Hub page](https://hub.docker.com/r/axforge/presto) for environment variables, `docker run`, and configuration options.

## Architecture

```mermaid
graph LR
    subgraph Browser["Browser"]
        SPA["React 19 SPA<br/>React Router 7 · Tailwind CSS 4<br/>Zustand · TanStack Query · Recharts"]
    end

    subgraph Docker["Docker Container · Bun · :8080"]
        Static["Static Files<br/>Vite-built SPA assets"]
        subgraph Hono["Hono 4 API Server"]
            MW["Middleware<br/>CORS · Secure Headers · CSP<br/>Body Limit · Logger"]
            Auth["Auth<br/>JWT · BCrypt · Rate Limiting"]
            Routes["/api/auth · /api/clients<br/>/api/missions · /api/activity-reports<br/>/api/reporting · /api/health"]
            PDF["PDF Export<br/>@react-pdf/renderer"]
        end
        Shared["@presto/shared<br/>Types · Date Utilities · Holidays"]
    end

    DB[(PostgreSQL)]

    Static -.->|"HTML · JS · CSS"| SPA
    SPA -->|"REST /api/*"| MW
    MW --> Auth
    Auth --> Routes
    Routes --> PDF
    Routes -->|"Prisma 7"| DB
    Shared -.-> Routes
```

Presto ships as a **single Docker image** running on [Bun](https://bun.sh/). The Hono backend serves both the REST API and the pre-built React frontend as static files. All data stays on your server.

**Built with** TypeScript, React 19, Hono 4, Prisma 7, Vite 6, Tailwind CSS 4, Recharts, and Bun.

## Comparison

| Feature | Presto | Kimai | Traggo | Wakapi |
|---|:---:|:---:|:---:|:---:|
| Single Docker image | Yes | No | Yes | Yes |
| Monthly activity reports | Yes | No | No | No |
| PDF export | Yes | Yes | No | No |
| Multi-database | Yes | No | No | Yes |
| Optional auth (single-user) | Yes | No | No | No |
| i18n (FR + EN) | Yes | Yes | No | No |
| Client/mission tracking | Yes | Yes | No | No |
| Revenue dashboards | Yes | Yes | No | No |

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for local development setup, project structure, and guidelines.

## License

[MIT](LICENSE)
