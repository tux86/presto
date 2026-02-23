import { describe, expect, test } from "bun:test";
import { api } from "./helpers";

describe("Health & Config", () => {
  test("GET /health → 200 with status ok", async () => {
    const res = await api("GET", "/health", { token: "" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
  });

  test("GET /config → 200 with public config fields", async () => {
    const res = await api("GET", "/config", { token: "" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("appName");
    expect(body).toHaveProperty("authDisabled");
    expect(body).toHaveProperty("registrationEnabled");
  });
});
