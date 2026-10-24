import {
  callCentralChatOps,
  ChatOpsError,
  chatOpsErrorResponse,
  chatOpsJson,
  requireAdminChatContext,
} from "@/lib/chatOps";

/** Conversation detail / transcript. */
export async function GET(request: Request) {
  try {
    const { config } = await requireAdminChatContext(request);
    const url = new URL(request.url);
    const sessionId = url.searchParams.get("sessionId")?.trim() ?? "";
    if (!sessionId || sessionId.length > 191) {
      throw new ChatOpsError(
        400,
        "invalid_request",
        "sessionId must be a non-empty string of at most 191 characters.",
      );
    }
    const envelope = await callCentralChatOps({
      config,
      body: { action: "conversation", sessionId },
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
