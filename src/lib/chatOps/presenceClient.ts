import { randomUUID } from "node:crypto";
import type { ChatOpsConfig } from "./config";
import { SILVER_TENANT_ID } from "./constants";
import { ChatOpsError, mapCentralErrorCode } from "./errors";

export type PresenceClientFetch = typeof fetch;

export const CENTRAL_OPERATOR_PRESENCE_HEARTBEAT_PATH =
  "/api/v1/operator-presence/heartbeat" as const;
export const CENTRAL_OPERATOR_PRESENCE_OFFLINE_PATH =
  "/api/v1/operator-presence/offline" as const;

export type PresenceHeartbeatResult = {
  success: true;
  version: string;
  tenantId: string;
  operatorRef: string;
  expiresInMs: number;
  presencePolicy: string;
  presencePolicyDegraded?: boolean;
  duplicated: boolean;
};

export type PresenceOfflineResult = {
  success: true;
  version: string;
  tenantId: string;
  operatorRef: string;
  cleared: number;
  duplicated: boolean;
};

type PresenceCallOptions = {
  config: ChatOpsConfig;
  operatorRef: string;
  clientActionId?: string;
  correlationId?: string;
  notAfterMs?: number;
  fetchImpl?: PresenceClientFetch;
  expectedTenantId?: string;
};

function mapPresenceError(status: number, json: unknown): ChatOpsError {
  const err = json as {
    error?: string;
    code?: string;
    message?: string;
  };
  const codeRaw =
    typeof err.code === "string"
      ? err.code
      : typeof err.error === "string"
        ? err.error
        : undefined;
  const mapped = mapCentralErrorCode(codeRaw);
  const message =
    typeof err.error === "string"
      ? err.error
      : typeof err.message === "string"
        ? err.message
        : "Central presence operation failed.";

  if (status === 401 || mapped === "unauthorized" || codeRaw === "unauthorized") {
    return new ChatOpsError(401, "unauthorized", message);
  }
  if (
    status === 403 ||
    codeRaw === "forbidden_scope" ||
    mapped === "forbidden"
  ) {
    return new ChatOpsError(403, "forbidden", message);
  }
  if (status === 409 || codeRaw === "replay") {
    return new ChatOpsError(409, "idempotency_key_conflict", message);
  }
  if (status === 429) {
    return new ChatOpsError(429, "rate_limited", message);
  }
  if (status >= 500) {
    return new ChatOpsError(503, "unavailable", message);
  }
  if (codeRaw === "invalid_request" || mapped === "invalid_request") {
    return new ChatOpsError(400, "invalid_request", message);
  }
  return new ChatOpsError(400, "invalid_request", message);
}

async function postPresence<T extends { success: true; tenantId: string }>(
  path: string,
  options: PresenceCallOptions,
  body: Record<string, unknown>,
): Promise<T> {
  const {
    config,
    fetchImpl = fetch,
    expectedTenantId = SILVER_TENANT_ID,
  } = options;

  const url = `${config.apiBaseUrl}${path}`;
  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        authorization: `Bearer ${config.opsToken}`,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    throw new ChatOpsError(
      503,
      "unavailable",
      "The central presence service could not be reached.",
    );
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new ChatOpsError(
      503,
      "unavailable",
      "The central presence service returned an unreadable response.",
    );
  }

  if (!response.ok) {
    throw mapPresenceError(response.status, json);
  }

  const success = json as T;
  if (!success || success.success !== true) {
    throw new ChatOpsError(
      503,
      "unavailable",
      "The central presence service returned an unexpected envelope.",
    );
  }
  if (success.tenantId !== expectedTenantId) {
    throw new ChatOpsError(
      403,
      "tenant_mismatch",
      "Central presence tenant does not match the Silver campaign binding.",
    );
  }
  return success;
}

/** Server-to-server heartbeat. Bearer stays out of the browser. */
export async function callCentralPresenceHeartbeat(
  options: PresenceCallOptions,
): Promise<PresenceHeartbeatResult> {
  const clientActionId = options.clientActionId ?? randomUUID();
  return postPresence<PresenceHeartbeatResult>(
    CENTRAL_OPERATOR_PRESENCE_HEARTBEAT_PATH,
    options,
    {
      clientActionId,
      operatorRef: options.operatorRef,
      ...(options.correlationId ? { correlationId: options.correlationId } : {}),
    },
  );
}

/** Server-to-server explicit Offline. */
export async function callCentralPresenceOffline(
  options: PresenceCallOptions,
): Promise<PresenceOfflineResult> {
  const clientActionId = options.clientActionId ?? randomUUID();
  return postPresence<PresenceOfflineResult>(
    CENTRAL_OPERATOR_PRESENCE_OFFLINE_PATH,
    options,
    {
      clientActionId,
      operatorRef: options.operatorRef,
      ...(options.correlationId ? { correlationId: options.correlationId } : {}),
      ...(typeof options.notAfterMs === "number"
        ? { notAfterMs: options.notAfterMs }
        : {}),
    },
  );
}
