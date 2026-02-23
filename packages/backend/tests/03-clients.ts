import { describe, expect, test } from "bun:test";
import { api, state } from "./helpers";

describe("Clients", () => {
  test("POST /clients → 201", async () => {
    const res = await api("POST", "/clients", {
      body: { name: "Acme Corp", currency: "EUR", holidayCountry: "FR" },
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe("Acme Corp");
    expect(body.currency).toBe("EUR");
    expect(body.holidayCountry).toBe("FR");
    state.clientId = body.id;
  });

  test("POST /clients with all optional fields → 201", async () => {
    const res = await api("POST", "/clients", {
      body: {
        name: "Beta Inc",
        email: "contact@beta.com",
        phone: "+33 1 23 45 67 89",
        address: "123 Rue de la Paix, Paris",
        businessId: "SIRET-123456",
        currency: "USD",
        holidayCountry: "US",
      },
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.email).toBe("contact@beta.com");
    state.clientId2 = body.id;
  });

  test("POST /clients missing required fields → 400", async () => {
    const res = await api("POST", "/clients", {
      body: { name: "Missing Fields" },
    });
    expect(res.status).toBe(400);
  });

  test("POST /clients invalid currency → 400", async () => {
    const res = await api("POST", "/clients", {
      body: { name: "Bad Currency", currency: "INVALID", holidayCountry: "FR" },
    });
    expect(res.status).toBe(400);
  });

  test("POST /clients without auth → 401", async () => {
    const res = await api("POST", "/clients", {
      token: "",
      body: { name: "No Auth", currency: "EUR", holidayCountry: "FR" },
    });
    expect(res.status).toBe(401);
  });

  test("GET /clients → 200 with list", async () => {
    const res = await api("GET", "/clients");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.length).toBeGreaterThanOrEqual(2);
  });

  test("PATCH /clients/:id → 200 updated", async () => {
    const res = await api("PATCH", `/clients/${state.clientId}`, {
      body: { name: "Acme Corporation", email: "hello@acme.com" },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Acme Corporation");
    expect(body.email).toBe("hello@acme.com");
  });

  test("PATCH /clients/:id clear optional field → 200", async () => {
    const res = await api("PATCH", `/clients/${state.clientId}`, {
      body: { email: null },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.email).toBeNull();
  });

  test("PATCH /clients/:id not found → 404", async () => {
    const res = await api("PATCH", "/clients/nonexistent-id", {
      body: { name: "Ghost" },
    });
    expect(res.status).toBe(404);
  });

  test("Ownership check — other user cannot update → 404", async () => {
    // Register second user
    const regRes = await api("POST", "/auth/register", {
      token: "",
      body: { email: "bob@example.com", password: "SecurePass1", firstName: "Bob", lastName: "Martin" },
    });
    const regBody = await regRes.json();
    state.token2 = regBody.token;

    // Bob creates a client
    const bobClientRes = await api("POST", "/clients", {
      token: state.token2,
      body: { name: "Bob Client", currency: "GBP", holidayCountry: "GB" },
    });
    const bobClientBody = await bobClientRes.json();
    state.bobClientId = bobClientBody.id;

    // Alice tries to update Bob's client
    const res = await api("PATCH", `/clients/${state.bobClientId}`, {
      body: { name: "Hijacked" },
    });
    expect(res.status).toBe(404);
  });

  test("DELETE /clients/:id (no missions) → 204", async () => {
    const res = await api("DELETE", `/clients/${state.clientId2}`);
    expect(res.status).toBe(204);
  });

  test("DELETE /clients/:id not found → 404", async () => {
    const res = await api("DELETE", "/clients/nonexistent-id");
    expect(res.status).toBe(404);
  });
});
