import {
  ChatOpsError,
  chatOpsErrorResponse,
  chatOpsJson,
  requireAdminChatMutation,
  TENANT_AUTHORITY_FIELDS,
} from "@/lib/chatOps";
import { buildSilverOperatorRef, parseConsoleInstanceId } from "@/lib/chatOps/operatorRef";
import { callCentralPresenceHeartbeat } from "@/lib/chatOps/presenceClient";

type HeartbeatBody = {
  consoleInstanceId?: unknown;
  csrfToken?: unknown;
  clientActionId?: unknown;
  correlationId?: unknown;
  operatorRef?: unknown;
  tenantId?: unknown;
  operatorUserId?: unknown;
};

/**
 * Session-gated presence heartbeat adapter.
 * operatorRef is derived server-side; the ops Bearer never leaves this host.
 */
export async function POST(request: Request) {
  try {
    let body: HeartbeatBody;
    try {
      body = (await request.json()) as HeartbeatBody;
    } catch {
      throw new ChatOpsError(400, "invalid_request", "Invalid request body.");
    }

    for (const field of TENANT_AUTHORITY_FIELDS) {
      if (field in body) {
        throw new ChatOpsError(
          400,
          "tenant_override_rejected",
          "Tenant identity cannot be supplied by the client.",
        );
      }
    }
    if ("operatorRef" in body || "operatorUserId" in body || "userId" in body) {
      throw new ChatOpsError(
        400,
        "tenant_override_rejected",
        "Operator identity cannot be supplied by the client.",
      );
    }

    const csrf = typeof body.csrfToken === "string" ? body.csrfToken : undefined;
    const { session, config } = await requireAdminChatMutation(request, csrf);

    const consoleInstanceId = parseConsoleInstanceId(body.consoleInstanceId);
    if (!consoleInstanceId) {
      throw new ChatOpsError(
        400,
        "invalid_request",
        "consoleInstanceId must be a 32-character hex string.",
      );
    }

    let operatorRef: string;
    try {
      operatorRef = buildSilverOperatorRef(session, consoleInstanceId);
    } catch {
      throw new ChatOpsError(400, "invalid_request", "Invalid console instance.");
    }

    const clientActionId =
      typeof body.clientActionId === "string" && body.clientActionId.length >= 1
        ? body.clientActionId.slice(0, 64)
        : undefined;
    const correlationId =
      typeof body.correlationId === "string" && body.correlationId.length >= 1
        ? body.correlationId.slice(0, 64)
        : undefined;

    const result = await callCentralPresenceHeartbeat({
      config,
      operatorRef,
      clientActionId,
      correlationId,
    });

    return chatOpsJson({
      ok: true,
      contributing: true,
      operatorRef: result.operatorRef,
      expiresInMs: result.expiresInMs,
      presencePolicy: result.presencePolicy,
      presencePolicyDegraded: result.presencePolicyDegraded ?? false,
      duplicated: result.duplicated,
      tenant: { key: result.tenantId },
    });
  } catch (err) {
    return chatOpsErrorResponse(err);
  }
}
