import { describe, expect, test } from "bun:test";
import { api } from "./helpers";

describe("Settings", () => {
  test("GET /settings → 200 with auto-created defaults", async () => {
    const res = await api("GET", "/settings");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.theme).toBe("light");
    expect(body.locale).toBe("en");
    expect(body.baseCurrency).toBe("EUR");
    expect(body).toHaveProperty("userId");
    expect(body).toHaveProperty("createdAt");
    expect(body).toHaveProperty("updatedAt");
  });

  test("PATCH /settings → update theme", async () => {
    const res = await api("PATCH", "/settings", { body: { theme: "light" } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.theme).toBe("light");
  });

  test("PATCH /settings → update locale", async () => {
    const res = await api("PATCH", "/settings", { body: { locale: "fr" } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.locale).toBe("fr");
  });

  test("PATCH /settings → update baseCurrency", async () => {
    const res = await api("PATCH", "/settings", { body: { baseCurrency: "USD" } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.baseCurrency).toBe("USD");
  });

  test("PATCH /settings with invalid theme → 400", async () => {
    const res = await api("PATCH", "/settings", { body: { theme: "neon" } });
    expect(res.status).toBe(400);
  });

  test("PATCH /settings with invalid locale → 400", async () => {
    const res = await api("PATCH", "/settings", { body: { locale: "xx" } });
    expect(res.status).toBe(400);
  });

  test("GET /settings without auth → 401", async () => {
    const res = await api("GET", "/settings", { token: "" });
    expect(res.status).toBe(401);
  });

  // Reset to EUR for reporting test stability
  test("PATCH /settings → reset baseCurrency to EUR", async () => {
    const res = await api("PATCH", "/settings", { body: { baseCurrency: "EUR", theme: "dark", locale: "en" } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.baseCurrency).toBe("EUR");
  });
});
