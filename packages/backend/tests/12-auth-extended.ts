import { describe, expect, test } from "bun:test";
import { api, state } from "./helpers";

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

  test("PATCH /auth/profile → update all fields at once", async () => {
    const res = await api("PATCH", "/auth/profile", {
      body: { firstName: "Alice", lastName: "Dupont" },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.firstName).toBe("Alice");
    expect(body.lastName).toBe("Dupont");
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
  });
});

describe("Auth — Change Password", () => {
  test("PATCH /auth/password without auth → 401", async () => {
    const res = await api("PATCH", "/auth/password", {
      token: "",
      body: { currentPassword: "SecurePass1", newPassword: "NewSecure1" },
    });
    expect(res.status).toBe(401);
  });

  test("PATCH /auth/password with wrong current password → 401", async () => {
    const res = await api("PATCH", "/auth/password", {
      body: { currentPassword: "WrongPassword1", newPassword: "NewSecure1" },
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Invalid current password");
  });

  test("PATCH /auth/password with weak new password → 400", async () => {
    const res = await api("PATCH", "/auth/password", {
      body: { currentPassword: "SecurePass1", newPassword: "weak" },
    });
    expect(res.status).toBe(400);
  });

  test("PATCH /auth/password with correct current password → 204", async () => {
    const res = await api("PATCH", "/auth/password", {
      body: { currentPassword: "SecurePass1", newPassword: "NewSecure1" },
    });
    expect(res.status).toBe(204);
  });

  test("POST /auth/login with old password fails after change → 401", async () => {
    const res = await api("POST", "/auth/login", {
      token: "",
      body: { email: "alice@example.com", password: "SecurePass1" },
    });
    expect(res.status).toBe(401);
  });

  test("POST /auth/login with new password succeeds after change → 200", async () => {
    const res = await api("POST", "/auth/login", {
      token: "",
      body: { email: "alice@example.com", password: "NewSecure1" },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.token).toBeTruthy();
    state.token = body.token;
  });

  // Restore original password for remaining tests
  test("PATCH /auth/password → restore original password", async () => {
    const res = await api("PATCH", "/auth/password", {
      body: { currentPassword: "NewSecure1", newPassword: "SecurePass1" },
    });
    expect(res.status).toBe(204);
  });
});

describe("Auth — Delete Account", () => {
  let throwawayToken = "";

  test("POST /auth/register → create throwaway user", async () => {
    const res = await api("POST", "/auth/register", {
      token: "",
      body: { email: "throwaway@example.com", password: "SecurePass1", firstName: "Del", lastName: "User" },
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    throwawayToken = body.token;
  });

  test("Create dependent data for throwaway user", async () => {
    // Create a client
    const clientRes = await api("POST", "/clients", {
      token: throwawayToken,
      body: { name: "Throwaway Client", currency: "EUR", holidayCountry: "FR" },
    });
    expect(clientRes.status).toBe(201);
    const client = await clientRes.json();

    // Get the default company
    const companiesRes = await api("GET", "/companies", { token: throwawayToken });
    expect(companiesRes.status).toBe(200);
    const companies = await companiesRes.json();
    expect(companies.length).toBeGreaterThan(0);

    // Create a mission
    const missionRes = await api("POST", "/missions", {
      token: throwawayToken,
      body: { name: "Throwaway Mission", clientId: client.id, companyId: companies[0].id },
    });
    expect(missionRes.status).toBe(201);
    const mission = await missionRes.json();

    // Create an activity report
    const reportRes = await api("POST", "/activity-reports", {
      token: throwawayToken,
      body: { month: 1, year: 2025, missionId: mission.id },
    });
    expect(reportRes.status).toBe(201);
  });

  test("POST /auth/delete-account without auth → 401", async () => {
    const res = await api("POST", "/auth/delete-account", {
      token: "",
      body: { password: "SecurePass1" },
    });
    expect(res.status).toBe(401);
  });

  test("POST /auth/delete-account with empty body → 400", async () => {
    const res = await api("POST", "/auth/delete-account", {
      token: throwawayToken,
      body: {},
    });
    expect(res.status).toBe(400);
  });

  test("POST /auth/delete-account with wrong password → 401", async () => {
    const res = await api("POST", "/auth/delete-account", {
      token: throwawayToken,
      body: { password: "WrongPassword1" },
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Invalid password");
  });

  test("POST /auth/delete-account with correct password → 204", async () => {
    const res = await api("POST", "/auth/delete-account", {
      token: throwawayToken,
      body: { password: "SecurePass1" },
    });
    expect(res.status).toBe(204);
  });

  test("POST /auth/login after delete → 401 (user gone)", async () => {
    const res = await api("POST", "/auth/login", {
      token: "",
      body: { email: "throwaway@example.com", password: "SecurePass1" },
    });
    expect(res.status).toBe(401);
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
