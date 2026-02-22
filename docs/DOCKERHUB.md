# Presto

A self-hosted time-tracking application for freelancers and consultants. Generate monthly activity reports and export them as PDF.

[![GitHub](https://img.shields.io/badge/GitHub-tux86%2Fpresto-181717?style=flat-square&logo=github)](https://github.com/tux86/presto)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=flat-square)](https://github.com/tux86/presto/blob/main/LICENSE)

## Features

- Monthly activity reports with calendar view
- Client and mission tracking
- PDF export (print-ready)
- Revenue dashboards and charts
- French + English interface
- Dark mode
- Optional authentication (single-user friendly)
- PostgreSQL, MySQL, SQLite, SQL Server, CockroachDB

## Quick Start

```bash
curl -O https://raw.githubusercontent.com/tux86/presto/main/docker-compose.production.yml

# Required: set secrets before starting
export POSTGRES_PASSWORD="$(openssl rand -base64 32)"
export JWT_SECRET="$(openssl rand -base64 48)"

docker compose -f docker-compose.production.yml up -d
```

Open [http://localhost:8080](http://localhost:8080).

## Docker Compose

```yaml
services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: presto
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?POSTGRES_PASSWORD must be set}
      POSTGRES_DB: presto
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U presto -d presto"]
      interval: 5s
      timeout: 5s
      retries: 5

  presto:
    image: axforge/presto:latest
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql://presto:${POSTGRES_PASSWORD:?}@postgres:5432/presto?schema=public
      JWT_SECRET: ${JWT_SECRET:?JWT_SECRET must be set (min 32 chars)}
      AUTH_ENABLED: "true"
      REGISTRATION_ENABLED: "true"
    ports:
      - "8080:8080"

volumes:
  pgdata:
```

## Docker Run

```bash
docker run -d \
  -p 8080:8080 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/presto" \
  -e JWT_SECRET="$(openssl rand -base64 48)" \
  -e AUTH_ENABLED="true" \
  -e REGISTRATION_ENABLED="true" \
  axforge/presto:latest
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | **required** | PostgreSQL connection string |
| `JWT_SECRET` | **required** (min 32 chars) | Secret for signing JWT tokens |
| `AUTH_ENABLED` | `true` | Enable/disable authentication |
| `REGISTRATION_ENABLED` | `true` | Enable/disable user registration |
| `HOLIDAY_COUNTRY` | `FR` | Country code for public holidays |
| `CORS_ORIGINS` | *(empty)* | Allowed CORS origins (comma-separated) |
| `PORT` | `8080` | HTTP port inside the container |

## Ports

| Port | Description |
|---|---|
| `8080` | Web UI + API |

## Health Check

```
GET http://localhost:8080/api/health
```

Returns `{ "status": "ok" }`.

The image includes a built-in `HEALTHCHECK` (30s interval).

## Source Code

Full documentation, development setup, and contributing guide:
[github.com/tux86/presto](https://github.com/tux86/presto)
