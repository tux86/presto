import { describe, expect, test } from "bun:test";
import { api, state } from "./helpers";

describe("Auth", () => {
  test("POST /auth/register → 201 with token and user", async () => {
    const res = await api("POST", "/auth/register", {
      token: "",
      body: {
        email: "alice@example.com",
        password: "SecurePass1",
        firstName: "Alice",
        lastName: "Dupont",
        company: "Acme Corp",
      },
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.user.email).toBe("alice@example.com");
    expect(body.user.company).toBe("Acme Corp");
    expect(body.token).toBeTruthy();
    state.token = body.token;
    state.userId = body.user.id;
  });

  test("POST /auth/register duplicate email → 409", async () => {
    const res = await api("POST", "/auth/register", {
      token: "",
      body: { email: "alice@example.com", password: "SecurePass1", firstName: "Bob", lastName: "Martin" },
    });
    expect(res.status).toBe(409);
  });

  test("POST /auth/register weak password (no uppercase) → 400", async () => {
    const res = await api("POST", "/auth/register", {
      token: "",
      body: { email: "weak@example.com", password: "alllowercase1", firstName: "Weak", lastName: "User" },
    });
    expect(res.status).toBe(400);
  });

  test("POST /auth/register weak password (no digit) → 400", async () => {
    const res = await api("POST", "/auth/register", {
      token: "",
      body: { email: "weak2@example.com", password: "NoDigitHere", firstName: "Weak", lastName: "User" },
    });
    expect(res.status).toBe(400);
  });

  test("POST /auth/register password too short → 400", async () => {
    const res = await api("POST", "/auth/register", {
      token: "",
      body: { email: "short@example.com", password: "Ab1", firstName: "Short", lastName: "Pass" },
    });
    expect(res.status).toBe(400);
  });

  test("POST /auth/register missing required fields → 400", async () => {
    const res = await api("POST", "/auth/register", {
      token: "",
      body: { email: "incomplete@example.com" },
    });
    expect(res.status).toBe(400);
  });

  test("POST /auth/register invalid email → 400", async () => {
    const res = await api("POST", "/auth/register", {
      token: "",
      body: { email: "not-an-email", password: "SecurePass1", firstName: "Bad", lastName: "Email" },
    });
    expect(res.status).toBe(400);
  });

  test("POST /auth/login valid credentials → 200 with token", async () => {
    const res = await api("POST", "/auth/login", {
      token: "",
      body: { email: "alice@example.com", password: "SecurePass1" },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.token).toBeTruthy();
    state.token = body.token;
  });

  test("POST /auth/login wrong password → 401", async () => {
    const res = await api("POST", "/auth/login", {
      token: "",
      body: { email: "alice@example.com", password: "WrongPassword1" },
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Invalid credentials");
  });

  test("POST /auth/login non-existent email → 401", async () => {
    const res = await api("POST", "/auth/login", {
      token: "",
      body: { email: "nobody@example.com", password: "SecurePass1" },
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Invalid credentials");
  });

  test("GET /auth/me → 200 with user data", async () => {
    const res = await api("GET", "/auth/me");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.email).toBe("alice@example.com");
  });

  test("GET /auth/me without token → 401", async () => {
    const res = await api("GET", "/auth/me", { token: "" });
    expect(res.status).toBe(401);
  });

  test("GET /auth/me with invalid token → 401", async () => {
    const res = await api("GET", "/auth/me", { token: "invalid.jwt.token" });
    expect(res.status).toBe(401);
  });
});
