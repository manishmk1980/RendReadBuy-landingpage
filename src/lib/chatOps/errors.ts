export type ChatOpsErrorCode =
  | "not_configured"
  | "unauthorized"
  | "forbidden"
  | "invalid_request"
  | "tenant_mismatch"
  | "tenant_override_rejected"
  | "conversation_not_found"
  | "conversation_closed"
  | "invalid_transition"
  | "idempotency_key_conflict"
  | "rate_limited"
  | "tenant_unavailable"
  | "unavailable"
  | "action_not_permitted"
  | "internal_error";

export class ChatOpsError extends Error {
  readonly status: number;
  readonly code: ChatOpsErrorCode;
  readonly retryAfterSeconds?: number;

  constructor(
    status: number,
    code: ChatOpsErrorCode,
    message: string,
    retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "ChatOpsError";
    this.status = status;
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/** Map central WordPress-ops error codes onto local codes without leaking secrets. */
export function mapCentralErrorCode(code: string | undefined): ChatOpsErrorCode {
  switch (code) {
    case "integration_unauthorized":
      return "unauthorized";
    case "integration_forbidden":
      return "forbidden";
    case "tenant_override_rejected":
      return "tenant_override_rejected";
    case "conversation_not_found":
      return "conversation_not_found";
    case "conversation_closed":
      return "conversation_closed";
    case "invalid_transition":
      return "invalid_transition";
    case "idempotency_key_conflict":
      return "idempotency_key_conflict";
    case "rate_limited":
      return "rate_limited";
    case "tenant_unavailable":
      return "tenant_unavailable";
    case "chat_service_unavailable":
    case "database_unavailable":
      return "unavailable";
    case "invalid_request":
    case "method_not_allowed":
      return "invalid_request";
    default:
      return "internal_error";
  }
}
