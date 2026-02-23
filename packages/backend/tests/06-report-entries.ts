import { describe, expect, test } from "bun:test";
import { api, state } from "./helpers";

describe("Report Entries", () => {
  test("PATCH /activity-reports/:id/entries → 200 updated", async () => {
    const res = await api("PATCH", `/activity-reports/${state.reportId}/entries`, {
      body: {
        entries: [
          { id: state.entryId, value: 1 },
          { id: state.entryId2, value: 0.5, note: "Half day" },
        ],
      },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totalDays).toBeGreaterThan(0);
  });

  test("PATCH /activity-reports/:id/entries — entry not belonging → 400", async () => {
    const res = await api("PATCH", `/activity-reports/${state.reportId}/entries`, {
      body: { entries: [{ id: "nonexistent-entry-id", value: 1 }] },
    });
    expect(res.status).toBe(400);
  });

  test("PATCH /activity-reports/:id/entries — value > 1 → 400", async () => {
    const res = await api("PATCH", `/activity-reports/${state.reportId}/entries`, {
      body: { entries: [{ id: state.entryId, value: 2 }] },
    });
    expect(res.status).toBe(400);
  });

  test("PATCH /activity-reports/:id/entries — negative value → 400", async () => {
    const res = await api("PATCH", `/activity-reports/${state.reportId}/entries`, {
      body: { entries: [{ id: state.entryId, value: -0.5 }] },
    });
    expect(res.status).toBe(400);
  });

  test("PATCH /activity-reports/:id/entries — value 0 → 200", async () => {
    const res = await api("PATCH", `/activity-reports/${state.reportId}/entries`, {
      body: { entries: [{ id: state.entryId, value: 0 }] },
    });
    expect(res.status).toBe(200);
  });

  test("PATCH /activity-reports/:id/entries — value 1 → 200", async () => {
    const res = await api("PATCH", `/activity-reports/${state.reportId}/entries`, {
      body: { entries: [{ id: state.entryId, value: 1 }] },
    });
    expect(res.status).toBe(200);
  });

  test("PATCH /activity-reports/:id/fill → 200", async () => {
    const res = await api("PATCH", `/activity-reports/${state.reportId}/fill`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totalDays).toBeGreaterThan(0);
  });

  test("PATCH /activity-reports/:id/clear → 200", async () => {
    const res = await api("PATCH", `/activity-reports/${state.reportId}/clear`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totalDays).toBe(0);
  });
});
