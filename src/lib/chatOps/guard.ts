import {
  getVerifiedAdminSessionFromRequest,
  guardAdminMutation,
  guardAdminMutationWithToken,
  isAdminAuthConfigured,
  type VerifiedAdminSession,
} from "@/lib/adminAuth";
import { requireChatOpsConfig, type ChatOpsConfig } from "./config";
import { ChatOpsError } from "./errors";

export type AdminChatContext = {
  session: VerifiedAdminSession;
  config: ChatOpsConfig;
};

/**
 * Authenticated operator + configured ops credentials.
 * Does not probe central readiness — callers that need ready must probe separately
 * or rely on callCentralChatOps tenant validation.
 */
export async function requireAdminChatContext(
  request: Request,
): Promise<AdminChatContext> {
  if (!isAdminAuthConfigured()) {
    throw new ChatOpsError(503, "not_configured", "Admin auth is not configured.");
  }

  const session = await getVerifiedAdminSessionFromRequest(request);
  if (!session) {
    throw new ChatOpsError(401, "unauthorized", "Authentication required.");
  }

  const config = requireChatOpsConfig();
  if (!config) {
    throw new ChatOpsError(
      503,
      "not_configured",
      "Silver chat integration is not configured.",
    );
  }

  return { session, config };
}

/** CSRF + Origin for state-changing admin chat routes. */
export async function requireAdminChatMutation(
  request: Request,
  submittedCsrf?: string | null,
): Promise<AdminChatContext> {
  const csrf =
    submittedCsrf !== undefined
      ? guardAdminMutationWithToken(request, submittedCsrf)
      : guardAdminMutation(request);
  if (!csrf.ok) {
    throw new ChatOpsError(csrf.status, "forbidden", csrf.error);
  }
  return requireAdminChatContext(request);
}

export function actorFromSession(session: VerifiedAdminSession): {
  externalUserId: string;
  displayName: string;
} {
  // externalUserId must match central ACTOR_EXTERNAL_ID_PATTERN.
  const safe = session.sub.replace(/[^A-Za-z0-9._:-]/g, "-").slice(0, 64);
  const externalUserId = safe || "silver-operator";
  return {
    externalUserId,
    displayName: session.sub.slice(0, 80),
  };
}
