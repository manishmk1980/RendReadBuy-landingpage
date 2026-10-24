import {
  callCentralChatOps,
  chatOpsErrorResponse,
  chatOpsJson,
  requireAdminChatContext,
} from "@/lib/chatOps";

/** Read-only central diagnostics. GET only — no CSRF required. */
export async function GET(request: Request) {
  try {
    const { config } = requireAdminChatContext(request);
    const envelope = await callCentralChatOps({
      config,
      body: { action: "diagnostics" },
    });
    return chatOpsJson(
      {
        ok: true,
        requestId: envelope.requestId,
        tenant: envelope.tenant,
        generatedAt: envelope.generatedAt,
        data: envelope.data,
        productionReady: false,
      },
      { requestId: envelope.requestId },
    );
  } catch (err) {
    return chatOpsErrorResponse(err);
  }
}
