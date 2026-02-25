import { describe, expect, test } from "bun:test";
import { api, state } from "./helpers";

describe("Companies", () => {
  test("POST /companies → 201", async () => {
    const res = await api("POST", "/companies", {
      body: { name: "Second Corp" },
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe("Second Corp");
    expect(body.isDefault).toBe(false);
    state.companyId2 = body.id;
  });

  test("POST /companies with all fields → 201", async () => {
    const res = await api("POST", "/companies", {
      body: { name: "Full Corp", address: "123 Main St", businessId: "BIZ-001" },
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.address).toBe("123 Main St");
    expect(body.businessId).toBe("BIZ-001");
    // Clean up
    await api("DELETE", `/companies/${body.id}`);
  });

  test("POST /companies missing name → 400", async () => {
    const res = await api("POST", "/companies", {
      body: {},
    });
    expect(res.status).toBe(400);
  });

  test("POST /companies without auth → 401", async () => {
    const res = await api("POST", "/companies", {
      token: "",
      body: { name: "No Auth Corp" },
    });
    expect(res.status).toBe(401);
  });

  test("GET /companies → 200 with list", async () => {
    const res = await api("GET", "/companies");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.length).toBeGreaterThanOrEqual(2);
  });

  test("PATCH /companies/:id → 200 updated", async () => {
    const res = await api("PATCH", `/companies/${state.companyId2}`, {
      body: { name: "Updated Corp" },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Updated Corp");
  });

  test("PATCH /companies/:id set isDefault → 200", async () => {
    const res = await api("PATCH", `/companies/${state.companyId2}`, {
      body: { isDefault: true },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.isDefault).toBe(true);

    // Verify old default was unset
    const listRes = await api("GET", "/companies");
    const list = await listRes.json();
    const defaults = list.filter((c: { isDefault: boolean }) => c.isDefault);
    expect(defaults.length).toBe(1);
    expect(defaults[0].id).toBe(state.companyId2);

    // Revert default back to original
    await api("PATCH", `/companies/${state.companyId}`, {
      body: { isDefault: true },
    });
  });

  test("PATCH /companies/:id unset only default → 400", async () => {
    // companyId is the only default — unsetting it should fail
    const res = await api("PATCH", `/companies/${state.companyId}`, {
      body: { isDefault: false },
    });
    expect(res.status).toBe(400);
  });

  test("PATCH /companies/:id not found → 404", async () => {
    const res = await api("PATCH", "/companies/nonexistent-id", {
      body: { name: "Ghost" },
    });
    expect(res.status).toBe(404);
  });

  test("DELETE /companies/:id (no missions) → 204", async () => {
    // Create a temp company to delete
    const createRes = await api("POST", "/companies", {
      body: { name: "Temp Corp" },
    });
    const { id } = await createRes.json();
    const res = await api("DELETE", `/companies/${id}`);
    expect(res.status).toBe(204);
  });

  test("DELETE /companies/:id not found → 404", async () => {
    const res = await api("DELETE", "/companies/nonexistent-id");
    expect(res.status).toBe(404);
  });

  test("Bob creates a company", async () => {
    // First register Bob if not yet done — Bob is registered in 03-clients
    const res = await api("GET", "/companies", { token: state.token2 });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.length).toBeGreaterThanOrEqual(1);
    state.bobCompanyId = body[0].id;
  });
});
