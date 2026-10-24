import { NextResponse } from "next/server";
import {
  CAMPAIGN_OPERATOR_ROLE,
  getVerifiedAdminSessionFromRequest,
  isAdminAuthConfigured,
} from "@/lib/adminAuth";
import {
  getChatOpsConfigStatus,
  probeConversationOpsReadiness,
} from "@/lib/chatOps";

/**
 * Session probe for the admin shell. Requires a valid signed cookie.
 * Does not accept tenant ids or grant Host/Owner privileges.
 *
 * conversationOps is ready only after a tenant-validated central diagnostics
 * response. Env presence alone never yields ready.
 */
export async function GET(request: Request) {
  if (!isAdminAuthConfigured()) {
    return NextResponse.json(
      { error: "Admin auth is not configured.", configured: false },
      { status: 503 },
    );
  }

  const session = await getVerifiedAdminSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const configStatus = getChatOpsConfigStatus();
  let conversationOps: string = "not_configured";
  let conversationOpsDetail: string | undefined;

  if (!configStatus.configured) {
    conversationOps = "not_configured";
    conversationOpsDetail =
      "Silver chat ops API base URL or integration token is not configured.";
  } else {
    const readiness = await probeConversationOpsReadiness();
    conversationOps = readiness.status;
    conversationOpsDetail = readiness.detail;
  }

  const response = NextResponse.json({
    username: session.sub,
    role: CAMPAIGN_OPERATOR_ROLE,
    expiresAt: session.exp,
    conversationOps,
    conversationOpsDetail,
    /**
     * Installation (Chat Connect) credential is Host-managed and independent
     * of the ops Bearer token. Operator routes never use it.
     */
    connectCredentialConfigured: configStatus.connectCredentialConfigured,
    /**
     * Conservative until Host confirms single-process deploy or configures
     * CHAT_ADMIN_SHARED_STORE_* for multi-instance revocation/throttling.
     */
    productionReady: false,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
