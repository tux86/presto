# Contributing

Thanks for taking a look. Presto is a small, deliberately narrow tool — please read
[the README](README.md) first, especially the part about what it is *not*.

## Setup

```bash
bun install
bun run dev     # API on :3001, Vite with HMR on :5173
```

You need [Bun](https://bun.sh) 1.2 or newer. There is no database to provision.

For something to actually look at:

```bash
bun run seed --reset
```

Two entities, four clients across two currencies, and roughly two years of months —
deterministic, so a screenshot or a bug report stays reproducible.

## Before you open a pull request

```bash
bun run lint:fix
bun run typecheck
bun test
```

CI runs exactly these, plus `bun run build`.

## Where code goes

```
src/core/    pure logic — no I/O, no imports from db, server, pdf or ui
src/db/      SQLite schema, migrations, queries
src/pdf/     the client-facing document
src/server/  Hono routes
src/ui/      React app
src/i18n/    English and French, shared by the UI and the PDF
```

**`core/` must not import from anywhere else in `src/`.** That rule is what keeps the logic that
can get someone's invoice wrong testable without a database, and it is where new tests should
almost always go.

- **Schema changes** append a new SQL string to `MIGRATIONS` in `src/db/schema.ts`. Never edit an
  entry that has already shipped — somebody's database has already run it.
- **New strings** go in `src/i18n/en.ts` first. `fr.ts` is typed against it, so a missing
  translation is a compile error.
- **Formatting** is Biome's job. Don't hand-format; the pre-commit hook rewrites staged files.

## Scope

Presto is single-user and local-first on purpose. Pull requests that add accounts, multi-tenancy,
telemetry, plugin systems, or "future extensibility" layers will be declined — not because they are
badly written, but because the absence of those things is the product.

Good contributions: bug fixes, correctness in the date and holiday logic, PDF layout improvements,
accessibility, a language you can actually maintain.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/), enforced by commitlint:

```
feat(editor): copy last month's weekday pattern
fix(pdf): keep a 31-day month on one page
```

Releases are cut automatically from `main`; `feat` bumps the minor, `fix` the patch, and a
`BREAKING CHANGE:` footer the major. Don't edit `CHANGELOG.md` or the version by hand.

## Releasing

Releases are automatic: `semantic-release` runs on `main` after CI passes, and calls the Docker
workflow directly when it cuts a version.

It is chained rather than triggered by `release: published`, because GitHub suppresses events
created with the built-in `GITHUB_TOKEN` — a release published by CI never starts another workflow.
v1 worked around this with a `RELEASE_TOKEN` personal access token, which is no longer needed and
can be deleted.

The image always goes to GHCR. Docker Hub is optional and needs three repository settings:

| Setting | Kind | Example |
|---|---|---|
| `DOCKERHUB_IMAGE` | variable | `axforge/presto` |
| `DOCKERHUB_USERNAME` | secret | your Docker Hub user |
| `DOCKERHUB_TOKEN` | secret | an access token, not the password |

Leave `DOCKERHUB_IMAGE` unset and the workflow quietly publishes to GHCR only.

## Reporting bugs

Include your Presto version (bottom of the sidebar), how you installed it, and what you expected.
If it involves dates, say which month, year, and holiday country — that is almost always where the
answer is.
