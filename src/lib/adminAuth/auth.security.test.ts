// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hashPassword } from "./password";
import {
  clearLoginThrottleForTests,
  clearRevokedSessionsForTests,
  createCsrfToken,
  createSessionToken,
  ADMIN_CSRF_COOKIE,
  ADMIN_CSRF_HEADER,
  ADMIN_SESSION_COOKIE,
} from "./index";

const USERNAME = "silver-ops";
const PASSWORD = "test-password-not-for-prod";
const SECRET = "unit-test-session-secret-32bytes-minimum!!";

function installEnv(hash: string) {
  vi.stubEnv("CHAT_ADMIN_USERNAME", USERNAME);
  vi.stubEnv("CHAT_ADMIN_PASSWORD_HASH", hash);
  vi.stubEnv("CHAT_ADMIN_SESSION_SECRET", SECRET);
  vi.stubEnv("NODE_ENV", "test");
}

function cookieHeader(parts: Record<string, string>): string {
  return Object.entries(parts)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("; ");
}

async function loadRoutes() {
  vi.resetModules();
  const login = await import("@/app/api/admin/auth/login/route");
  const logout = await import("@/app/api/admin/auth/logout/route");
  const session = await import("@/app/api/admin/auth/session/route");
  return { login, logout, session };
}

