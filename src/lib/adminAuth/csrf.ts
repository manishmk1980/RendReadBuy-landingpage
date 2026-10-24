import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import {
  ADMIN_COOKIE_PATH,
  ADMIN_CSRF_COOKIE,
  ADMIN_CSRF_HEADER,
  ADMIN_CSRF_TTL_SECONDS,
} from "./constants";

type CsrfPayload = {
  v: 1;
  nonce: string;
  exp: number;
};

function sign(body: string, secret: string): string {
  return createHmac("sha256", secret).update(`csrf:${body}`).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

export function createCsrfToken(
  secret: string,
  nowUnixSec = Math.floor(Date.now() / 1000),
  ttlSeconds = ADMIN_CSRF_TTL_SECONDS,
): string {
  const payload: CsrfPayload = {
    v: 1,
    nonce: randomBytes(16).toString("base64url"),
    exp: nowUnixSec + ttlSeconds,
  };
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${body}.${sign(body, secret)}`;
}

export function verifyCsrfToken(
  token: string | undefined | null,
  secret: string,
  nowUnixSec = Math.floor(Date.now() / 1000),
): boolean {
  if (!token || typeof token !== "string") return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [body, mac] = parts;
  if (!body || !mac) return false;
  if (!safeEqual(mac, sign(body, secret))) return false;

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return false;
  }
  if (!parsed || typeof parsed !== "object") return false;
  const p = parsed as Partial<CsrfPayload>;
  if (p.v !== 1 || typeof p.nonce !== "string" || typeof p.exp !== "number") {
    return false;
  }
  return Number.isFinite(p.exp) && p.exp > nowUnixSec;
}

/**
 * Double-submit: the submitted token must match the CSRF cookie value and
 * both must verify under the session secret.
 */
export function verifyDoubleSubmitCsrf(
  submitted: string | undefined | null,
  cookieValue: string | undefined | null,
  secret: string,
  nowUnixSec = Math.floor(Date.now() / 1000),
): boolean {
  if (!submitted || !cookieValue) return false;
  if (!safeEqual(submitted, cookieValue)) return false;
  return verifyCsrfToken(submitted, secret, nowUnixSec);
}

export function csrfCookieOptions(maxAgeSeconds: number, secure: boolean) {
  return {
    name: ADMIN_CSRF_COOKIE,
    httpOnly: false as const,
    sameSite: "lax" as const,
    path: ADMIN_COOKIE_PATH,
    secure,
    maxAge: maxAgeSeconds,
  };
}

export function clearedCsrfCookieOptions(secure: boolean) {
  return {
    ...csrfCookieOptions(0, secure),
    maxAge: 0,
  };
}

export function readCsrfFromRequest(request: Request): string | null {
  const header = request.headers.get(ADMIN_CSRF_HEADER)?.trim();
  if (header) return header;
  return null;
}

export { ADMIN_CSRF_COOKIE, ADMIN_CSRF_HEADER };
