import {
  getVerifiedAdminSessionFromRequest,
  isAdminAuthConfigured,
} from "@/lib/adminAuth";
import {
  chatOpsErrorResponse,
  chatOpsJson,
  probeConversationOpsReadiness,
} from "@/lib/chatOps";

/**
 * Live readiness probe. Reports ready only after a tenant-validated
 * central diagnostics response. Never exposes integration secrets.
 */
export async function GET(request: Request) {
  try {
    if (!isAdminAuthConfigured()) {
      return chatOpsJson(
        {
          ok: false,
          conversationOps: "not_configured",
          ready: false,
          productionReady: false,
          error: {
            code: "not_configured",
            message: "Admin auth is not configured.",
          },
        },
        { status: 503 },
      );
    }

    const session = await getVerifiedAdminSessionFromRequest(request);
    if (!session) {
      return chatOpsJson(
        {
          ok: false,
          error: { code: "unauthorized", message: "Authentication required." },
        },
        { status: 401 },
      );
    }

    const readiness = await probeConversationOpsReadiness();
    return chatOpsJson({
      ok: true,
      conversationOps: readiness.status,
      ready: readiness.ready,
      /**
       * Conservative until Host confirms single-process deploy or configures
       * CHAT_ADMIN_SHARED_STORE_* for multi-instance revocation/throttling.
       */
      productionReady: false,
      config: readiness.config,
      detail: readiness.detail,
      requestId: readiness.requestId,
    });
  } catch (err) {
    return chatOpsErrorResponse(err);
  }
}
