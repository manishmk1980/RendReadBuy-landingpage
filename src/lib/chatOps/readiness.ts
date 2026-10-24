import {
  getChatOpsConfigStatus,
  readChatOpsConfig,
  type EnvMap,
} from "./config";
import type { ConversationOpsStatus } from "./constants";
import { ChatOpsError } from "./errors";
import { callCentralChatOps, type OpsClientFetch } from "./opsClient";

export type ConversationOpsReadiness = {
  status: ConversationOpsStatus;
  /**
   * True only after a successful, tenant-validated central diagnostics call.
   * Env presence alone never yields ready.
   */
  ready: boolean;
  config: {
    opsConfigured: boolean;
    connectCredentialConfigured: boolean;
  };
  detail?: string;
  requestId?: string;
};

export type ProbeReadinessOptions = {
  env?: EnvMap;
  fetchImpl?: OpsClientFetch;
};

/**
 * Probe operational readiness via central diagnostics.
 *
 * - not_configured: ops API base or Bearer token missing/invalid
 * - unauthorized: central rejected the credential (401)
 * - unavailable: network/5xx/tenant unavailable / malformed envelope
 * - ready: authenticated response whose tenant.key is rrb-silver-campaign
 *
 * Installation (Chat Connect) credential is independent and is never used here.
 */
export async function probeConversationOpsReadiness(
  options: ProbeReadinessOptions = {},
): Promise<ConversationOpsReadiness> {
  const env = options.env ?? process.env;
  const configStatus = getChatOpsConfigStatus(env);
  const base = {
    config: {
      opsConfigured: configStatus.configured,
      connectCredentialConfigured: configStatus.connectCredentialConfigured,
    },
  };

  if (!configStatus.configured) {
    return {
      ...base,
      status: "not_configured",
      ready: false,
      detail: "Silver chat integration API base URL or ops token is not configured.",
    };
  }

  const config = readChatOpsConfig(env);
  if (!config) {
    return {
      ...base,
      status: "not_configured",
      ready: false,
      detail: "Silver chat integration API base URL or ops token is not configured.",
    };
  }

  try {
    const envelope = await callCentralChatOps({
      config,
      body: { action: "diagnostics" },
      fetchImpl: options.fetchImpl,
    });

    const diagnostics = envelope.data as {
      authentication?: { valid?: boolean; scopes?: string[] };
      tenantBinding?: { tenantId?: string; valid?: boolean };
    };

    const scopes = diagnostics?.authentication?.scopes ?? [];
    const required = [
      "chat:dashboard",
      "chat:read",
      "chat:diagnostics",
      "chat:reply",
      "chat:resolve",
      "chat:reopen",
    ];
    const missing = required.filter((scope) => !scopes.includes(scope));
    if (missing.length > 0) {
      return {
        ...base,
        status: "unauthorized",
        ready: false,
        detail: "Integration credential is missing required Silver scopes.",
        requestId: envelope.requestId,
      };
    }

    // Extra scopes (archive/delete) are ignored locally; they never unlock operator actions.

    return {
      ...base,
      status: "ready",
      ready: true,
      requestId: envelope.requestId,
    };
  } catch (err) {
    if (err instanceof ChatOpsError) {
      if (err.code === "unauthorized" || err.status === 401) {
        return {
          ...base,
          status: "unauthorized",
          ready: false,
          detail: "Central integration credential was rejected.",
        };
      }
      if (err.code === "tenant_mismatch" || err.code === "forbidden") {
        return {
          ...base,
          status: "unauthorized",
          ready: false,
          detail: err.message,
        };
      }
      return {
        ...base,
        status: "unavailable",
        ready: false,
        detail: err.message,
      };
    }
    return {
      ...base,
      status: "unavailable",
      ready: false,
      detail: "Conversation operations are temporarily unavailable.",
    };
  }
}
