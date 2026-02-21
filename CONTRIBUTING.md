# Contributing to Presto

Thanks for your interest in contributing! Here's how to get started.

## Development Setup

1. Fork and clone the repository
2. Install dependencies: `bun install`
3. Copy environment config: `cp .env.example .env`
4. Start PostgreSQL: `docker compose up -d postgres`
5. Run migrations and seed: `bun run db:migrate && bun run db:seed`
6. Start dev servers: `bun run dev`

See the [README](README.md) for full setup details.

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

A pre-commit hook runs Biome to auto-format staged files. A commit-msg hook validates the commit message format.

## Code Style

- **Formatter/Linter:** [Biome](https://biomejs.dev/) (configured in `biome.json`)
- Double quotes, semicolons, trailing commas, 2-space indent, 120 char line width
- Run `bun run lint` to check, `bun run lint:fix` to auto-fix

## Pull Requests

1. Keep PRs focused on a single change
2. Fill out the PR template
3. Ensure CI passes (lint, typecheck, build)
4. Describe how to test your changes

## Reporting Issues

Use the [issue templates](https://github.com/tux86/presto/issues/new/choose) for bug reports and feature requests.
