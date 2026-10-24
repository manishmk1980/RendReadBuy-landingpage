import { LOGIN_WINDOW_MS } from "./constants";

/**
 * Shared auth state for session revocation and login throttling.
 *
 * Default: in-process memory (safe for a single Node process).
 * Multi-instance / multi-region: set CHAT_ADMIN_SHARED_STORE_URL +
 * CHAT_ADMIN_SHARED_STORE_TOKEN to an Upstash-compatible Redis REST endpoint
 * so every instance shares the same revocation and throttle keys.
 */

export type LoginThrottleBucket = {
  failures: number;
  windowStartedAt: number;
};

export type AdminAuthSharedStore = {
  revokeSession(sid: string, expUnixSec: number): Promise<void>;
  isSessionRevoked(sid: string, nowUnixSec: number): Promise<boolean>;
  getLoginBucket(ip: string): Promise<LoginThrottleBucket | null>;
  setLoginBucket(ip: string, bucket: LoginThrottleBucket, ttlMs: number): Promise<void>;
  clearLoginBucket(ip: string): Promise<void>;
  /** Test / process reset helper. */
  clearAll(): Promise<void>;
};

const REVOKED_PREFIX = "rrb_admin:revoked:";
const LOGIN_PREFIX = "rrb_admin:login:";

type EnvLike = Record<string, string | undefined>;

export function readSharedStoreConfig(env: EnvLike = process.env): {
  url: string;
  token: string;
} | null {
  const url = env.CHAT_ADMIN_SHARED_STORE_URL?.trim();
  const token = env.CHAT_ADMIN_SHARED_STORE_TOKEN?.trim();
  if (!url || !token) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return null;
  } catch {
    return null;
  }
  return { url: url.replace(/\/$/, ""), token };
}

export function createMemorySharedStore(
  seed?: {
    revoked?: Map<string, number>;
    login?: Map<string, LoginThrottleBucket>;
  },
): AdminAuthSharedStore {
  const revokedUntil = seed?.revoked ?? new Map<string, number>();
  const loginBuckets = seed?.login ?? new Map<string, LoginThrottleBucket>();

  return {
    async revokeSession(sid, expUnixSec) {
      revokedUntil.set(sid, expUnixSec);
    },
    async isSessionRevoked(sid, nowUnixSec) {
      for (const [key, until] of revokedUntil) {
        if (until <= nowUnixSec) revokedUntil.delete(key);
      }
      const until = revokedUntil.get(sid);
      return typeof until === "number" && until > nowUnixSec;
    },
    async getLoginBucket(ip) {
      return loginBuckets.get(ip) ?? null;
    },
    async setLoginBucket(ip, bucket, _ttlMs) {
      void _ttlMs;
      loginBuckets.set(ip, bucket);
    },
    async clearLoginBucket(ip) {
      loginBuckets.delete(ip);
    },
    async clearAll() {
      revokedUntil.clear();
      loginBuckets.clear();
    },
  };
}

type RedisPipelineResponse = Array<{ result?: unknown } | null>;

async function redisCommand(
  config: { url: string; token: string },
  command: Array<string | number>,
): Promise<unknown> {
  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify([command]),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Shared store command failed (${response.status}).`);
  }
  const body = (await response.json()) as RedisPipelineResponse;
  return body[0]?.result;
}

/**
 * Upstash Redis REST adapter. Uses path-style GET commands so no extra
 * dependency is required. Failures propagate to callers (auth fails closed).
 */
export function createRedisRestSharedStore(config: {
  url: string;
  token: string;
}): AdminAuthSharedStore {
  return {
    async revokeSession(sid, expUnixSec) {
      const now = Math.floor(Date.now() / 1000);
      const ttl = Math.max(1, expUnixSec - now);
      await redisCommand(config, ["SET", `${REVOKED_PREFIX}${sid}`, String(expUnixSec), "EX", String(ttl)]);
    },
    async isSessionRevoked(sid, nowUnixSec) {
      const raw = await redisCommand(config, ["GET", `${REVOKED_PREFIX}${sid}`]);
      if (typeof raw !== "string") return false;
      const until = Number(raw);
      return Number.isFinite(until) && until > nowUnixSec;
    },
    async getLoginBucket(ip) {
      const raw = await redisCommand(config, ["GET", `${LOGIN_PREFIX}${ip}`]);
      if (typeof raw !== "string") return null;
      try {
        const parsed = JSON.parse(raw) as Partial<LoginThrottleBucket>;
        if (
          typeof parsed.failures !== "number" ||
          typeof parsed.windowStartedAt !== "number"
        ) {
          return null;
        }
        return { failures: parsed.failures, windowStartedAt: parsed.windowStartedAt };
      } catch {
        return null;
      }
    },
    async setLoginBucket(ip, bucket, ttlMs) {
      const ttlSec = Math.max(1, Math.ceil(ttlMs / 1000));
      await redisCommand(config, [
        "SET",
        `${LOGIN_PREFIX}${ip}`,
        JSON.stringify(bucket),
        "EX",
        String(ttlSec),
      ]);
    },
    async clearLoginBucket(ip) {
      await redisCommand(config, ["DEL", `${LOGIN_PREFIX}${ip}`]);
    },
    async clearAll() {
      // Intentionally no FLUSH — tests use memory stores. Production keys expire via TTL.
    },
  };
}

let activeStore: AdminAuthSharedStore | null = null;

export function resolveAdminAuthSharedStore(env: EnvLike = process.env): AdminAuthSharedStore {
  const remote = readSharedStoreConfig(env);
  if (remote) return createRedisRestSharedStore(remote);
  return createMemorySharedStore();
}

export function getAdminAuthSharedStore(): AdminAuthSharedStore {
  if (!activeStore) {
    activeStore = resolveAdminAuthSharedStore();
  }
  return activeStore;
}

/** Replace the process-wide store (tests / after env changes). */
export function setAdminAuthSharedStoreForTests(store: AdminAuthSharedStore | null): void {
  activeStore = store;
}

export function resetAdminAuthSharedStoreFromEnv(env: EnvLike = process.env): void {
  activeStore = resolveAdminAuthSharedStore(env);
}

export { LOGIN_WINDOW_MS };
