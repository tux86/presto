import { describe, expect, test } from "bun:test";
import { api } from "./helpers";

describe("Reporting", () => {
  test("GET /reporting → 200 with yearly data", async () => {
    const res = await api("GET", "/reporting");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("year");
    expect(body).toHaveProperty("totalDays");
    expect(body).toHaveProperty("totalRevenue");
    expect(body).toHaveProperty("averageDailyRate");
    expect(body).toHaveProperty("monthlyData");
    expect(body).toHaveProperty("clientData");
  });

  test("GET /reporting?year=2026 → 200 with correct year", async () => {
    const res = await api("GET", "/reporting?year=2026");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.year).toBe(2026);
  });

  test("GET /reporting?year=2020 → 200 with zero totals", async () => {
    const res = await api("GET", "/reporting?year=2020");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totalDays).toBe(0);
    expect(body.totalRevenue).toBe(0);
  });

  test("GET /reporting?year=abc → 400", async () => {
    const res = await api("GET", "/reporting?year=abc");
    expect(res.status).toBe(400);
  });

  test("GET /reporting without auth → 401", async () => {
    const res = await api("GET", "/reporting", { token: "" });
    expect(res.status).toBe(401);
  });
});
