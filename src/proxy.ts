import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Must match ADMIN_SESSION_COOKIE in src/lib/adminAuth/constants.ts */
const SESSION_COOKIE = "rrb_silver_chat_admin_session";

/**
 * Early redirect for unauthenticated admin page visits.
 * Cookie presence is only a hint — every protected page and API still
 * verifies the HMAC, expiry, revocation, and campaign-operator role.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) {
    return NextResponse.next();
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
    if (!hasSession) {
      const login = new URL("/admin/login", request.url);
      login.searchParams.set("error", "auth_required");
      return NextResponse.redirect(login);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
