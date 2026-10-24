import {
  CHAT_OPS_ENV_NAMES,
  OPS_TOKEN_MAX_LENGTH,
  OPS_TOKEN_MIN_LENGTH,
} from "./constants";

export type ChatOpsConfig = {
  apiBaseUrl: string;
  opsToken: string;
};

export type ChatOpsConfigStatus = {
  configured: boolean;
  apiBaseUrlConfigured: boolean;
  opsTokenConfigured: boolean;
  /**
   * Installation credential presence is informational only.
   * Operator conversation routes do not use it; Host/Owner lifecycle does.
   */
  connectCredentialConfigured: boolean;
};

/** Loose env map so unit tests can pass partial fixtures. */
export type EnvMap = Record<string, string | undefined>;

function trimEnv(name: string, env: EnvMap): string {
  const raw = env[name];
  return typeof raw === "string" ? raw.trim() : "";
}

/**
 * https only, no credentials / query / fragment.
 * Same shape rules as the public chat API base URL.
 */
export function isValidIntegrationApiBaseUrl(value: string): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    if (url.username || url.password) return false;
    if (url.search || url.hash) return false;
    if (!url.hostname) return false;
    return true;
  } catch {
    return false;
  }
}

export function isValidOpsToken(value: string): boolean {
  return (
    value.length >= OPS_TOKEN_MIN_LENGTH &&
    value.length <= OPS_TOKEN_MAX_LENGTH &&
    /^[A-Za-z0-9._~+/=-]+$/.test(value)
  );
}

/**
 * Chat Connect installation bearer shape: cck_<hex>.ccs_<base64url-ish>.
 * Validated for Host documentation / status only — not sent from operator routes.
 */
export function isValidConnectCredential(value: string): boolean {
  if (value.length < 40 || value.length > 512) return false;
  return /^cck_[a-f0-9]{32}\.ccs_[A-Za-z0-9_-]+$/.test(value);
}

export function getChatOpsConfigStatus(
  env: EnvMap = process.env,
): ChatOpsConfigStatus {
  const apiBaseUrl = trimEnv(CHAT_OPS_ENV_NAMES.apiBaseUrl, env);
  const opsToken = trimEnv(CHAT_OPS_ENV_NAMES.opsToken, env);
  const connectCredential = trimEnv(CHAT_OPS_ENV_NAMES.connectCredential, env);

  return {
    apiBaseUrlConfigured: isValidIntegrationApiBaseUrl(apiBaseUrl),
    opsTokenConfigured: isValidOpsToken(opsToken),
    connectCredentialConfigured: isValidConnectCredential(connectCredential),
    configured:
      isValidIntegrationApiBaseUrl(apiBaseUrl) && isValidOpsToken(opsToken),
  };
}

/**
 * Fail-closed reader for operator conversation ops.
 * Does not require the Chat Connect installation credential — that credential
 * is independently required for Host lifecycle (activate/heartbeat) only.
 */
export function readChatOpsConfig(
  env: EnvMap = process.env,
): ChatOpsConfig | null {
  const apiBaseUrl = trimEnv(CHAT_OPS_ENV_NAMES.apiBaseUrl, env);
  const opsToken = trimEnv(CHAT_OPS_ENV_NAMES.opsToken, env);
  if (!isValidIntegrationApiBaseUrl(apiBaseUrl) || !isValidOpsToken(opsToken)) {
    return null;
  }
  return { apiBaseUrl: apiBaseUrl.replace(/\/+$/, ""), opsToken };
}

export function requireChatOpsConfig(
  env: EnvMap = process.env,
): ChatOpsConfig | null {
  return readChatOpsConfig(env);
}
