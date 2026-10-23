import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import {
  ADMIN_COOKIE_PATH,
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_TTL_SECONDS,
  CAMPAIGN_OPERATOR_ROLE,
} from "./constants";

export type AdminSessionPayload = {
  v: 1;
  /** Opaque session id for expiry + revocation checks. */
  sid: string;
  /** Operator username (campaign-local only). */
  sub: string;
  /** Issued-at unix seconds. */
  iat: number;
  /** Expiry unix seconds. */
  exp: number;
  /**
   * Fixed campaign operator marker. Never Host/Owner/platform roles and never
   * a tenant id — this app does not grant cross-tenant authorization.
   */
  role: typeof CAMPAIGN_OPERATOR_ROLE;
};

export type VerifiedAdminSession = AdminSessionPayload;

/** In-process revocation set. Multi-instance deploys need a shared store. */
const revokedUntil = new Map<string, number>();

function sweepRevoked(nowSec: number): void {
  for (const [sid, until] of revokedUntil) {
    if (until <= nowSec) revokedUntil.delete(sid);
  }
}

export function revokeSession(sid: string, expUnixSec: number): void {
  revokedUntil.set(sid, expUnixSec);
}

export function isSessionRevoked(sid: string, nowUnixSec = Math.floor(Date.now() / 1000)): boolean {
  sweepRevoked(nowUnixSec);
  const until = revokedUntil.get(sid);
  return typeof until === "number" && until > nowUnixSec;
}

/** Test helper: clear revocation registry. */
export function clearRevokedSessionsForTests(): void {
  revokedUntil.clear();
}

function sign(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

function safeEqualB64(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

export function createSessionToken(
  username: string,
  secret: string,
  nowUnixSec = Math.floor(Date.now() / 1000),
  ttlSeconds = ADMIN_SESSION_TTL_SECONDS,
): { token: string; payload: AdminSessionPayload } {
  const payload: AdminSessionPayload = {
    v: 1,
    sid: randomBytes(16).toString("base64url"),
    sub: username,
    iat: nowUnixSec,
    exp: nowUnixSec + ttlSeconds,
    role: CAMPAIGN_OPERATOR_ROLE,
  };
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const mac = sign(body, secret);
  return { token: `${body}.${mac}`, payload };
}

export function verifySessionToken(
  token: string | undefined | null,
  secret: string,
  nowUnixSec = Math.floor(Date.now() / 1000),
): VerifiedAdminSession | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, mac] = parts;
  if (!body || !mac) return null;

  const expected = sign(body, secret);
  if (!safeEqualB64(mac, expected)) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object") return null;
  const p = parsed as Partial<AdminSessionPayload>;
  if (
    p.v !== 1 ||
    typeof p.sid !== "string" ||
    typeof p.sub !== "string" ||
    typeof p.iat !== "number" ||
    typeof p.exp !== "number" ||
    p.role !== CAMPAIGN_OPERATOR_ROLE
  ) {
    return null;
  }

  if (!Number.isFinite(p.exp) || p.exp <= nowUnixSec) return null;
  if (!Number.isFinite(p.iat) || p.iat > nowUnixSec + 60) return null;
  if (isSessionRevoked(p.sid, nowUnixSec)) return null;

  return {
    v: 1,
    sid: p.sid,
    sub: p.sub,
    iat: p.iat,
    exp: p.exp,
    role: CAMPAIGN_OPERATOR_ROLE,
  };
}

export function sessionCookieOptions(maxAgeSeconds: number, secure: boolean) {
  return {
    name: ADMIN_SESSION_COOKIE,
    httpOnly: true as const,
    sameSite: "lax" as const,
    path: ADMIN_COOKIE_PATH,
    secure,
    maxAge: maxAgeSeconds,
  };
}

export function clearedSessionCookieOptions(secure: boolean) {
  return {
    ...sessionCookieOptions(0, secure),
    maxAge: 0,
  };
}

export { ADMIN_SESSION_COOKIE };
