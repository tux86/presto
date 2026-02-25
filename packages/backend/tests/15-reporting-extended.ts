import { describe, expect, test } from "bun:test";
import { api, state } from "./helpers";

describe("Reporting — Data Correctness", () => {
  test("GET /reporting?year=2026 → totalDays matches completed reports", async () => {
    const res = await api("GET", "/reporting?year=2026");
    expect(res.status).toBe(200);
    const body = await res.json();
    // Alice has 1 completed report (Jan 2026) with totalDays from fill
    expect(body.totalDays).toBeGreaterThan(0);
    expect(body.totalRevenue).toBeGreaterThan(0);
    expect(body.averageDailyRate).toBeGreaterThan(0);
  });

  test("GET /reporting?year=2026 → averageDailyRate = totalRevenue / totalDays", async () => {
    const res = await api("GET", "/reporting?year=2026");
    const body = await res.json();
    if (body.totalDays > 0) {
      const expected = body.totalRevenue / body.totalDays;
      expect(body.averageDailyRate).toBeCloseTo(expected, 2);
    }
  });

  test("GET /reporting?year=2026 → monthlyData has 12 entries", async () => {
    const res = await api("GET", "/reporting?year=2026");
    const body = await res.json();
    expect(body.monthlyData).toHaveLength(12);
    // Month numbers should be 1-12
    for (let i = 0; i < 12; i++) {
      expect(body.monthlyData[i].month).toBe(i + 1);
    }
  });

  test("GET /reporting?year=2026 → January has data, other months may not", async () => {
    const res = await api("GET", "/reporting?year=2026");
    const body = await res.json();
    const jan = body.monthlyData.find((m: { month: number }) => m.month === 1);
    expect(jan.days).toBeGreaterThan(0);
    expect(jan.revenue).toBeGreaterThan(0);
  });

  test("GET /reporting?year=2026 → clientData has at least one client", async () => {
    const res = await api("GET", "/reporting?year=2026");
    const body = await res.json();
    expect(body.clientData.length).toBeGreaterThanOrEqual(1);
    const client = body.clientData[0];
    expect(client).toHaveProperty("clientId");
    expect(client).toHaveProperty("clientName");
    expect(client).toHaveProperty("days");
    expect(client).toHaveProperty("revenue");
    expect(client).toHaveProperty("convertedRevenue");
  });

  test("GET /reporting?year=2026 → workingDaysInYear is reasonable", async () => {
    const res = await api("GET", "/reporting?year=2026");
    const body = await res.json();
    expect(body).toHaveProperty("workingDaysInYear");
    // Working days in a year should be roughly 220-262 (52 weeks * 5 days minus holidays)
    expect(body.workingDaysInYear).toBeGreaterThan(200);
    expect(body.workingDaysInYear).toBeLessThan(270);
  });

  test("GET /reporting?year=2026 → monthlyClientRevenue has 12 entries", async () => {
    const res = await api("GET", "/reporting?year=2026");
    const body = await res.json();
    expect(body).toHaveProperty("monthlyClientRevenue");
    expect(body.monthlyClientRevenue).toHaveLength(12);
  });

  test("GET /reporting → only aggregates COMPLETED reports", async () => {
    // Create a draft report for May 2026
    const createRes = await api("POST", "/activity-reports", {
      body: { month: 5, year: 2026, missionId: state.missionId },
    });
    const draftReport = await createRes.json();
    // Fill it (so it has totalDays > 0) but DON'T complete it
    await api("PATCH", `/activity-reports/${draftReport.id}/fill`);

    // Get reporting data
    const res = await api("GET", "/reporting?year=2026");
    const body = await res.json();

    // May should have 0 days because the report is still DRAFT
    const may = body.monthlyData.find((m: { month: number }) => m.month === 5);
    expect(may.days).toBe(0);

    // Clean up
    await api("DELETE", `/activity-reports/${draftReport.id}`);
  });

  test("GET /reporting?year=2025 → previousYear is null (no 2024 data)", async () => {
    const res = await api("GET", "/reporting?year=2025");
    const body = await res.json();
    expect(body.previousYear).toBeNull();
  });

  test("GET /reporting → year boundary 2000 → 200", async () => {
    const res = await api("GET", "/reporting?year=2000");
    expect(res.status).toBe(200);
  });

  test("GET /reporting → year boundary 2100 → 200", async () => {
    const res = await api("GET", "/reporting?year=2100");
    expect(res.status).toBe(200);
  });
});

describe("Settings — Extended Validation", () => {
  test("PATCH /settings with invalid baseCurrency → 400", async () => {
    const res = await api("PATCH", "/settings", { body: { baseCurrency: "INVALID" } });
    expect(res.status).toBe(400);
  });

  test("PATCH /settings → theme auto", async () => {
    const res = await api("PATCH", "/settings", { body: { theme: "auto" } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.theme).toBe("auto");
  });

  test("PATCH /settings → locale de", async () => {
    const res = await api("PATCH", "/settings", { body: { locale: "de" } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.locale).toBe("de");
  });

  test("PATCH /settings → locale es", async () => {
    const res = await api("PATCH", "/settings", { body: { locale: "es" } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.locale).toBe("es");
  });

  test("PATCH /settings → locale pt", async () => {
    const res = await api("PATCH", "/settings", { body: { locale: "pt" } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.locale).toBe("pt");
  });

  test("PATCH /settings → multiple fields at once", async () => {
    const res = await api("PATCH", "/settings", {
      body: { theme: "light", locale: "fr", baseCurrency: "GBP" },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.theme).toBe("light");
    expect(body.locale).toBe("fr");
    expect(body.baseCurrency).toBe("GBP");
  });

  test("PATCH /settings → empty body succeeds (no changes)", async () => {
    const res = await api("PATCH", "/settings", { body: {} });
    expect(res.status).toBe(200);
  });

  test("PATCH /settings without auth → 401", async () => {
    const res = await api("PATCH", "/settings", {
      token: "",
      body: { theme: "dark" },
    });
    expect(res.status).toBe(401);
  });

  test("GET /settings → Bob has separate settings", async () => {
    const res = await api("GET", "/settings", { token: state.token2 });
    expect(res.status).toBe(200);
    const body = await res.json();
    // Bob's settings should be defaults, not Alice's modified ones
    expect(body.theme).toBe("dark");
    expect(body.locale).toBe("en");
    expect(body.baseCurrency).toBe("EUR");
  });

  // Reset Alice's settings for test stability
  test("Reset settings to defaults", async () => {
    const res = await api("PATCH", "/settings", {
      body: { baseCurrency: "EUR", theme: "dark", locale: "en" },
    });
    expect(res.status).toBe(200);
  });
});

describe("Config — Extended", () => {
  test("GET /config → has defaults object", async () => {
    const res = await api("GET", "/config", { token: "" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("defaults");
  });
});
