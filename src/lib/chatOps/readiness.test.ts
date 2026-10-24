// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { probeConversationOpsReadiness } from "./readiness";

const VALID_TOKEN = "b".repeat(32);

function diagnosticsOk(scopes = [
  "chat:dashboard",
  "chat:read",
  "chat:diagnostics",
  "chat:reply",
  "chat:resolve",
  "chat:reopen",
]) {
  return new Response(
    JSON.stringify({
      ok: true,
      apiVersion: "1",
      requestId: "diag-1",
      tenant: { key: "rrb-silver-campaign", market: "IN", displayName: "Silver" },
      generatedAt: new Date().toISOString(),
      data: {
        authentication: { valid: true, integrationId: "rrb-silver-campaign-next", scopes },
        tenantBinding: { tenantId: "rrb-silver-campaign", valid: true, active: true },
      },
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

describe("probeConversationOpsReadiness", () => {
  it("reports not_configured when ops env is missing", async () => {
    const result = await probeConversationOpsReadiness({ env: {} });
    expect(result).toMatchObject({
      status: "not_configured",
      ready: false,
      config: { opsConfigured: false },
    });
  });

  it("does not report ready from env alone", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: false,
          error: { code: "integration_unauthorized", message: "nope" },
        }),
        { status: 401, headers: { "content-type": "application/json" } },
      ),
    );
    const result = await probeConversationOpsReadiness({
      env: {
        CHAT_INTEGRATION_API_BASE_URL: "https://uk.primewayz.com",
        RRB_SILVER_CHAT_INTEGRATION_TOKEN: VALID_TOKEN,
      },
      fetchImpl,
    });
    expect(result.ready).toBe(false);
    expect(result.status).toBe("unauthorized");
  });

  it("reports ready only after tenant-validated diagnostics", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(diagnosticsOk());
    const result = await probeConversationOpsReadiness({
      env: {
        CHAT_INTEGRATION_API_BASE_URL: "https://uk.primewayz.com",
        RRB_SILVER_CHAT_INTEGRATION_TOKEN: VALID_TOKEN,
      },
      fetchImpl,
    });
    expect(result).toMatchObject({ status: "ready", ready: true });
  });

  it("reports unauthorized when required scopes are missing", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(diagnosticsOk(["chat:dashboard", "chat:read"]));
    const result = await probeConversationOpsReadiness({
      env: {
        CHAT_INTEGRATION_API_BASE_URL: "https://uk.primewayz.com",
        RRB_SILVER_CHAT_INTEGRATION_TOKEN: VALID_TOKEN,
      },
      fetchImpl,
    });
    expect(result.status).toBe("unauthorized");
    expect(result.ready).toBe(false);
  });

  it("reports unavailable for suspended tenant responses", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: false,
          error: {
            code: "tenant_unavailable",
            message: "The bound tenant is not available.",
          },
        }),
        { status: 503, headers: { "content-type": "application/json" } },
      ),
    );
    const result = await probeConversationOpsReadiness({
      env: {
        CHAT_INTEGRATION_API_BASE_URL: "https://uk.primewayz.com",
        RRB_SILVER_CHAT_INTEGRATION_TOKEN: VALID_TOKEN,
      },
      fetchImpl,
    });
    expect(result.status).toBe("unavailable");
    expect(result.ready).toBe(false);
  });
});
