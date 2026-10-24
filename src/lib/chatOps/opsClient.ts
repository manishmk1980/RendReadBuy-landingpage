import { randomUUID } from "node:crypto";
import type { ChatOpsConfig } from "./config";
import {
  CENTRAL_CHAT_OPS_PATH,
  FORBIDDEN_OPERATOR_ACTIONS,
  SILVER_TENANT_ID,
  TENANT_AUTHORITY_FIELDS,
} from "./constants";
import { ChatOpsError, mapCentralErrorCode } from "./errors";
import type {
  CentralOpsErrorEnvelope,
  CentralOpsSuccessEnvelope,
  SilverOpsRequest,
} from "./types";

export type OpsClientFetch = typeof fetch;

export type CallOpsOptions = {
  config: ChatOpsConfig;
  body: SilverOpsRequest;
  requestId?: string;
  fetchImpl?: OpsClientFetch;
  /**
   * Expected tenant key from the credential binding.
   * Defaults to Silver; a mismatch fails closed.
   */
  expectedTenantId?: string;
};

function assertNoTenantAuthority(body: Record<string, unknown>): void {
  for (const field of TENANT_AUTHORITY_FIELDS) {
    if (field in body) {
      throw new ChatOpsError(
        400,
        "tenant_override_rejected",
        "Tenant identity is bound to the integration credential and cannot be supplied.",
      );
    }
  }
}

function assertActionPermitted(action: string): void {
  if ((FORBIDDEN_OPERATOR_ACTIONS as readonly string[]).includes(action)) {
    throw new ChatOpsError(
      403,
      "action_not_permitted",
      "This action is not permitted for the Silver campaign operator.",
    );
  }
  if (
    action === "presence" ||
    action === "setPresence" ||
    action === "availability"
  ) {
    throw new ChatOpsError(
      403,
      "action_not_permitted",
      "Presence mutation via the ops action path is not permitted. Use the session-gated presence adapter.",
    );
  }
}

function sanitizeBody(body: SilverOpsRequest): Record<string, unknown> {
  const record = { ...body } as Record<string, unknown>;
  assertNoTenantAuthority(record);
  assertActionPermitted(String(record.action ?? ""));
  return record;
}

function assertTenantMatch(
  tenant: { key?: string } | undefined,
  expectedTenantId: string,
): void {
  const key = typeof tenant?.key === "string" ? tenant.key : "";
  if (key !== expectedTenantId) {
    throw new ChatOpsError(
      403,
      "tenant_mismatch",
      "Central response tenant does not match the Silver campaign binding.",
    );
  }
}

/**
 * Server-to-server call to the central operational chat contract.
 * Never logs or returns the Bearer token.
 */
export async function callCentralChatOps<T = unknown>(
  options: CallOpsOptions,
): Promise<CentralOpsSuccessEnvelope<T>> {
  const {
    config,
    body,
    requestId = randomUUID(),
    fetchImpl = fetch,
    expectedTenantId = SILVER_TENANT_ID,
  } = options;

  const payload = sanitizeBody(body);
  const url = `${config.apiBaseUrl}${CENTRAL_CHAT_OPS_PATH}`;

  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        authorization: `Bearer ${config.opsToken}`,
        "x-request-id": requestId,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
  } catch {
    throw new ChatOpsError(
      503,
      "unavailable",
      "The central chat service could not be reached.",
    );
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new ChatOpsError(
      503,
      "unavailable",
      "The central chat service returned an unreadable response.",
    );
  }

  if (!response.ok) {
    const err = json as CentralOpsErrorEnvelope;
    const code = mapCentralErrorCode(err.error?.code);
    const status =
      response.status === 401
        ? 401
        : response.status === 403
          ? 403
          : response.status === 404
            ? 404
            : response.status === 409
              ? 409
              : response.status === 429
                ? 429
                : response.status >= 500
                  ? 503
                  : 400;
    const retryHeader = response.headers.get("retry-after");
    const retryAfterSeconds = retryHeader
      ? Number.parseInt(retryHeader, 10)
      : undefined;
    throw new ChatOpsError(
      status === 401 ? 401 : status === 403 ? 403 : status,
      code === "unauthorized" || status === 401
        ? "unauthorized"
        : code === "forbidden" || status === 403
          ? "forbidden"
          : code,
      typeof err.error?.message === "string"
        ? err.error.message
        : "Central chat operation failed.",
      Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : undefined,
    );
  }

  const success = json as CentralOpsSuccessEnvelope<T>;
  if (!success || success.ok !== true || !success.tenant) {
    throw new ChatOpsError(
      503,
      "unavailable",
      "The central chat service returned an unexpected envelope.",
    );
  }

  assertTenantMatch(success.tenant, expectedTenantId);

  // Least-privilege: strip archive/delete capability flags from operator payloads.
  if (
    success.data &&
    typeof success.data === "object" &&
    !Array.isArray(success.data)
  ) {
    const data = success.data as Record<string, unknown>;
    if (data.operator && typeof data.operator === "object") {
      const operator = { ...(data.operator as Record<string, unknown>) };
      operator.canArchive = false;
      operator.canDelete = false;
      data.operator = operator;
    }
    if (
      data.authentication &&
      typeof data.authentication === "object" &&
      Array.isArray((data.authentication as { scopes?: unknown }).scopes)
    ) {
      const auth = {
        ...(data.authentication as Record<string, unknown>),
      };
      const scopes = (auth.scopes as unknown[]).filter(
        (scope) =>
          scope !== "chat:archive" &&
          scope !== "chat:delete" &&
          typeof scope === "string",
      );
      auth.scopes = scopes;
      data.authentication = auth;
    }
  }

  return success;
}

export function newClientActionId(): string {
  // 36-char UUID satisfies central CLIENT_ACTION_ID_PATTERN (36–64).
  return randomUUID();
}
