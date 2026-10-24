import {
  actorFromSession,
  callCentralChatOps,
  ChatOpsError,
  chatOpsErrorResponse,
  chatOpsJson,
  newClientActionId,
  requireAdminChatMutation,
  TENANT_AUTHORITY_FIELDS,
} from "@/lib/chatOps";

type ReopenBody = {
  sessionId?: unknown;
  clientActionId?: unknown;
  csrfToken?: unknown;
};

export async function POST(request: Request) {
  try {
    let body: ReopenBody;
    try {
      body = (await request.json()) as ReopenBody;
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

    const csrf =
      typeof body.csrfToken === "string" ? body.csrfToken : undefined;
    const { session, config } = requireAdminChatMutation(request, csrf);

    const sessionId =
      typeof body.sessionId === "string" ? body.sessionId.trim() : "";
    if (!sessionId || sessionId.length > 191) {
      throw new ChatOpsError(400, "invalid_request", "Invalid sessionId.");
    }

    const clientActionId =
      typeof body.clientActionId === "string" && body.clientActionId.length >= 36
        ? body.clientActionId
        : newClientActionId();

    const envelope = await callCentralChatOps({
      config,
      body: {
        action: "reopen",
        sessionId,
        clientActionId,
        actor: actorFromSession(session),
      },
    });

    return chatOpsJson(
      {
        ok: true,
        requestId: envelope.requestId,
        tenant: envelope.tenant,
        generatedAt: envelope.generatedAt,
        data: envelope.data,
      },
      { requestId: envelope.requestId },
    );
  } catch (err) {
    return chatOpsErrorResponse(err);
  }
}
