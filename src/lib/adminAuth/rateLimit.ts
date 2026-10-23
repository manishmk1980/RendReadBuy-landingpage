import { LOGIN_MAX_FAILURES, LOGIN_WINDOW_MS } from "./constants";

type Bucket = {
  failures: number;
  windowStartedAt: number;
};

const buckets = new Map<string, Bucket>();

/** Test helper. */
export function clearLoginThrottleForTests(): void {
  buckets.clear();
}

function prune(now: number): void {
  for (const [key, bucket] of buckets) {
    if (now - bucket.windowStartedAt > LOGIN_WINDOW_MS) {
      buckets.delete(key);
    }
  }
}

/**
 * In-process per-IP login throttle.
 * Multi-instance / multi-region deploys do not share this map — use a shared
 * store before scaling beyond a single Node process.
 */
export function isLoginThrottled(
  ip: string,
  now = Date.now(),
  maxFailures = LOGIN_MAX_FAILURES,
  windowMs = LOGIN_WINDOW_MS,
): boolean {
  prune(now);
  const bucket = buckets.get(ip);
  if (!bucket) return false;
  if (now - bucket.windowStartedAt > windowMs) {
    buckets.delete(ip);
    return false;
  }
  return bucket.failures >= maxFailures;
}

export function recordLoginFailure(
  ip: string,
  now = Date.now(),
  windowMs = LOGIN_WINDOW_MS,
): void {
  prune(now);
  const bucket = buckets.get(ip);
  if (!bucket || now - bucket.windowStartedAt > windowMs) {
    buckets.set(ip, { failures: 1, windowStartedAt: now });
    return;
  }
  bucket.failures += 1;
}

export function clearLoginFailures(ip: string): void {
  buckets.delete(ip);
}

export function clientIpFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 128);
  }
  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp.slice(0, 128);
  return "unknown";
}
