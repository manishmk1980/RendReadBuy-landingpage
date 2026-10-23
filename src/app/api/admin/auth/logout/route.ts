import { NextResponse } from "next/server";
import {
  clearedSessionCookieOptions,
  getVerifiedAdminSessionFromRequest,
  guardAdminMutationWithToken,
  isSecureRequest,
  revokeSession,
} from "@/lib/adminAuth";
import { clearedCsrfCookieOptions } from "@/lib/adminAuth/csrf";

type LogoutBody = {
  csrfToken?: unknown;
};

function jsonError(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: Request) {
  let body: LogoutBody = {};
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      body = (await request.json()) as LogoutBody;
    } catch {
      return jsonError(400, "Invalid request body.");
    }
  }

  const csrfToken = typeof body.csrfToken === "string" ? body.csrfToken : undefined;
  const guard = guardAdminMutationWithToken(request, csrfToken);
  if (!guard.ok) {
    return jsonError(guard.status, guard.error);
  }

  const session = getVerifiedAdminSessionFromRequest(request);
  if (!session) {
    return jsonError(401, "Authentication required.");
  }

  revokeSession(session.sid, session.exp);

  const secure = isSecureRequest(request);
  const sessionCookie = clearedSessionCookieOptions(secure);
  const csrfCookie = clearedCsrfCookieOptions(secure);
  const response = NextResponse.json({ ok: true }, { status: 200 });
  response.cookies.set(sessionCookie.name, "", {
    httpOnly: sessionCookie.httpOnly,
    sameSite: sessionCookie.sameSite,
    path: sessionCookie.path,
    secure: sessionCookie.secure,
    maxAge: 0,
  });
  response.cookies.set(csrfCookie.name, "", {
    httpOnly: csrfCookie.httpOnly,
    sameSite: csrfCookie.sameSite,
    path: csrfCookie.path,
    secure: csrfCookie.secure,
    maxAge: 0,
  });
  return response;
}
