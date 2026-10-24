import { NextResponse } from "next/server";
import {
  ADMIN_CSRF_TTL_SECONDS,
  createCsrfToken,
  isAdminAuthConfigured,
  isSecureRequest,
  requireAdminAuthConfig,
} from "@/lib/adminAuth";
import { csrfCookieOptions } from "@/lib/adminAuth/csrf";

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

/**
 * Issues a double-submit CSRF cookie + returns the matching token.
 * Must run in a Route Handler (cookies().set / Set-Cookie is not allowed
 * during Server Component render).
 */
export async function GET(request: Request) {
  if (!isAdminAuthConfigured()) {
    return noStore(
      NextResponse.json(
        { error: "Admin auth is not configured.", configured: false },
        { status: 503 },
      ),
    );
  }

  const config = requireAdminAuthConfig();
  if (!config) {
    return noStore(
      NextResponse.json(
        { error: "Admin auth is not configured.", configured: false },
        { status: 503 },
      ),
    );
  }

  const token = createCsrfToken(config.sessionSecret);
  const secure = isSecureRequest(request);
  const opts = csrfCookieOptions(ADMIN_CSRF_TTL_SECONDS, secure);

  const response = NextResponse.json({
    csrfToken: token,
    configured: true,
  });
  response.cookies.set(opts.name, token, {
    httpOnly: opts.httpOnly,
    sameSite: opts.sameSite,
    path: opts.path,
    secure: opts.secure,
    maxAge: opts.maxAge,
  });
  return noStore(response);
}
