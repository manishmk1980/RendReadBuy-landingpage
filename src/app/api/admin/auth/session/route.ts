import { NextResponse } from "next/server";
import {
  CAMPAIGN_OPERATOR_ROLE,
  getVerifiedAdminSessionFromRequest,
  isAdminAuthConfigured,
} from "@/lib/adminAuth";

/**
 * Session probe for the admin shell. Requires a valid signed cookie.
 * Does not accept tenant ids or grant Host/Owner privileges.
 */
export async function GET(request: Request) {
  if (!isAdminAuthConfigured()) {
    return NextResponse.json(
      { error: "Admin auth is not configured.", configured: false },
      { status: 503 },
    );
  }

  const session = getVerifiedAdminSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  return NextResponse.json({
    username: session.sub,
    role: CAMPAIGN_OPERATOR_ROLE,
    expiresAt: session.exp,
    /**
     * Conversation APIs stay unavailable until a Silver-specific central
     * integration credential and scopes are approved and bound.
     */
    conversationOps: "blocked_pending_silver_integration",
  });
}
