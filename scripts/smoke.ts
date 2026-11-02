/**
 * Smoke test against a running Presto: `bun scripts/smoke.ts http://localhost:8080`.
 *
 * Unit tests run from the source tree, with node_modules at hand. This runs
 * against the built image, which has neither, and goes as far as rendering a
 * PDF: 2.2.2 shipped an image that started, then crashed loading its fonts.
 */
const base = process.argv[2] ?? "http://localhost:8080";

async function api<T = { id: string }>(path: string, method = "GET", body?: unknown): Promise<T> {
  const res = await fetch(`${base}/api${path}`, {
    method,
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

// The server may still be starting.
for (let i = 0; ; i++) {
  try {
    if ((await fetch(`${base}/api/health`)).ok) break;
  } catch {}
  if (i === 30) throw new Error("Presto did not answer /api/health within 30 seconds");
  await Bun.sleep(1000);
}

const state = await api<{ companies: { id: string }[] }>("/state");
const client = await api("/clients", "POST", { name: "Smoke", currency: "EUR", holidayCountry: "FR" });
const mission = await api("/missions", "POST", {
  name: "Smoke",
  clientId: client.id,
  companyId: state.companies[0]?.id,
  dailyRate: 500,
});
const report = await api("/reports", "POST", { missionId: mission.id, year: 2026, month: 5 });
await api(`/reports/${report.id}/fill`, "POST");
await api(`/reports/${report.id}`, "PATCH", { status: "completed" });

for (const locale of ["en", "fr"]) {
  const pdf = await fetch(`${base}/api/reports/${report.id}/pdf?locale=${locale}`);
  const head = new TextDecoder().decode((await pdf.arrayBuffer()).slice(0, 5));
  if (!pdf.ok || head !== "%PDF-") throw new Error(`PDF (${locale}) failed: ${pdf.status}`);
}

const mcp = await fetch(`${base}/mcp`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
});
const tools = ((await mcp.json()) as { result: { tools: unknown[] } }).result.tools.length;

// Still alive after all that: a crash on a background promise would show here.
if (!(await fetch(`${base}/api/health`)).ok) throw new Error("Presto died during the smoke test");
console.log(`smoke ok: ${(await api<{ version: string }>("/health")).version}, PDF en+fr, ${tools} MCP tools`);
