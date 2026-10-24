// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createMemorySharedStore,
  createRedisRestSharedStore,
  readSharedStoreConfig,
  setAdminAuthSharedStoreForTests,
} from "./sharedStore";
import { isLoginThrottled, recordLoginFailure } from "./rateLimit";
import { createSessionToken, revokeSession, verifySessionToken } from "./session";

const SECRET = "shared-store-test-secret-32bytes-minimum!!";

afterEach(() => {
  setAdminAuthSharedStoreForTests(null);
  vi.unstubAllGlobals();
});

describe("admin auth shared store", () => {
  it("shares session revocation across two process facades with the same backend", async () => {
    const revoked = new Map<string, number>();
    const login = new Map();
    const instanceA = createMemorySharedStore({ revoked, login });
    const instanceB = createMemorySharedStore({ revoked, login });

    const now = 1_700_000_000;
    const { token, payload } = createSessionToken("silver-ops", SECRET, now, 3600);

    setAdminAuthSharedStoreForTests(instanceA);
    await revokeSession(payload.sid, payload.exp);

    setAdminAuthSharedStoreForTests(instanceB);
    expect(await verifySessionToken(token, SECRET, now + 10)).toBeNull();
  });

  it("shares login throttle counters across two process facades with the same backend", async () => {
    const revoked = new Map<string, number>();
    const login = new Map();
    const instanceA = createMemorySharedStore({ revoked, login });
    const instanceB = createMemorySharedStore({ revoked, login });
    const ip = "203.0.113.77";
    const now = 1_000_000;

    setAdminAuthSharedStoreForTests(instanceA);
    for (let i = 0; i < 5; i += 1) {
      await recordLoginFailure(ip, now);
    }

    setAdminAuthSharedStoreForTests(instanceB);
    expect(await isLoginThrottled(ip, now)).toBe(true);
  });

  it("does not treat isolated memory stores as shared across instances", async () => {
    const instanceA = createMemorySharedStore();
    const instanceB = createMemorySharedStore();
    const now = 1_700_000_000;
    const { token, payload } = createSessionToken("silver-ops", SECRET, now, 3600);

    setAdminAuthSharedStoreForTests(instanceA);
    await revokeSession(payload.sid, payload.exp);

    setAdminAuthSharedStoreForTests(instanceB);
    expect(await verifySessionToken(token, SECRET, now + 10)).not.toBeNull();
  });

  it("requires https shared-store URL and token together", () => {
    expect(readSharedStoreConfig({})).toBeNull();
    expect(
      readSharedStoreConfig({
        CHAT_ADMIN_SHARED_STORE_URL: "https://example-redis.upstash.io",
      }),
    ).toBeNull();
    expect(
      readSharedStoreConfig({
        CHAT_ADMIN_SHARED_STORE_URL: "http://insecure.example",
        CHAT_ADMIN_SHARED_STORE_TOKEN: "token",
      }),
    ).toBeNull();
    expect(
      readSharedStoreConfig({
        CHAT_ADMIN_SHARED_STORE_URL: "https://example-redis.upstash.io",
        CHAT_ADMIN_SHARED_STORE_TOKEN: "token",
      }),
    ).toEqual({
      url: "https://example-redis.upstash.io",
      token: "token",
    });
  });

  it("writes revocation through the Redis REST adapter", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json([{ result: "OK" }], { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const store = createRedisRestSharedStore({
      url: "https://example-redis.upstash.io",
      token: "test-token",
    });
    await store.revokeSession("sid-1", Math.floor(Date.now() / 1000) + 3600);

    expect(fetchMock).toHaveBeenCalledOnce();
    const call = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const [url, init] = call;
    expect(url).toBe("https://example-redis.upstash.io");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer test-token",
    });
    const body = JSON.parse(String(init.body)) as unknown[][];
    expect(body[0]?.[0]).toBe("SET");
    expect(body[0]?.[1]).toBe("rrb_admin:revoked:sid-1");
  });
});
