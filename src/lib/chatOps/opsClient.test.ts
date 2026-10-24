// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { callCentralChatOps } from "./opsClient";

const config = {
  apiBaseUrl: "https://uk.primewayz.com",
  opsToken: "ops-token-for-tests-32chars-min!!",
};

function jsonResponse(status: number, body: unknown, headers?: HeadersInit) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

describe("callCentralChatOps", () => {
  it("rejects tenant authority fields before calling central", async () => {
    const fetchImpl = vi.fn();
    await expect(
      callCentralChatOps({
        config,
        // @ts-expect-error intentional tenant override attempt
        body: { action: "dashboard", tenantId: "pw-infotech" },
        fetchImpl,
      }),
    ).rejects.toMatchObject({ code: "tenant_override_rejected" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects destructive actions locally", async () => {
    const fetchImpl = vi.fn();
    await expect(
      callCentralChatOps({
        config,
        // @ts-expect-error intentional forbidden action
        body: { action: "delete", sessionId: "s1" },
        fetchImpl,
      }),
    ).rejects.toMatchObject({ code: "action_not_permitted" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("verifies returned tenant identity", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        ok: true,
        apiVersion: "1",
        requestId: "req-1",
        tenant: { key: "pw-infotech", market: "IN", displayName: "Other" },
        generatedAt: new Date().toISOString(),
        data: {},
      }),
    );
    await expect(
      callCentralChatOps({
        config,
        body: { action: "diagnostics" },
        fetchImpl,
      }),
    ).rejects.toMatchObject({ code: "tenant_mismatch" });
  });

  it("maps revoked credentials to unauthorized", async () => {
    const fetchImpl = vi.fn().mockImplementation(() =>
      Promise.resolve(
        jsonResponse(401, {
          ok: false,
          error: {
            code: "integration_unauthorized",
            message: "Missing or invalid integration credential.",
          },
        }),
      ),
    );
    await expect(
      callCentralChatOps({
        config,
        body: { action: "diagnostics" },
        fetchImpl,
      }),
    ).rejects.toMatchObject({ status: 401, code: "unauthorized" });
  });

  it("maps suspended tenant to unavailable/forbidden without leaking the token", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(503, {
        ok: false,
        error: {
          code: "tenant_unavailable",
          message: "The bound tenant is not available.",
        },
      }),
    );
    try {
      await callCentralChatOps({
        config,
        body: { action: "dashboard", inbox: "active" },
        fetchImpl,
      });
      expect.unreachable();
    } catch (err) {
      expect(err).toMatchObject({ code: "tenant_unavailable" });
      expect(JSON.stringify(err)).not.toContain(config.opsToken);
    }
  });

  it("treats cross-tenant conversation misses as not found", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(404, {
        ok: false,
        error: {
          code: "conversation_not_found",
          message: "Conversation not found.",
        },
      }),
    );
    await expect(
      callCentralChatOps({
        config,
        body: {
          action: "conversation",
          sessionId: "other-tenant-session",
        },
        fetchImpl,
      }),
    ).rejects.toMatchObject({ status: 404, code: "conversation_not_found" });
  });

  it("strips destructive operator capability flags on success", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        ok: true,
        apiVersion: "1",
        requestId: "req-2",
        tenant: {
          key: "rrb-silver-campaign",
          market: "IN",
          displayName: "Silver",
        },
        generatedAt: new Date().toISOString(),
        data: {
          operator: {
            canReply: true,
            canResolve: true,
            canReopen: true,
            canArchive: true,
            canDelete: true,
          },
          recentConversations: [],
        },
      }),
    );
    const envelope = await callCentralChatOps({
      config,
      body: { action: "dashboard", inbox: "active" },
      fetchImpl,
    });
    const data = envelope.data as {
      operator: Record<string, boolean>;
    };
    expect(data.operator.canArchive).toBe(false);
    expect(data.operator.canDelete).toBe(false);
    expect(data.operator.canReply).toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://uk.primewayz.com/api/integrations/wordpress/chat",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: `Bearer ${config.opsToken}`,
        }),
      }),
    );
  });
});
