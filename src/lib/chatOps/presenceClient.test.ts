// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import {
  callCentralPresenceHeartbeat,
  callCentralPresenceOffline,
  CENTRAL_OPERATOR_PRESENCE_HEARTBEAT_PATH,
  CENTRAL_OPERATOR_PRESENCE_OFFLINE_PATH,
} from "./presenceClient";

const config = {
  apiBaseUrl: "https://uk.primewayz.com",
  opsToken: "ops-token-for-tests-32chars-min!!",
};

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("presenceClient", () => {
  it("posts heartbeat with Bearer and verifies Silver tenant", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        success: true,
        version: "v1",
        tenantId: "rrb-silver-campaign",
        operatorRef: "sil:aaaa:bbbb:cccccccccccccccccccccccccccccccc",
        expiresInMs: 300_000,
        presencePolicy: "legacy_forced_online",
        duplicated: false,
      }),
    );

    const result = await callCentralPresenceHeartbeat({
      config,
      operatorRef: "sil:aaaa:bbbb:cccccccccccccccccccccccccccccccc",
      clientActionId: "11111111-1111-1111-1111-111111111111",
      fetchImpl,
    });

    expect(result.expiresInMs).toBe(300_000);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      `https://uk.primewayz.com${CENTRAL_OPERATOR_PRESENCE_HEARTBEAT_PATH}`,
    );
    expect((init.headers as Record<string, string>).authorization).toBe(
      `Bearer ${config.opsToken}`,
    );
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body.operatorRef).toBe("sil:aaaa:bbbb:cccccccccccccccccccccccccccccccc");
    expect(body.tenantId).toBeUndefined();
    expect(body.operatorUserId).toBeUndefined();
  });

  it("rejects tenant mismatch on heartbeat", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        success: true,
        version: "v1",
        tenantId: "pw-infotech",
        operatorRef: "x",
        expiresInMs: 300_000,
        presencePolicy: "legacy_forced_online",
        duplicated: false,
      }),
    );
    await expect(
      callCentralPresenceHeartbeat({
        config,
        operatorRef: "sil:aaaa:bbbb:cccccccccccccccccccccccccccccccc",
        fetchImpl,
      }),
    ).rejects.toMatchObject({ code: "tenant_mismatch" });
  });

  it("maps unauthorized and forbidden_scope", async () => {
    const unauthorized = vi.fn().mockResolvedValue(
      jsonResponse(401, { success: false, code: "unauthorized", error: "nope" }),
    );
    await expect(
      callCentralPresenceHeartbeat({
        config,
        operatorRef: "sil:aaaa:bbbb:cccccccccccccccccccccccccccccccc",
        fetchImpl: unauthorized,
      }),
    ).rejects.toMatchObject({ code: "unauthorized", status: 401 });

    const forbidden = vi.fn().mockResolvedValue(
      jsonResponse(403, {
        success: false,
        code: "forbidden_scope",
        error: "missing write",
      }),
    );
    await expect(
      callCentralPresenceOffline({
        config,
        operatorRef: "sil:aaaa:bbbb:cccccccccccccccccccccccccccccccc",
        notAfterMs: Date.now(),
        fetchImpl: forbidden,
      }),
    ).rejects.toMatchObject({ code: "forbidden", status: 403 });
  });

  it("posts offline with notAfterMs to the v1 offline path", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        success: true,
        version: "v1",
        tenantId: "rrb-silver-campaign",
        operatorRef: "sil:aaaa:bbbb:cccccccccccccccccccccccccccccccc",
        cleared: 1,
        duplicated: false,
      }),
    );
    const result = await callCentralPresenceOffline({
      config,
      operatorRef: "sil:aaaa:bbbb:cccccccccccccccccccccccccccccccc",
      notAfterMs: 1_700_000_000_000,
      fetchImpl,
    });
    expect(result.cleared).toBe(1);
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      `https://uk.primewayz.com${CENTRAL_OPERATOR_PRESENCE_OFFLINE_PATH}`,
    );
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body.notAfterMs).toBe(1_700_000_000_000);
  });
});
