# Security

## Presto has no authentication

This is by design, not an oversight. Presto is a single-user, local-first tool: it has no accounts,
no login, and no permission model. **Anyone who can reach the port can read and modify all of your
data, and download every export.**

Run it accordingly:

- Bind it to `localhost` (the provided `docker-compose.yml` does this)
- Or put it behind a reverse proxy, VPN, or Tailscale that handles authentication
- Never expose it directly to the internet

Reports of "Presto has no authentication" are not vulnerabilities and will be closed.

## The MCP endpoint

`POST /mcp` lets an AI agent drive Presto. Set `PRESTO_TOKEN` and it requires
`Authorization: Bearer <token>`; the token covers `/mcp` only, so the rest still depends on where you
run Presto. `/mcp` also refuses cross-origin browser requests. A local agent should use the stdio
server (`bun run mcp`) instead, which listens on no port at all. See [docs/agents.md](docs/agents.md).

## What is worth reporting

- A way to read or write files outside `DATA_DIR`
- A path that escapes the static file root
- Anything that makes Presto send your data somewhere you did not ask it to
- A way past `PRESTO_TOKEN` on `/mcp`, or an MCP tool that breaks a rule the UI enforces
- Remote code execution from a crafted import file, PDF export, or API payload
- A dependency advisory that actually affects how Presto uses that dependency

## How to report

Open a [private security advisory](https://github.com/tux86/presto/security/advisories/new) rather
than a public issue. Include the version, the steps, and what you were able to reach.

Expect an initial response within a week. Presto is maintained by one person in their spare time.

## Supported versions

Only the latest release.
