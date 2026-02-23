import { describe, expect, test } from "bun:test";
import { api, state } from "./helpers";

describe("Activity Reports", () => {
  test("POST /activity-reports → 201 with entries", async () => {
    const res = await api("POST", "/activity-reports", {
      body: { month: 1, year: 2026, missionId: state.missionId },
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.status).toBe("DRAFT");
    expect(body.month).toBe(1);
    expect(body.year).toBe(2026);
    expect(body.entries).toBeTruthy();
    expect(body.entries.length).toBe(31); // January has 31 days
    state.reportId = body.id;
    state.entryId = body.entries[0].id;
    state.entryId2 = body.entries[1].id;
  });

  test("POST /activity-reports duplicate → 409", async () => {
    const res = await api("POST", "/activity-reports", {
      body: { month: 1, year: 2026, missionId: state.missionId },
    });
    expect(res.status).toBe(409);
  });

  test("POST /activity-reports mission not owned → 404", async () => {
    const res = await api("POST", "/activity-reports", {
      body: { month: 2, year: 2026, missionId: "nonexistent-mission-id" },
    });
    expect(res.status).toBe(404);
  });

  test("POST /activity-reports invalid month → 400", async () => {
    const res = await api("POST", "/activity-reports", {
      body: { month: 13, year: 2026, missionId: state.missionId },
    });
    expect(res.status).toBe(400);
  });

  test("POST /activity-reports year out of range → 400", async () => {
    const res = await api("POST", "/activity-reports", {
      body: { month: 1, year: 1999, missionId: state.missionId },
    });
    expect(res.status).toBe(400);
  });

  test("GET /activity-reports → 200", async () => {
    const res = await api("GET", "/activity-reports");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.length).toBeGreaterThanOrEqual(1);
  });

  test("GET /activity-reports?year=2026 → 200", async () => {
    const res = await api("GET", "/activity-reports?year=2026");
    expect(res.status).toBe(200);
  });

  test("GET /activity-reports?year=2026&month=1 → 200", async () => {
    const res = await api("GET", "/activity-reports?year=2026&month=1");
    expect(res.status).toBe(200);
  });

  test("GET /activity-reports?missionId=... → 200", async () => {
    const res = await api("GET", `/activity-reports?missionId=${state.missionId}`);
    expect(res.status).toBe(200);
  });

  test("GET /activity-reports?year=abc → 400", async () => {
    const res = await api("GET", "/activity-reports?year=abc");
    expect(res.status).toBe(400);
  });

  test("GET /activity-reports?month=abc → 400", async () => {
    const res = await api("GET", "/activity-reports?month=abc");
    expect(res.status).toBe(400);
  });

  test("GET /activity-reports/:id → 200", async () => {
    const res = await api("GET", `/activity-reports/${state.reportId}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(state.reportId);
  });

  test("GET /activity-reports/:id not found → 404", async () => {
    const res = await api("GET", "/activity-reports/nonexistent-id");
    expect(res.status).toBe(404);
  });
});
