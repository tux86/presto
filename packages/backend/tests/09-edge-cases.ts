import { describe, expect, test } from "bun:test";
import app from "../src/app.js";
import { api, state } from "./helpers";

describe("Edge Cases", () => {
  test("Cross-user: access other user's mission → 404", async () => {
    // Bob creates a mission
    const bobMissionRes = await api("POST", "/missions", {
      token: state.token2,
      body: { name: "Bob Mission", clientId: state.bobClientId },
    });
    const bobMissionBody = await bobMissionRes.json();
    state.bobMissionId = bobMissionBody.id;

    // Alice tries to update it
    const res = await api("PATCH", `/missions/${state.bobMissionId}`, {
      body: { name: "Hijacked" },
    });
    expect(res.status).toBe(404);
  });

  test("Cross-user: access other user's report → 404", async () => {
    // Bob creates a report
    const bobReportRes = await api("POST", "/activity-reports", {
      token: state.token2,
      body: { month: 3, year: 2026, missionId: state.bobMissionId },
    });
    const bobReportBody = await bobReportRes.json();
    state.bobReportId = bobReportBody.id;

    // Alice tries to read it
    const res = await api("GET", `/activity-reports/${state.bobReportId}`);
    expect(res.status).toBe(404);
  });

  test("Cross-user: delete other user's report → 404", async () => {
    const res = await api("DELETE", `/activity-reports/${state.bobReportId}`);
    expect(res.status).toBe(404);
  });

  test("Malformed JSON body → 400", async () => {
    const res = await app.request("/api/clients", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${state.token}`,
      },
      body: '{"incomplete json',
    });
    expect(res.status).toBe(400);
  });

  test("Empty object on client create → 400", async () => {
    const res = await api("POST", "/clients", { body: {} });
    expect(res.status).toBe(400);
  });

  test("Empty object on mission create → 400", async () => {
    const res = await api("POST", "/missions", { body: {} });
    expect(res.status).toBe(400);
  });

  test("Empty object on report create → 400", async () => {
    const res = await api("POST", "/activity-reports", { body: {} });
    expect(res.status).toBe(400);
  });

  test("Report note exceeds 2000 chars → 400", async () => {
    // Revert to draft first
    await api("PATCH", `/activity-reports/${state.reportId}`, {
      body: { status: "DRAFT" },
    });
    const longNote = "A".repeat(2001);
    const res = await api("PATCH", `/activity-reports/${state.reportId}`, {
      body: { note: longNote },
    });
    expect(res.status).toBe(400);
    // Re-complete
    await api("PATCH", `/activity-reports/${state.reportId}`, {
      body: { status: "COMPLETED" },
    });
  });

  test("String for numeric field (dailyRate) → 400", async () => {
    const res = await api("POST", "/missions", {
      body: { name: "Type Test", clientId: state.clientId, dailyRate: "not-a-number" },
    });
    expect(res.status).toBe(400);
  });

  test("String for month field → 400", async () => {
    const res = await api("POST", "/activity-reports", {
      body: { month: "January", year: 2026, missionId: state.missionId },
    });
    expect(res.status).toBe(400);
  });

  test("Null on required field → 400", async () => {
    const res = await api("POST", "/clients", {
      body: { name: null, currency: "EUR", holidayCountry: "FR" },
    });
    expect(res.status).toBe(400);
  });

  test("Unicode / special characters in name → 201", async () => {
    const res = await api("POST", "/clients", {
      body: { name: "Société Générale — Test & Co.", currency: "EUR", holidayCountry: "FR" },
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe("Société Générale — Test & Co.");
    // Clean up
    await api("DELETE", `/clients/${body.id}`);
  });

  test("Empty entries array → 200", async () => {
    // Revert to draft
    await api("PATCH", `/activity-reports/${state.reportId}`, {
      body: { status: "DRAFT" },
    });
    const res = await api("PATCH", `/activity-reports/${state.reportId}/entries`, {
      body: { entries: [] },
    });
    expect(res.status).toBe(200);
    // Re-complete for FK tests
    await api("PATCH", `/activity-reports/${state.reportId}`, {
      body: { status: "COMPLETED" },
    });
  });
});

describe("Foreign Key Constraints", () => {
  test("DELETE /missions/:id with reports → 409", async () => {
    const res = await api("DELETE", `/missions/${state.missionId}`);
    expect(res.status).toBe(409);
  });

  test("DELETE /clients/:id with missions → 409", async () => {
    const res = await api("DELETE", `/clients/${state.clientId}`);
    expect(res.status).toBe(409);
  });
});
