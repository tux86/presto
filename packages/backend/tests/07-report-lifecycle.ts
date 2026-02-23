import { describe, expect, test } from "bun:test";
import { api, state } from "./helpers";

describe("Report Lifecycle", () => {
  test("Fill workdays before completing", async () => {
    const res = await api("PATCH", `/activity-reports/${state.reportId}/fill`);
    expect(res.status).toBe(200);
  });

  test("PATCH /activity-reports/:id status COMPLETED → 200", async () => {
    const res = await api("PATCH", `/activity-reports/${state.reportId}`, {
      body: { status: "COMPLETED" },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("COMPLETED");
  });

  test("Update entries on completed report → 400", async () => {
    const res = await api("PATCH", `/activity-reports/${state.reportId}/entries`, {
      body: { entries: [{ id: state.entryId, value: 0 }] },
    });
    expect(res.status).toBe(400);
  });

  test("Fill on completed report → 400", async () => {
    const res = await api("PATCH", `/activity-reports/${state.reportId}/fill`);
    expect(res.status).toBe(400);
  });

  test("Clear on completed report → 400", async () => {
    const res = await api("PATCH", `/activity-reports/${state.reportId}/clear`);
    expect(res.status).toBe(400);
  });

  test("Edit note on completed report → 400", async () => {
    const res = await api("PATCH", `/activity-reports/${state.reportId}`, {
      body: { note: "Trying to edit completed" },
    });
    expect(res.status).toBe(400);
  });

  test("Revert to draft → 200", async () => {
    const res = await api("PATCH", `/activity-reports/${state.reportId}`, {
      body: { status: "DRAFT" },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("DRAFT");
  });

  test("Re-complete for next tests", async () => {
    const res = await api("PATCH", `/activity-reports/${state.reportId}`, {
      body: { status: "COMPLETED" },
    });
    expect(res.status).toBe(200);
  });

  test("Revert + edit note simultaneously → 200", async () => {
    const res = await api("PATCH", `/activity-reports/${state.reportId}`, {
      body: { status: "DRAFT", note: "Reverted with updated note" },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("DRAFT");
    expect(body.note).toBe("Reverted with updated note");
  });

  test("Set note on draft → 200", async () => {
    const res = await api("PATCH", `/activity-reports/${state.reportId}`, {
      body: { note: "January delivery note" },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.note).toBe("January delivery note");
  });

  test("Delete a draft report → 204", async () => {
    // Create a temp report to delete
    const createRes = await api("POST", "/activity-reports", {
      body: { month: 2, year: 2026, missionId: state.missionId },
    });
    const createBody = await createRes.json();
    state.reportIdTemp = createBody.id;

    const res = await api("DELETE", `/activity-reports/${state.reportIdTemp}`);
    expect(res.status).toBe(204);
  });

  test("Delete completed report → 400", async () => {
    // Complete the report first
    await api("PATCH", `/activity-reports/${state.reportId}`, {
      body: { status: "COMPLETED" },
    });

    const res = await api("DELETE", `/activity-reports/${state.reportId}`);
    expect(res.status).toBe(400);
  });

  test("PDF export completed report → 200 with PDF headers", async () => {
    const res = await api("GET", `/activity-reports/${state.reportId}/pdf`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("content-disposition")).toContain("attachment");
  });

  test("PDF export French locale → 200", async () => {
    const res = await api("GET", `/activity-reports/${state.reportId}/pdf?locale=fr`);
    expect(res.status).toBe(200);
  });

  test("PDF export draft report → 400", async () => {
    // Revert to draft
    await api("PATCH", `/activity-reports/${state.reportId}`, {
      body: { status: "DRAFT" },
    });
    const res = await api("GET", `/activity-reports/${state.reportId}/pdf`);
    expect(res.status).toBe(400);
  });

  test("Re-complete for reporting/FK tests", async () => {
    const res = await api("PATCH", `/activity-reports/${state.reportId}`, {
      body: { status: "COMPLETED" },
    });
    expect(res.status).toBe(200);
  });

  test("PDF export not found → 404", async () => {
    const res = await api("GET", "/activity-reports/nonexistent-id/pdf");
    expect(res.status).toBe(404);
  });
});
