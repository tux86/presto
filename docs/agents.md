# Presto with an AI agent

Presto speaks [MCP](https://modelcontextprotocol.io), so Claude, Cursor, Codex, VS Code or any other
MCP client can fill in your month, check it against the calendar, complete it and hand you the
PDF — in a sentence instead of thirty clicks.

> *"Fill May for Globex, I was off on the 14th and only worked the morning of the 22nd. Then
> complete it and save the PDF in French to ~/Documents/invoices."*

Your data stays where it is: in one SQLite file on your machine. The agent reaches it through the
same rules as the web UI — a completed report stays frozen, a PDF is only produced from a completed
report, the private note never goes on the PDF.

- [Connect your agent](#connect-your-agent) — local (stdio) or remote (HTTP)
- [What to ask](#what-to-ask) — use cases that work well
- [Tools](#tools) — what the agent can do, and what it cannot
- [REST API](#rest-api) — for scripts, cron jobs and agents without MCP
- [Privacy and security](#privacy-and-security)

## Connect your agent

There are two ways in. Pick the one that matches where Presto runs.

| Presto runs… | Use | Auth |
|---|---|---|
| on the same machine as the agent | **stdio** — the agent starts Presto's MCP server itself | none needed |
| on a server, NAS or homelab | **HTTP** — `https://your-host/mcp` | `PRESTO_TOKEN` |

The stdio server opens the database directly, so the web UI does not even need to be running.
When it is, both share the file safely.

### Claude Code

```bash
# From a clone
claude mcp add presto -- bun /path/to/presto/src/server/stdio.ts

# Presto in Docker on this machine
claude mcp add presto -- docker exec -i presto bun dist/mcp.js

# Presto on a server
claude mcp add --transport http presto https://presto.example.com/mcp \
  --header "Authorization: Bearer $PRESTO_TOKEN"
```

### Claude Desktop

**Settings → Developer → Edit Config**, then add Presto to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "presto": {
      "command": "/home/you/.bun/bin/bun",
      "args": ["/path/to/presto/src/server/stdio.ts"]
    }
  }
}
```

Use absolute paths: Claude Desktop does not start from your shell, so `bun` may not be on its
`PATH` (`which bun` tells you where it is). With Docker, use
`"command": "docker", "args": ["exec", "-i", "presto", "bun", "dist/mcp.js"]`.

Restart Claude Desktop; Presto appears in the tools menu.

### Cursor, VS Code, Codex and others

Every MCP client takes the same three facts: a command, its arguments, or a URL and a header.

<details>
<summary><b>Cursor</b> — <code>~/.cursor/mcp.json</code></summary>

```json
{
  "mcpServers": {
    "presto": { "command": "bun", "args": ["/path/to/presto/src/server/stdio.ts"] }
  }
}
```

Remote: `{ "url": "https://presto.example.com/mcp", "headers": { "Authorization": "Bearer …" } }`.

</details>

<details>
<summary><b>VS Code</b> — <code>.vscode/mcp.json</code></summary>

```json
{
  "servers": {
    "presto": { "type": "stdio", "command": "bun", "args": ["/path/to/presto/src/server/stdio.ts"] }
  }
}
```

Remote: `{ "type": "http", "url": "https://presto.example.com/mcp", "headers": { "Authorization": "Bearer …" } }`.

</details>

<details>
<summary><b>Codex</b> — <code>~/.codex/config.toml</code></summary>

```toml
[mcp_servers.presto]
command = "bun"
args = ["/path/to/presto/src/server/stdio.ts"]
```

</details>

### Where the data is

The stdio server uses `DATA_DIR` when it is set, and otherwise the `data/` folder of the clone it
runs from — the same database `bun start` uses. To point it elsewhere, add `"env": { "DATA_DIR":
"/path/to/data" }` to the client's config.

### Over HTTP

The web server answers MCP on `POST /mcp`. Set a token before letting anything other than
`localhost` reach it:

```bash
PRESTO_TOKEN=$(openssl rand -hex 32) bun start
# or, in docker-compose.yml:  environment: [PRESTO_TOKEN=…]
```

With `PRESTO_TOKEN` set, `/mcp` refuses any request without `Authorization: Bearer <token>`.
The token protects `/mcp` only: the web UI and `/api` keep relying on where you run Presto
(localhost, VPN, or a reverse proxy with its own login). Behind such a proxy, let `/mcp` through
and keep the rest behind the login.

Hosted chat apps (claude.ai, ChatGPT) only connect to servers that support OAuth, which Presto does
not. Use the desktop app or a coding agent with the local server instead.

## What to ask

The agent learns Presto's rules when it connects, and starts by reading your clients, missions and
reports. You talk about clients and months, not ids.

**End of month, in one sentence**

- *"Fill November for Globex from workdays, minus the 11th. Complete it and save the PDF in French
  to ~/Documents/CRA."*
- *"Same rhythm as last month for the Acme mission, but I was on holiday from the 22nd to the 26th."*

**Catching mistakes before the client does**

- *"Check my October reports: any public holiday billed, any weekend, any day above the month's
  workdays?"*
- *"Which missions have no report yet for this month?"*
- *"Compare the days in my September report with this list from my calendar: …"*

**From other sources**

- Paste a timesheet, a calendar export or an email from the client: *"Mark these days on the
  Initech report for March."*
- *"I spent the 3rd and the 4th on site in Lyon — add that as a note on those days."*

**The business**

- *"How much did I bill this year per client, and what is my average daily rate?"*
- *"How many days can I still bill in December, given the holidays?"*
- *"Am I ahead of last year at the same point?"*

**Setting up**

- *"New client: Umbrella Corp, Germany, billed in EUR. Mission 'Data platform' at 750 a day from
  January, billed by my SASU."*

## Tools

| Tool | Does |
|---|---|
| `get_overview` | companies, clients, missions, and a year's reports with days and amounts |
| `get_report` | one month, day by day: weekday, weekend, holiday name, value, note |
| `create_report` | an empty draft for a mission and a month |
| `fill_report` | from workdays, or from last month's weekday pattern |
| `update_report` | change some days or notes (the others are kept), the client note, the private note, the status |
| `year_summary` | days, revenue per currency, average rate and utilisation, per client and per company |
| `export_pdf` | the client's PDF; with `saveTo`, written to disk (local server only) |
| `create_client` · `create_mission` | onboarding |

What the agent **cannot** do: delete anything, change a completed report without first reverting it
to draft, or export a draft. Deleting, renaming and changing rates stay in the web UI, where you see
what you are doing.

## REST API

The web UI uses a plain JSON API under `/api`; scripts can too. It has no auth of its own (see
[SECURITY.md](../SECURITY.md)), so call it from where the UI is reachable.

| | |
|---|---|
| `GET /api/state` | everything at once: companies, clients, missions, reports |
| `GET` · `POST` · `PATCH` · `DELETE` `/api/companies`, `/api/clients`, `/api/missions` | reference data |
| `GET /api/reports?year=2026` | reports of a year |
| `GET /api/reports/:id?locale=fr` | one report with its mission, client, company and named holidays |
| `POST /api/reports` | `{ missionId, year, month }` |
| `PATCH /api/reports/:id` | `{ days?, dayNotes?, note?, privateNote?, status? }` — `days` replaces the whole month |
| `POST /api/reports/:id/fill` · `/clear` · `/copy-previous` | the editor's buttons |
| `GET /api/reports/:id/pdf?locale=fr` | the PDF (completed reports only) |
| `GET /api/reporting?year=2026&company=` | the yearly summary |
| `GET /api/export/csv?year=2026&locale=fr` | spreadsheet export |
| `GET /api/export/json` | the whole database |

Errors are `{ "error": "message" }` with a 4xx status. Days are keyed by day of month:
`{ "3": 1, "4": 0.5 }`.

```bash
# The PDF of every completed October report, in French
curl -s localhost:3001/api/reports?year=2026 \
  | jq -r '.[] | select(.month == 10 and .status == "completed") | .id' \
  | xargs -I{} curl -sOJ "localhost:3001/api/reports/{}/pdf?locale=fr"
```

## Privacy and security

- **The model sees what it reads.** Presto never sends anything anywhere, but a cloud-hosted agent
  sends what its tools return — clients, rates, notes, the private note — to its provider. Use a
  local model if that matters to you.
- **Private stays private on paper.** The agent can read and write the private note; the PDF still
  never contains it.
- **Approve writes.** MCP clients ask before running a tool unless you tell them not to. The
  read-only tools are marked as such, so you can allow those and keep confirming the rest.
- **`/mcp` refuses cross-origin browsers**, so a web page cannot drive a Presto on `localhost`
  through your browser.
