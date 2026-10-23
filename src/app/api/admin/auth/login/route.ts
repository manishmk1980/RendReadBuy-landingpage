import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_TTL_SECONDS,
  clearLoginFailures,
  clientIpFromHeaders,
  createSessionToken,
  isLoginThrottled,
  isSecureRequest,
  isTrustedMutationOrigin,
  readCookieFromRequest,
  recordLoginFailure,
  requireAdminAuthConfig,
  sessionCookieOptions,
  timingSafeEqualString,
  verifyDoubleSubmitCsrf,
  verifyPassword,
  ADMIN_CSRF_COOKIE,
  ADMIN_CSRF_HEADER,
} from "@/lib/adminAuth";

type LoginBody = {
  username?: unknown;
  password?: unknown;
  csrfToken?: unknown;
};

function jsonError(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: Request) {
  if (!isTrustedMutationOrigin(request)) {
    return jsonError(403, "Invalid origin.");
  }

  const config = requireAdminAuthConfig();
  if (!config) {
    // Fail closed with the same status as bad credentials (no config oracle).
    return jsonError(401, "Invalid credentials.");
  }

  let body: LoginBody;
  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return jsonError(400, "Invalid request body.");
  }

  const submitted =
    (typeof body.csrfToken === "string" ? body.csrfToken : undefined) ||
    request.headers.get(ADMIN_CSRF_HEADER);
  const cookieToken = readCookieFromRequest(request, ADMIN_CSRF_COOKIE);
  if (!verifyDoubleSubmitCsrf(submitted, cookieToken, config.sessionSecret)) {
    return jsonError(403, "Invalid CSRF token.");
  }

  const ip = clientIpFromHeaders(request.headers);
  if (isLoginThrottled(ip)) {
    return jsonError(429, "Too many failed login attempts. Try again later.");
  }

  const username = typeof body.username === "string" ? body.username : "";
  const password = typeof body.password === "string" ? body.password : "";

  const userOk = timingSafeEqualString(username, config.username);
  const passOk = verifyPassword(password, config.passwordHash);

  if (!userOk || !passOk) {
    recordLoginFailure(ip);
    return jsonError(401, "Invalid credentials.");
  }

  clearLoginFailures(ip);

  const { token, payload } = createSessionToken(config.username, config.sessionSecret);
  const secure = isSecureRequest(request);
  const cookie = sessionCookieOptions(ADMIN_SESSION_TTL_SECONDS, secure);

  const response = NextResponse.json(
    {
      ok: true,
      username: payload.sub,
      expiresAt: payload.exp,
    },
    { status: 200 },
  );
  response.cookies.set(cookie.name, token, {
    httpOnly: cookie.httpOnly,
    sameSite: cookie.sameSite,
    path: cookie.path,
    secure: cookie.secure,
    maxAge: cookie.maxAge,
  });
  return response;
}
