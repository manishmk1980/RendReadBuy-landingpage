import { LOGIN_MAX_FAILURES, LOGIN_WINDOW_MS } from "./constants";
import { getAdminAuthSharedStore } from "./sharedStore";

type EnvLike = Record<string, string | undefined>;

/** Test helper. */
export async function clearLoginThrottleForTests(): Promise<void> {
  await getAdminAuthSharedStore().clearAll();
}

/**
 * In-process or shared-store per-IP login throttle.
 * Multi-instance deploys must configure CHAT_ADMIN_SHARED_STORE_* (see README).
 */
export async function isLoginThrottled(
  ip: string,
  now = Date.now(),
  maxFailures = LOGIN_MAX_FAILURES,
  windowMs = LOGIN_WINDOW_MS,
): Promise<boolean> {
  const store = getAdminAuthSharedStore();
  const bucket = await store.getLoginBucket(ip);
  if (!bucket) return false;
  if (now - bucket.windowStartedAt > windowMs) {
    await store.clearLoginBucket(ip);
    return false;
  }
  return bucket.failures >= maxFailures;
}

export async function recordLoginFailure(
  ip: string,
  now = Date.now(),
  windowMs = LOGIN_WINDOW_MS,
): Promise<void> {
  const store = getAdminAuthSharedStore();
  const bucket = await store.getLoginBucket(ip);
  const next =
    !bucket || now - bucket.windowStartedAt > windowMs
      ? { failures: 1, windowStartedAt: now }
      : { failures: bucket.failures + 1, windowStartedAt: bucket.windowStartedAt };
  const remaining = Math.max(1, windowMs - (now - next.windowStartedAt));
  await store.setLoginBucket(ip, next, remaining);
}

export async function clearLoginFailures(ip: string): Promise<void> {
  await getAdminAuthSharedStore().clearLoginBucket(ip);
}

/**
 * Whether client-supplied forwarding headers may be used for login throttling.
 * Only enable when the edge proxy overwrites/strips client X-Forwarded-For.
 */
export function isTrustedProxyEnabled(env: EnvLike = process.env): boolean {
  const raw = env.CHAT_ADMIN_TRUST_PROXY?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

/**
 * Client IP for login throttling.
 *
 * When CHAT_ADMIN_TRUST_PROXY is not enabled, client-controlled headers such as
 * X-Forwarded-For and X-Real-IP are ignored so attackers cannot mint fresh
 * throttle buckets by spoofing them. Untrusted requests share one bucket key.
 */
export function clientIpFromHeaders(
  headers: Headers,
  env: EnvLike = process.env,
): string {
  if (isTrustedProxyEnabled(env)) {
    const forwarded = headers.get("x-forwarded-for");
    if (forwarded) {
      const first = forwarded.split(",")[0]?.trim();
      if (first) return first.slice(0, 128);
    }
    const realIp = headers.get("x-real-ip")?.trim();
    if (realIp) return realIp.slice(0, 128);
    const vercel = headers.get("x-vercel-forwarded-for")?.trim();
    if (vercel) {
      const first = vercel.split(",")[0]?.trim();
      if (first) return first.slice(0, 128);
    }
  }
  return "untrusted";
}
