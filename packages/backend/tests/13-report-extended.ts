import { describe, expect, test } from "bun:test";
import { api, state } from "./helpers";

describe("Report Creation — Extended", () => {
  test("POST /activity-reports month=2 (February non-leap) → 28 entries", async () => {
    // 2026 is not a leap year
    const res = await api("POST", "/activity-reports", {
      body: { month: 2, year: 2026, missionId: state.missionId },
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.entries.length).toBe(28);
    // Clean up
    await api("PATCH", `/activity-reports/${body.id}`, { body: { status: "DRAFT" } });
    await api("DELETE", `/activity-reports/${body.id}`);
  });

  test("POST /activity-reports month=2 (February leap year) → 29 entries", async () => {
    // 2028 is a leap year
    const res = await api("POST", "/activity-reports", {
      body: { month: 2, year: 2028, missionId: state.missionId },
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.entries.length).toBe(29);
    // Clean up
    await api("DELETE", `/activity-reports/${body.id}`);
  });

  test("POST /activity-reports → entries have correct default values", async () => {
    const res = await api("POST", "/activity-reports", {
      body: { month: 3, year: 2026, missionId: state.missionId },
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    // All entries should start at value 0
    for (const entry of body.entries) {
      expect(entry.value).toBe(0);
    }
    expect(body.totalDays).toBe(0);
    state.reportIdTemp = body.id;
  });

  test("POST /activity-reports → weekend entries flagged correctly", async () => {
    const res = await api("GET", `/activity-reports/${state.reportIdTemp}`);
    const body = await res.json();
    // March 2026: 1st is Sunday, 7th is Saturday
    const entry1 = body.entries.find((e: { date: string }) => e.date.includes("2026-03-01"));
    const entry7 = body.entries.find((e: { date: string }) => e.date.includes("2026-03-07"));
    const entry2 = body.entries.find((e: { date: string }) => e.date.includes("2026-03-02"));
    expect(entry1.isWeekend).toBe(true); // Sunday
    expect(entry7.isWeekend).toBe(true); // Saturday
    expect(entry2.isWeekend).toBe(false); // Monday
  });

  test("POST /activity-reports → dailyRate snapshot from mission", async () => {
    // The mission has dailyRate 700 (set in 04-missions.ts)
    const res = await api("GET", `/activity-reports/${state.reportIdTemp}`);
    const body = await res.json();
    expect(body.dailyRate).toBe(700);
  });

  test("POST /activity-reports month=0 → 400", async () => {
    const res = await api("POST", "/activity-reports", {
      body: { month: 0, year: 2026, missionId: state.missionId },
    });
    expect(res.status).toBe(400);
  });

  test("POST /activity-reports year=2101 → 400", async () => {
    const res = await api("POST", "/activity-reports", {
      body: { month: 1, year: 2101, missionId: state.missionId },
    });
    expect(res.status).toBe(400);
  });
});

describe("Report Entries — Extended", () => {
  test("PATCH entries → note-only update (no value)", async () => {
    // Revert main report to draft
    await api("PATCH", `/activity-reports/${state.reportId}`, { body: { status: "DRAFT" } });

    const res = await api("PATCH", `/activity-reports/${state.reportId}/entries`, {
      body: { entries: [{ id: state.entryId, note: "Meeting with client" }] },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    const entry = body.entries.find((e: { id: string }) => e.id === state.entryId);
    expect(entry.note).toBe("Meeting with client");
  });

  test("PATCH entries → clear note to null", async () => {
    const res = await api("PATCH", `/activity-reports/${state.reportId}/entries`, {
      body: { entries: [{ id: state.entryId, note: null }] },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    const entry = body.entries.find((e: { id: string }) => e.id === state.entryId);
    expect(entry.note).toBeNull();
  });

  test("PATCH entries → value 0.5 boundary", async () => {
    const res = await api("PATCH", `/activity-reports/${state.reportId}/entries`, {
      body: { entries: [{ id: state.entryId, value: 0.5 }] },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    const entry = body.entries.find((e: { id: string }) => e.id === state.entryId);
    expect(entry.value).toBe(0.5);
  });

  test("PATCH entries → value 1.01 exceeds max → 400", async () => {
    const res = await api("PATCH", `/activity-reports/${state.reportId}/entries`, {
      body: { entries: [{ id: state.entryId, value: 1.01 }] },
    });
    expect(res.status).toBe(400);
  });

  test("PATCH entries → totalDays recalculated correctly", async () => {
    // Clear first
    await api("PATCH", `/activity-reports/${state.reportId}/clear`);

    // Set two entries
    const res = await api("PATCH", `/activity-reports/${state.reportId}/entries`, {
      body: {
        entries: [
          { id: state.entryId, value: 1 },
          { id: state.entryId2, value: 0.5 },
        ],
      },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totalDays).toBe(1.5);
  });
});

describe("Auto-fill & Clear — Extended", () => {
  test("PATCH fill → weekends and holidays remain at 0", async () => {
    // Use the March 2026 report (reportIdTemp)
    const fillRes = await api("PATCH", `/activity-reports/${state.reportIdTemp}/fill`);
    expect(fillRes.status).toBe(200);
    const body = await fillRes.json();

    // All weekend entries should remain 0
    for (const entry of body.entries) {
      if (entry.isWeekend || entry.isHoliday) {
        expect(entry.value).toBe(0);
      }
    }

    // All non-weekend non-holiday entries should be 1
    for (const entry of body.entries) {
      if (!entry.isWeekend && !entry.isHoliday) {
        expect(entry.value).toBe(1);
      }
    }
  });

  test("PATCH fill → idempotent (same result when called twice)", async () => {
    const fillRes1 = await api("PATCH", `/activity-reports/${state.reportIdTemp}/fill`);
    const body1 = await fillRes1.json();

    const fillRes2 = await api("PATCH", `/activity-reports/${state.reportIdTemp}/fill`);
    const body2 = await fillRes2.json();

    expect(body1.totalDays).toBe(body2.totalDays);
  });

  test("PATCH clear → idempotent (same result when called twice)", async () => {
    await api("PATCH", `/activity-reports/${state.reportIdTemp}/clear`);
    const clearRes = await api("PATCH", `/activity-reports/${state.reportIdTemp}/clear`);
    const body = await clearRes.json();
    expect(body.totalDays).toBe(0);
  });

  test("PATCH clear → notes also cleared", async () => {
    // Set a note first
    const getRes = await api("GET", `/activity-reports/${state.reportIdTemp}`);
    const report = await getRes.json();
    const firstEntry = report.entries[0];

    await api("PATCH", `/activity-reports/${state.reportIdTemp}/entries`, {
      body: { entries: [{ id: firstEntry.id, note: "Will be cleared" }] },
    });

    // Clear
    const clearRes = await api("PATCH", `/activity-reports/${state.reportIdTemp}/clear`);
    const body = await clearRes.json();
    for (const entry of body.entries) {
      expect(entry.note).toBeNull();
    }
  });

  // Clean up temp report
  test("Cleanup: delete temp March report", async () => {
    const res = await api("DELETE", `/activity-reports/${state.reportIdTemp}`);
    expect(res.status).toBe(204);
  });
});

describe("Report Lifecycle — Extended", () => {
  test("PATCH report → invalid status value → 400", async () => {
    const res = await api("PATCH", `/activity-reports/${state.reportId}`, {
      body: { status: "INVALID" },
    });
    expect(res.status).toBe(400);
  });

  test("PATCH report → clear note to null on draft", async () => {
    const res = await api("PATCH", `/activity-reports/${state.reportId}`, {
      body: { note: null },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.note).toBeNull();
  });

  test("Complete report with 0 totalDays → allowed", async () => {
    // Create temp report, don't fill it
    const createRes = await api("POST", "/activity-reports", {
      body: { month: 4, year: 2026, missionId: state.missionId },
    });
    const report = await createRes.json();
    expect(report.totalDays).toBe(0);

    const res = await api("PATCH", `/activity-reports/${report.id}`, {
      body: { status: "COMPLETED" },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("COMPLETED");
    expect(body.totalDays).toBe(0);

    // Revert and delete
    await api("PATCH", `/activity-reports/${report.id}`, { body: { status: "DRAFT" } });
    await api("DELETE", `/activity-reports/${report.id}`);
  });

  test("PDF export with invalid locale → falls back to en", async () => {
    // Re-complete main report for PDF test
    await api("PATCH", `/activity-reports/${state.reportId}/fill`);
    await api("PATCH", `/activity-reports/${state.reportId}`, { body: { status: "COMPLETED" } });

    const res = await api("GET", `/activity-reports/${state.reportId}/pdf?locale=xx`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
  });

  test("PDF export with locale=de → 200", async () => {
    const res = await api("GET", `/activity-reports/${state.reportId}/pdf?locale=de`);
    expect(res.status).toBe(200);
  });

  test("PDF export with locale=es → 200", async () => {
    const res = await api("GET", `/activity-reports/${state.reportId}/pdf?locale=es`);
    expect(res.status).toBe(200);
  });

  test("PDF export with locale=pt → 200", async () => {
    const res = await api("GET", `/activity-reports/${state.reportId}/pdf?locale=pt`);
    expect(res.status).toBe(200);
  });

  test("PDF export → filename format is correct", async () => {
    const res = await api("GET", `/activity-reports/${state.reportId}/pdf`);
    expect(res.status).toBe(200);
    const disposition = res.headers.get("content-disposition");
    // Format: report-{client-slug}-{year}-{month}.pdf
    expect(disposition).toMatch(/report-.*-2026-01\.pdf/);
  });

  test("PDF export → body is non-empty", async () => {
    const res = await api("GET", `/activity-reports/${state.reportId}/pdf`);
    expect(res.status).toBe(200);
    const buffer = await res.arrayBuffer();
    expect(buffer.byteLength).toBeGreaterThan(0);
  });

  // Leave report in COMPLETED state for reporting tests
});
