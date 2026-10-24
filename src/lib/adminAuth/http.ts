import { cookies } from "next/headers";
import { requireAdminAuthConfig } from "./config";
import { ADMIN_CSRF_TTL_SECONDS } from "./constants";
import {
  ADMIN_CSRF_COOKIE,
  ADMIN_CSRF_HEADER,
  createCsrfToken,
  csrfCookieOptions,
  readCsrfFromRequest,
  verifyDoubleSubmitCsrf,
} from "./csrf";
import { isTrustedMutationOrigin } from "./origin";
import {
  ADMIN_SESSION_COOKIE,
  type VerifiedAdminSession,
  verifySessionToken,
} from "./session";

export function isSecureRequest(request?: Request): boolean {
  if (process.env.NODE_ENV === "production") return true;
  if (!request) return false;
  try {
    return new URL(request.url).protocol === "https:";
  } catch {
    return false;
  }
}

export async function readSessionCookieValue(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get(ADMIN_SESSION_COOKIE)?.value;
}

export async function getVerifiedAdminSession(
  nowUnixSec = Math.floor(Date.now() / 1000),
): Promise<VerifiedAdminSession | null> {
  const config = requireAdminAuthConfig();
  if (!config) return null;
  const token = await readSessionCookieValue();
  return verifySessionToken(token, config.sessionSecret, nowUnixSec);
}

export async function getVerifiedAdminSessionFromRequest(
  request: Request,
  nowUnixSec = Math.floor(Date.now() / 1000),
): Promise<VerifiedAdminSession | null> {
  const config = requireAdminAuthConfig();
  if (!config) return null;
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ADMIN_SESSION_COOKIE}=`));
  const token = match?.slice(ADMIN_SESSION_COOKIE.length + 1);
  return verifySessionToken(token, config.sessionSecret, nowUnixSec);
}

export function readCookieFromRequest(request: Request, name: string): string | undefined {
  const cookieHeader = request.headers.get("cookie") ?? "";
  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(`${name}=`)) {
      return decodeURIComponent(trimmed.slice(name.length + 1));
    }
  }
  return undefined;
}

export type MutationGuardResult =
  | { ok: true }
  | { ok: false; status: 403; error: string };

/**
 * CSRF (double-submit) + Origin/Referer for state-changing admin APIs.
 * Origin checks use CHAT_ADMIN_PUBLIC_ORIGIN when set (required in production
 * behind HTTPS termination); they never trust X-Forwarded-Host/Proto.
 * Uses CHAT_ADMIN_SESSION_SECRET to MAC CSRF tokens when configured.
 * When auth is not configured, mutations still fail closed on Origin.
 */
export function guardAdminMutation(request: Request): MutationGuardResult {
  if (!isTrustedMutationOrigin(request)) {
    return { ok: false, status: 403, error: "Invalid origin." };
  }

  const config = requireAdminAuthConfig();
  if (!config) {
    return { ok: false, status: 403, error: "Admin auth is not configured." };
  }

  const submitted =
    readCsrfFromRequest(request) ??
    // Allow form-urlencoded / JSON body callers to pass the header only;
    // body CSRF is parsed by the route after this guard when needed.
    undefined;
  const cookieToken = readCookieFromRequest(request, ADMIN_CSRF_COOKIE);

  // Header-only path for JSON clients. Form posts also send the header from the client form.
  if (!verifyDoubleSubmitCsrf(submitted, cookieToken, config.sessionSecret)) {
    return { ok: false, status: 403, error: "Invalid CSRF token." };
  }

  return { ok: true };
}

/**
 * Same as guardAdminMutation but accepts an explicit submitted CSRF token
 * (e.g. from JSON body) when the header was omitted.
 */
export function guardAdminMutationWithToken(
  request: Request,
  submittedToken: string | undefined | null,
): MutationGuardResult {
  if (!isTrustedMutationOrigin(request)) {
    return { ok: false, status: 403, error: "Invalid origin." };
  }

  const config = requireAdminAuthConfig();
  if (!config) {
    return { ok: false, status: 403, error: "Admin auth is not configured." };
  }

  const submitted = submittedToken || readCsrfFromRequest(request);
  const cookieToken = readCookieFromRequest(request, ADMIN_CSRF_COOKIE);
  if (!verifyDoubleSubmitCsrf(submitted, cookieToken, config.sessionSecret)) {
    return { ok: false, status: 403, error: "Invalid CSRF token." };
  }

  return { ok: true };
}

/**
 * Sets the CSRF cookie via next/headers cookies().
 * Only call from Route Handlers or Server Actions — not during RSC render.
 */
export async function issueCsrfCookie(secure: boolean): Promise<string | null> {
  const config = requireAdminAuthConfig();
  if (!config) return null;
  const token = createCsrfToken(config.sessionSecret);
  const jar = await cookies();
  const opts = csrfCookieOptions(ADMIN_CSRF_TTL_SECONDS, secure);
  jar.set(opts.name, token, {
    httpOnly: opts.httpOnly,
    sameSite: opts.sameSite,
    path: opts.path,
    secure: opts.secure,
    maxAge: opts.maxAge,
  });
  return token;
}

export { ADMIN_CSRF_HEADER, ADMIN_SESSION_COOKIE };
