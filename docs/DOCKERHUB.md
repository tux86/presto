# Presto

Self-hosted time-tracking and activity report generator for freelancers and consultants.

[![GitHub](https://img.shields.io/badge/GitHub-tux86%2Fpresto-181717?style=flat-square&logo=github)](https://github.com/tux86/presto)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=flat-square)](https://github.com/tux86/presto/blob/main/LICENSE)

## Quick Start

```bash
curl -O https://raw.githubusercontent.com/tux86/presto/main/docker-compose.production.yml

export POSTGRES_PASSWORD="$(openssl rand -base64 32)"
export JWT_SECRET="$(openssl rand -base64 48)"

docker compose -f docker-compose.production.yml up -d
```

Open [http://localhost:8080](http://localhost:8080) and create your account.

### Try with demo data

To explore with a pre-populated dashboard, add `DEMO_DATA=true`:

```bash
export DEMO_DATA=true
```

Demo credentials are shown on the login page (`demo@presto.dev` / `demo1234`).

### Single-user mode

If you're the only user (e.g., personal server, behind an SSO proxy like Authelia/Authentik), disable built-in auth to skip the login page entirely:

```bash
export AUTH_DISABLED=true
```

A default user is auto-created from these env vars (all optional):

| Variable | Default |
|---|---|
| `DEFAULT_USER_EMAIL` | `admin@localhost` |
| `DEFAULT_USER_PASSWORD` | *(empty)* |
| `DEFAULT_USER_FIRST_NAME` | `Admin` |
| `DEFAULT_USER_LAST_NAME` | *(empty)* |

## Features

- Monthly activity reports with calendar view and half-day precision
- Client and mission management with per-client currency and holiday country
- Print-ready PDF export (EN, FR, DE, ES, PT)
- Revenue dashboards with multi-currency conversion
- Dark / Light / Auto theme
- Optional authentication and multi-user support
- PostgreSQL with auto-migrations on startup

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | **required** | PostgreSQL connection string (`postgresql://user:pass@host:5432/db`) |
| `JWT_SECRET` | **required** | Secret for signing JWT tokens (min 32 chars) |
| `AUTH_DISABLED` | `false` | Disable authentication (single-user mode) |
| `REGISTRATION_ENABLED` | `true` | Allow new user registration |
| `DEMO_DATA` | `false` | Seed demo data on first startup (empty DB only). Shows credentials on login page and disables registration. |
| `APP_NAME` | `Presto` | Application name shown in the UI |
| `DEFAULT_THEME` | `light` | Default theme for new users (`light`, `dark`, `auto`) |
| `DEFAULT_LOCALE` | `en` | Default locale (`en`, `fr`, `de`, `es`, `pt`) |
| `DEFAULT_BASE_CURRENCY` | `EUR` | Default base currency (ISO 4217) |
| `CORS_ORIGINS` | *(empty)* | Allowed CORS origins (comma-separated) |
| `RATE_LIMIT_MAX` | `20` | Max auth requests per IP per window (`0` to disable) |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Rate limit window in ms (15 min) |
| `PORT` | `8080` | HTTP port inside the container |

## Health Check

```
GET http://localhost:8080/api/health → { "status": "ok" }
```

The image includes a built-in `HEALTHCHECK` (30s interval).

## Source Code

Full documentation, development setup, and contributing guide: [github.com/tux86/presto](https://github.com/tux86/presto)