describe("admin auth security", () => {
  let passwordHash = "";

  beforeEach(async () => {
    passwordHash = hashPassword(PASSWORD);
    installEnv(passwordHash);
    await clearLoginThrottleForTests();
    await clearRevokedSessionsForTests();
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await clearLoginThrottleForTests();
    await clearRevokedSessionsForTests();
  });

  it("logs in with valid credentials and issues a session cookie", async () => {
    const { login } = await loadRoutes();
    const csrf = createCsrfToken(SECRET);
    const response = await login.POST(
      new Request("https://join.example.test/api/admin/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://join.example.test",
          [ADMIN_CSRF_HEADER]: csrf,
          cookie: cookieHeader({ [ADMIN_CSRF_COOKIE]: csrf }),
        },
        body: JSON.stringify({ username: USERNAME, password: PASSWORD, csrfToken: csrf }),
      }),
    );
    expect(response.status).toBe(200);
    const setCookie = response.headers.getSetCookie?.() ?? [];
    const joined = setCookie.length ? setCookie.join("\n") : String(response.headers.get("set-cookie") ?? "");
    expect(joined).toContain(ADMIN_SESSION_COOKIE);
    expect(joined).toMatch(/Path=\//i);
    expect(joined).toMatch(/HttpOnly/i);
  });

  it("rejects wrong password with 401", async () => {
    const { login } = await loadRoutes();
    const csrf = createCsrfToken(SECRET);
    const response = await login.POST(
      new Request("https://join.example.test/api/admin/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://join.example.test",
          [ADMIN_CSRF_HEADER]: csrf,
          cookie: cookieHeader({ [ADMIN_CSRF_COOKIE]: csrf }),
        },
        body: JSON.stringify({ username: USERNAME, password: "nope", csrfToken: csrf }),
      }),
    );
    expect(response.status).toBe(401);
  });

  it("rejects login when admin auth env is missing", async () => {
    vi.stubEnv("CHAT_ADMIN_USERNAME", "");
    vi.stubEnv("CHAT_ADMIN_PASSWORD_HASH", "");
    vi.stubEnv("CHAT_ADMIN_SESSION_SECRET", "");
    const { login } = await loadRoutes();
    const response = await login.POST(
      new Request("https://join.example.test/api/admin/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://join.example.test",
        },
        body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
      }),
    );
    expect(response.status).toBe(401);
  });

  it("rejects state-changing requests with an invalid Origin", async () => {
    const { login } = await loadRoutes();
    const csrf = createCsrfToken(SECRET);
    const response = await login.POST(
      new Request("https://join.example.test/api/admin/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://evil.example",
          [ADMIN_CSRF_HEADER]: csrf,
          cookie: cookieHeader({ [ADMIN_CSRF_COOKIE]: csrf }),
        },
        body: JSON.stringify({ username: USERNAME, password: PASSWORD, csrfToken: csrf }),
      }),
    );
    expect(response.status).toBe(403);
    const body = (await response.json()) as { error: string };
    expect(body.error).toMatch(/origin/i);
  });

  it("rejects forged session cookies on the session probe", async () => {
    const { session } = await loadRoutes();
    const response = await session.GET(
      new Request("https://join.example.test/api/admin/auth/session", {
        headers: {
          cookie: cookieHeader({
            [ADMIN_SESSION_COOKIE]: "forged.payload.not-a-real-mac",
          }),
        },
      }),
    );
    expect(response.status).toBe(401);
  });

  it("rejects expired sessions on the session probe", async () => {
    const { session } = await loadRoutes();
    const now = Math.floor(Date.now() / 1000) - 10_000;
    const { token } = createSessionToken(USERNAME, SECRET, now, 60);
    const response = await session.GET(
      new Request("https://join.example.test/api/admin/auth/session", {
        headers: { cookie: cookieHeader({ [ADMIN_SESSION_COOKIE]: token }) },
      }),
    );
    expect(response.status).toBe(401);
  });

  it("returns 401 for unauthorized session API access", async () => {
    const { session } = await loadRoutes();
    const response = await session.GET(
      new Request("https://join.example.test/api/admin/auth/session"),
    );
    expect(response.status).toBe(401);
  });

  it("throttles repeated failed logins", async () => {
    const { login } = await loadRoutes();
    const csrf = createCsrfToken(SECRET);

    async function attempt() {
      return login.POST(
        new Request("https://join.example.test/api/admin/auth/login", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin: "https://join.example.test",
            [ADMIN_CSRF_HEADER]: csrf,
            cookie: cookieHeader({ [ADMIN_CSRF_COOKIE]: csrf }),
          },
          body: JSON.stringify({ username: USERNAME, password: "wrong", csrfToken: csrf }),
        }),
      );
    }

    for (let i = 0; i < 5; i += 1) {
      expect((await attempt()).status).toBe(401);
    }
    expect((await attempt()).status).toBe(429);
  });

  it("does not let spoofed X-Forwarded-For bypass login throttling", async () => {
    const { login } = await loadRoutes();
    const csrf = createCsrfToken(SECRET);

    async function attempt(forwardedFor: string) {
      return login.POST(
        new Request("https://join.example.test/api/admin/auth/login", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin: "https://join.example.test",
            "x-forwarded-for": forwardedFor,
            [ADMIN_CSRF_HEADER]: csrf,
            cookie: cookieHeader({ [ADMIN_CSRF_COOKIE]: csrf }),
          },
          body: JSON.stringify({ username: USERNAME, password: "wrong", csrfToken: csrf }),
        }),
      );
    }

    for (let i = 0; i < 5; i += 1) {
      expect((await attempt(`198.51.100.${i}`)).status).toBe(401);
    }
    // Without CHAT_ADMIN_TRUST_PROXY, spoofed headers must share one bucket.
    expect((await attempt("198.51.100.99")).status).toBe(429);
  });

  it("logs out, revokes the session, and clears the cookie", async () => {
    const { logout, session } = await loadRoutes();
    const { token, payload } = createSessionToken(USERNAME, SECRET);
    const csrf = createCsrfToken(SECRET);

    const before = await session.GET(
      new Request("https://join.example.test/api/admin/auth/session", {
        headers: { cookie: cookieHeader({ [ADMIN_SESSION_COOKIE]: token }) },
      }),
    );
    expect(before.status).toBe(200);

    const response = await logout.POST(
      new Request("https://join.example.test/api/admin/auth/logout", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://join.example.test",
          [ADMIN_CSRF_HEADER]: csrf,
          cookie: cookieHeader({
            [ADMIN_SESSION_COOKIE]: token,
            [ADMIN_CSRF_COOKIE]: csrf,
          }),
        },
        body: JSON.stringify({ csrfToken: csrf }),
      }),
    );
    expect(response.status).toBe(200);
    expect(payload.sid).toBeTruthy();

    const after = await session.GET(
      new Request("https://join.example.test/api/admin/auth/session", {
        headers: { cookie: cookieHeader({ [ADMIN_SESSION_COOKIE]: token }) },
      }),
    );
    expect(after.status).toBe(401);
  });

  it("never advertises Host/Owner privileges on a valid session", async () => {
    const { session } = await loadRoutes();
    const { token } = createSessionToken(USERNAME, SECRET);
    const response = await session.GET(
      new Request("https://join.example.test/api/admin/auth/session", {
        headers: { cookie: cookieHeader({ [ADMIN_SESSION_COOKIE]: token }) },
      }),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body.role).toBe("rrb_silver_campaign_operator");
    expect(JSON.stringify(body)).not.toMatch(/host|owner|isPlatformOwner|tenantId/i);
    expect(body.conversationOps).toBe("blocked_pending_silver_integration");
  });
});
