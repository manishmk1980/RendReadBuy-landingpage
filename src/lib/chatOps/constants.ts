/**
 * Silver campaign ↔ Primewayz Chat Platform binding constants.
 *
 * Tenant identity is never taken from the browser. The central ops credential
 * is bound to this tenant in the Host-controlled INTEGRATION_REGISTRY.
 */

export const SILVER_TENANT_ID = "rrb-silver-campaign" as const;
export const SILVER_SITE_KEY = "rentreadbuy-silver" as const;
export const SILVER_ORIGIN = "https://join.rentreadbuy.com" as const;

/** Proposed central registry integration id (companion patch). */
export const SILVER_INTEGRATION_ID = "rrb-silver-campaign-next" as const;

/**
 * Compatible ops path (WordPress-named; provider-neutral handler).
 * Companion patch may also expose `/api/integrations/chat/ops`.
 */
export const CENTRAL_CHAT_OPS_PATH = "/api/integrations/wordpress/chat" as const;

/** Provider-neutral Chat Connect lifecycle paths (Host provisioning only). */
export const CENTRAL_CHAT_CONNECT_ACTIVATE_PATH =
  "/api/integrations/chat-connect/activate" as const;
export const CENTRAL_CHAT_CONNECT_HEARTBEAT_PATH =
  "/api/integrations/chat-connect/heartbeat" as const;

export const CHAT_OPS_API_VERSION = "1" as const;

/**
 * Operator-facing actions this campaign may call.
 * Archive, delete, and presence mutation are intentionally excluded.
 */
export const SILVER_CHAT_OPS_ACTIONS = [
  "dashboard",
  "conversation",
  "diagnostics",
  "reply",
  "resolve",
  "reopen",
] as const;

export type SilverChatOpsAction = (typeof SILVER_CHAT_OPS_ACTIONS)[number];

export const FORBIDDEN_OPERATOR_ACTIONS = [
  "archive",
  "restore",
  "delete",
] as const;

/** Body fields that must never be accepted from the browser as authority. */
export const TENANT_AUTHORITY_FIELDS = [
  "tenantId",
  "tenant",
  "tenantKey",
  "market",
  "sourceSite",
  "sourceOrigin",
  "sourceChannel",
] as const;

export const CHAT_OPS_ENV_NAMES = {
  apiBaseUrl: "CHAT_INTEGRATION_API_BASE_URL",
  opsToken: "RRB_SILVER_CHAT_INTEGRATION_TOKEN",
  /** Host lifecycle only — not used by ordinary operator routes. */
  connectCredential: "RRB_SILVER_CHAT_CONNECT_CREDENTIAL",
} as const;

export const OPS_TOKEN_MIN_LENGTH = 32;
export const OPS_TOKEN_MAX_LENGTH = 512;

export type ConversationOpsStatus =
  | "not_configured"
  | "ready"
  | "unavailable"
  | "unauthorized";
