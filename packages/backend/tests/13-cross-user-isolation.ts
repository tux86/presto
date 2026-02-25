import { describe, expect, test } from "bun:test";
import { api, state } from "./helpers";

describe("Cross-User List Isolation", () => {
  test("GET /companies → Alice does not see Bob's companies", async () => {
    const res = await api("GET", "/companies");
    expect(res.status).toBe(200);
    const body = await res.json();
    const ids = body.map((c: { id: string }) => c.id);
    expect(ids).not.toContain(state.bobCompanyId);
  });

  test("Cross-user: Alice cannot delete Bob's company → 404", async () => {
    const res = await api("DELETE", `/companies/${state.bobCompanyId}`);
    expect(res.status).toBe(404);
  });

  test("Cross-user: Alice cannot update Bob's company → 404", async () => {
    const res = await api("PATCH", `/companies/${state.bobCompanyId}`, {
      body: { name: "Hijacked" },
    });
    expect(res.status).toBe(404);
  });

  test("GET /clients → Alice does not see Bob's clients", async () => {
    const res = await api("GET", "/clients");
    expect(res.status).toBe(200);
    const body = await res.json();
    const names = body.map((c: { name: string }) => c.name);
    expect(names).not.toContain("Bob Client");
  });

  test("GET /missions → Alice does not see Bob's missions", async () => {
    const res = await api("GET", "/missions");
    expect(res.status).toBe(200);
    const body = await res.json();
    const names = body.map((m: { name: string }) => m.name);
    expect(names).not.toContain("Bob Mission");
  });

  test("GET /activity-reports → Alice does not see Bob's reports", async () => {
    const res = await api("GET", "/activity-reports");
    expect(res.status).toBe(200);
    const body = await res.json();
    const ids = body.map((r: { id: string }) => r.id);
    expect(ids).not.toContain(state.bobReportId);
  });

  test("Cross-user: Alice cannot delete Bob's client → 404", async () => {
    const res = await api("DELETE", `/clients/${state.bobClientId}`);
    expect(res.status).toBe(404);
  });

  test("Cross-user: Alice cannot create mission with Bob's company → 404", async () => {
    const res = await api("POST", "/missions", {
      body: { name: "Sneaky Mission", clientId: state.clientId, companyId: state.bobCompanyId },
    });
    expect(res.status).toBe(404);
  });

  test("Cross-user: Alice cannot delete Bob's mission → 404", async () => {
    const res = await api("DELETE", `/missions/${state.bobMissionId}`);
    expect(res.status).toBe(404);
  });

  test("Cross-user: Alice cannot update Bob's report → 404", async () => {
    const res = await api("PATCH", `/activity-reports/${state.bobReportId}`, {
      body: { note: "hijacked" },
    });
    expect(res.status).toBe(404);
  });

  test("Cross-user: Alice cannot export Bob's report PDF → 404", async () => {
    const res = await api("GET", `/activity-reports/${state.bobReportId}/pdf`);
    expect(res.status).toBe(404);
  });

  test("Cross-user: Alice cannot update entries on Bob's report → 404", async () => {
    const res = await api("PATCH", `/activity-reports/${state.bobReportId}/entries`, {
      body: { entries: [{ id: "fake-entry-id", value: 1 }] },
    });
    // 404 because findOwned rejects before entry validation
    expect(res.status).toBe(404);
  });

  test("Cross-user: Alice cannot fill Bob's report → 404", async () => {
    const res = await api("PATCH", `/activity-reports/${state.bobReportId}/fill`);
    expect(res.status).toBe(404);
  });

  test("Cross-user: Alice cannot clear Bob's report → 404", async () => {
    const res = await api("PATCH", `/activity-reports/${state.bobReportId}/clear`);
    expect(res.status).toBe(404);
  });
});

describe("Client & Mission Validation Edge Cases", () => {
  test("POST /clients with invalid color → 400", async () => {
    const res = await api("POST", "/clients", {
      body: { name: "Color Test", currency: "EUR", holidayCountry: "FR", color: "rainbow" },
    });
    expect(res.status).toBe(400);
  });

  test("POST /clients with valid color → 201", async () => {
    const res = await api("POST", "/clients", {
      body: { name: "Color Valid", currency: "EUR", holidayCountry: "FR", color: "indigo" },
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.color).toBe("indigo");
    // Clean up
    await api("DELETE", `/clients/${body.id}`);
  });

  test("PATCH /clients/:id with invalid currency → 400", async () => {
    const res = await api("PATCH", `/clients/${state.clientId}`, {
      body: { currency: "INVALID" },
    });
    expect(res.status).toBe(400);
  });

  test("PATCH /clients/:id with invalid holidayCountry → 400", async () => {
    const res = await api("PATCH", `/clients/${state.clientId}`, {
      body: { holidayCountry: "XX" },
    });
    expect(res.status).toBe(400);
  });

  test("POST /missions with zero daily rate → 201", async () => {
    const res = await api("POST", "/missions", {
      body: { name: "Zero Rate", clientId: state.clientId, companyId: state.companyId, dailyRate: 0 },
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.dailyRate).toBe(0);
    // Clean up
    await api("DELETE", `/missions/${body.id}`);
  });

  test("POST /missions with float daily rate → 201", async () => {
    const res = await api("POST", "/missions", {
      body: { name: "Float Rate", clientId: state.clientId, companyId: state.companyId, dailyRate: 650.5 },
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.dailyRate).toBe(650.5);
    // Clean up
    await api("DELETE", `/missions/${body.id}`);
  });

  test("PATCH /missions/:id → change to another owned client", async () => {
    // Create a second client for Alice
    const clientRes = await api("POST", "/clients", {
      body: { name: "Alice Second Client", currency: "USD", holidayCountry: "US" },
    });
    const client2 = await clientRes.json();

    const res = await api("PATCH", `/missions/${state.missionId}`, {
      body: { clientId: client2.id },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.client.name).toBe("Alice Second Client");

    // Revert mission back to original client
    await api("PATCH", `/missions/${state.missionId}`, {
      body: { clientId: state.clientId },
    });
    // Clean up second client
    await api("DELETE", `/clients/${client2.id}`);
  });
});
