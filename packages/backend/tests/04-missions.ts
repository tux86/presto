import { describe, expect, test } from "bun:test";
import { api, state } from "./helpers";

describe("Missions", () => {
  test("POST /missions → 201", async () => {
    const res = await api("POST", "/missions", {
      body: {
        name: "Backend Development",
        clientId: state.clientId,
        dailyRate: 650,
        startDate: "2026-01-01",
        endDate: "2026-12-31",
      },
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe("Backend Development");
    expect(body.dailyRate).toBe(650);
    expect(body.client.name).toBeTruthy();
    state.missionId = body.id;
  });

  test("POST /missions minimal fields → 201", async () => {
    const res = await api("POST", "/missions", {
      body: { name: "Consulting", clientId: state.clientId },
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    state.missionId2 = body.id;
  });

  test("POST /missions end date before start date → 400", async () => {
    const res = await api("POST", "/missions", {
      body: {
        name: "Invalid Dates",
        clientId: state.clientId,
        startDate: "2026-06-01",
        endDate: "2026-01-01",
      },
    });
    expect(res.status).toBe(400);
  });

  test("POST /missions client not owned → 404", async () => {
    const res = await api("POST", "/missions", {
      body: { name: "Unauthorized", clientId: "nonexistent-client-id" },
    });
    expect(res.status).toBe(404);
  });

  test("POST /missions missing required fields → 400", async () => {
    const res = await api("POST", "/missions", {
      body: { dailyRate: 500 },
    });
    expect(res.status).toBe(400);
  });

  test("POST /missions negative daily rate → 400", async () => {
    const res = await api("POST", "/missions", {
      body: { name: "Negative Rate", clientId: state.clientId, dailyRate: -100 },
    });
    expect(res.status).toBe(400);
  });

  test("POST /missions malformed date string → 400", async () => {
    const res = await api("POST", "/missions", {
      body: { name: "Bad Date", clientId: state.clientId, startDate: "2026-1-1" },
    });
    expect(res.status).toBe(400);
  });

  test("GET /missions → 200 with list", async () => {
    const res = await api("GET", "/missions");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.length).toBeGreaterThanOrEqual(2);
  });

  test("PATCH /missions/:id → 200 updated", async () => {
    const res = await api("PATCH", `/missions/${state.missionId}`, {
      body: { name: "Backend Dev (Updated)", dailyRate: 700, isActive: false },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Backend Dev (Updated)");
    expect(body.dailyRate).toBe(700);
    expect(body.isActive).toBe(false);
  });

  test("PATCH /missions/:id clear optional fields → 200", async () => {
    const res = await api("PATCH", `/missions/${state.missionId}`, {
      body: { dailyRate: null, startDate: null, endDate: null },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.dailyRate).toBeNull();
  });

  test("PATCH /missions/:id not found → 404", async () => {
    const res = await api("PATCH", "/missions/nonexistent-id", {
      body: { name: "Ghost" },
    });
    expect(res.status).toBe(404);
  });

  test("PATCH /missions/:id endDate before startDate → 400", async () => {
    const res = await api("PATCH", `/missions/${state.missionId}`, {
      body: { startDate: "2026-06-01", endDate: "2026-01-01" },
    });
    expect(res.status).toBe(400);
  });

  test("PATCH /missions/:id clientId owned by other user → 404", async () => {
    const res = await api("PATCH", `/missions/${state.missionId}`, {
      body: { clientId: state.bobClientId },
    });
    expect(res.status).toBe(404);
  });

  test("DELETE /missions/:id (no reports) → 204", async () => {
    const res = await api("DELETE", `/missions/${state.missionId2}`);
    expect(res.status).toBe(204);
  });

  test("DELETE /missions/:id not found → 404", async () => {
    const res = await api("DELETE", "/missions/nonexistent-id");
    expect(res.status).toBe(404);
  });

  test("Restore dailyRate for later tests", async () => {
    const res = await api("PATCH", `/missions/${state.missionId}`, {
      body: { dailyRate: 700, isActive: true },
    });
    expect(res.status).toBe(200);
  });
});
