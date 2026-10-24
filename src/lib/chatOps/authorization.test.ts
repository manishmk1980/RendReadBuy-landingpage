// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hashPassword } from "@/lib/adminAuth/password";
import {
  ADMIN_CSRF_COOKIE,
  ADMIN_CSRF_HEADER,
  ADMIN_SESSION_COOKIE,
  clearRevokedSessionsForTests,
  createCsrfToken,
  createSessionToken,
} from "@/lib/adminAuth";

const USERNAME = "silver-ops";
const PASSWORD = "test-password-not-for-prod";
const SECRET = "unit-test-session-secret-32bytes-minimum!!";
const OPS_TOKEN = "c".repeat(32);

function installAdminEnv(hash: string) {
  vi.stubEnv("CHAT_ADMIN_USERNAME", USERNAME);
  vi.stubEnv("CHAT_ADMIN_PASSWORD_HASH", hash);
  vi.stubEnv("CHAT_ADMIN_SESSION_SECRET", SECRET);
  vi.stubEnv("NODE_ENV", "test");
}

function installOpsEnv() {
  vi.stubEnv("CHAT_INTEGRATION_API_BASE_URL", "https://uk.primewayz.com");
  vi.stubEnv("RRB_SILVER_CHAT_INTEGRATION_TOKEN", OPS_TOKEN);
}

function cookieHeader(parts: Record<string, string>): string {
  return Object.entries(parts)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("; ");
}

async function loadChatRoutes() {
  vi.resetModules();
  const dashboard = await import("@/app/api/admin/chat/dashboard/route");
  const reply = await import("@/app/api/admin/chat/reply/route");
  const readiness = await import("@/app/api/admin/chat/readiness/route");
  return { dashboard, reply, readiness };
}

describe("admin chat authorization", () => {
  let passwordHash = "";

  beforeEach(() => {
    passwordHash = hashPassword(PASSWORD);
    installAdminEnv(passwordHash);
    clearRevokedSessionsForTests();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    clearRevokedSessionsForTests();
  });

  it("rejects unauthenticated dashboard access", async () => {
    installOpsEnv();
    const { dashboard } = await loadChatRoutes();
    const response = await dashboard.GET(
      new Request("https://join.example.test/api/admin/chat/dashboard"),
    );
    expect(response.status).toBe(401);
  });

  it("rejects reply without CSRF / with bad origin", async () => {
    installOpsEnv();
    const { reply } = await loadChatRoutes();
    const { token } = createSessionToken(USERNAME, SECRET);
    const response = await reply.POST(
      new Request("https://join.example.test/api/admin/chat/reply", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://evil.example",
          cookie: cookieHeader({ [ADMIN_SESSION_COOKIE]: token }),
        },
        body: JSON.stringify({ sessionId: "sess-1", text: "hello" }),
      }),
    );
    expect(response.status).toBe(403);
  });

  it("rejects tenant override on reply", async () => {
    installOpsEnv();
    const { reply } = await loadChatRoutes();
    const { token } = createSessionToken(USERNAME, SECRET);
    const csrf = createCsrfToken(SECRET);
    const response = await reply.POST(
      new Request("https://join.example.test/api/admin/chat/reply", {
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
        body: JSON.stringify({
          sessionId: "sess-1",
          text: "hello",
          tenantId: "pw-infotech",
          csrfToken: csrf,
        }),
      }),
    );
    expect(response.status).toBe(400);
    const body = (await response.json()) as {
      error: { code: string };
    };
    expect(body.error.code).toBe("tenant_override_rejected");
  });

  it("returns not_configured when ops env is absent", async () => {
    const { readiness } = await loadChatRoutes();
    const { token } = createSessionToken(USERNAME, SECRET);
    const response = await readiness.GET(
      new Request("https://join.example.test/api/admin/chat/readiness", {
        headers: { cookie: cookieHeader({ [ADMIN_SESSION_COOKIE]: token }) },
      }),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      conversationOps: string;
      ready: boolean;
      productionReady: boolean;
    };
    expect(body.conversationOps).toBe("not_configured");
    expect(body.ready).toBe(false);
    expect(body.productionReady).toBe(false);
  });

  it("never returns the ops token in error or success JSON", async () => {
    installOpsEnv();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ok: false,
            error: {
              code: "integration_unauthorized",
              message: "Missing or invalid integration credential.",
            },
          }),
          { status: 401, headers: { "content-type": "application/json" } },
        ),
      ),
    );
    const { readiness } = await loadChatRoutes();
    const { token } = createSessionToken(USERNAME, SECRET);
    const response = await readiness.GET(
      new Request("https://join.example.test/api/admin/chat/readiness", {
        headers: { cookie: cookieHeader({ [ADMIN_SESSION_COOKIE]: token }) },
      }),
    );
    const text = await response.text();
    expect(text).not.toContain(OPS_TOKEN);
    expect(text).not.toMatch(/Bearer/i);
  });
});
