import { describe, expect, test } from "bun:test";
import { api } from "./helpers";

describe("Auth — Profile", () => {
  test("PATCH /auth/profile → update firstName", async () => {
    const res = await api("PATCH", "/auth/profile", {
      body: { firstName: "Alicia" },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.firstName).toBe("Alicia");
    expect(body.lastName).toBe("Dupont"); // unchanged
  });

  test("PATCH /auth/profile → update lastName", async () => {
    const res = await api("PATCH", "/auth/profile", {
      body: { lastName: "Martin" },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.lastName).toBe("Martin");
  });

  test("PATCH /auth/profile → set company", async () => {
    const res = await api("PATCH", "/auth/profile", {
      body: { company: "New Corp" },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.company).toBe("New Corp");
  });

  test("PATCH /auth/profile → clear company to null", async () => {
    const res = await api("PATCH", "/auth/profile", {
      body: { company: null },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.company).toBeNull();
  });

  test("PATCH /auth/profile → update all fields at once", async () => {
    const res = await api("PATCH", "/auth/profile", {
      body: { firstName: "Alice", lastName: "Dupont", company: "Acme Corp" },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.firstName).toBe("Alice");
    expect(body.lastName).toBe("Dupont");
    expect(body.company).toBe("Acme Corp");
  });

  test("PATCH /auth/profile → password excluded from response", async () => {
    const res = await api("PATCH", "/auth/profile", {
      body: { firstName: "Alice" },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.password).toBeUndefined();
  });

  test("PATCH /auth/profile without auth → 401", async () => {
    const res = await api("PATCH", "/auth/profile", {
      token: "",
      body: { firstName: "Hacker" },
    });
    expect(res.status).toBe(401);
  });

  test("GET /auth/me → verify profile updates persisted", async () => {
    const res = await api("GET", "/auth/me");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.firstName).toBe("Alice");
    expect(body.lastName).toBe("Dupont");
    expect(body.company).toBe("Acme Corp");
  });
});

describe("Auth — Extended Validation", () => {
  test("POST /auth/register password without lowercase → 400", async () => {
    const res = await api("POST", "/auth/register", {
      token: "",
      body: { email: "nolower@example.com", password: "ALLUPPER123", firstName: "No", lastName: "Lower" },
    });
    expect(res.status).toBe(400);
  });

  test("POST /auth/register → password excluded from response", async () => {
    const res = await api("POST", "/auth/register", {
      token: "",
      body: { email: "pwcheck@example.com", password: "SecurePass1", firstName: "PW", lastName: "Check" },
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.user.password).toBeUndefined();
    // Clean up: we don't need this user further
  });

  test("POST /auth/login → password excluded from response", async () => {
    const res = await api("POST", "/auth/login", {
      token: "",
      body: { email: "pwcheck@example.com", password: "SecurePass1" },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.password).toBeUndefined();
  });

  test("POST /auth/register → email normalized to lowercase", async () => {
    const res = await api("POST", "/auth/register", {
      token: "",
      body: { email: "CaseTest@EXAMPLE.COM", password: "SecurePass1", firstName: "Case", lastName: "Test" },
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.user.email).toBe("casetest@example.com");
  });

  test("POST /auth/login → email case-insensitive", async () => {
    const res = await api("POST", "/auth/login", {
      token: "",
      body: { email: "CASETEST@example.com", password: "SecurePass1" },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.email).toBe("casetest@example.com");
  });

  test("GET /auth/me → password field not present", async () => {
    const res = await api("GET", "/auth/me");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.password).toBeUndefined();
  });
});
