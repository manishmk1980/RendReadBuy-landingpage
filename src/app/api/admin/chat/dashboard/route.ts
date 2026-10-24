import {
  callCentralChatOps,
  chatOpsErrorResponse,
  chatOpsJson,
  requireAdminChatContext,
} from "@/lib/chatOps";

function parseInbox(value: string | null): "active" | "archived" {
  if (value === "archived") return "archived";
  return "active";
}

/** Conversation list / dashboard. Tenant comes only from the server credential. */
export async function GET(request: Request) {
  try {
    const { config } = requireAdminChatContext(request);
    const url = new URL(request.url);
    const inbox = parseInbox(url.searchParams.get("inbox"));
    const envelope = await callCentralChatOps({
      config,
      body: { action: "dashboard", inbox },
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
