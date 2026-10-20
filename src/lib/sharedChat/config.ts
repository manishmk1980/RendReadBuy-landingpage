import {
  sharedChatEnv,
  sharedChatIdentity,
  sharedChatIntents,
  sharedChatLauncher,
  sharedChatPageContext,
  sharedChatStorageKeys,
} from "@/config/sharedChat";

/** Element id the shared widget reads its JSON configuration from. */
export const SHARED_CHAT_CONFIG_ELEMENT_ID = "pwi-chat-config";

export interface SharedChatEnv {
  enabled?: string;
  apiBaseUrl?: string;
  widgetUrl?: string;
  widgetIntegrity?: string;
}

export interface SharedChatSettings {
  apiBaseUrl: string;
  widgetUrl: string;
  widgetIntegrity: string | null;
}

export type SharedChatResolution =
  | { status: "disabled" }
  | { status: "invalid"; problems: string[] }
  | { status: "ready"; settings: SharedChatSettings };

/** The `pwi-chat-config` JSON accepted by the shared widget (1.3.0). */
export interface SharedChatEmbedConfig {
  apiBaseUrl: string;
  siteKey: string;
  siteName: string;
  pageUrl: string;
  pageType: string;
  isFrontPage: boolean;
  storageKeys: Record<keyof typeof sharedChatStorageKeys, string>;
  pageContext: { greeting: string; supportingText: string };
  intents: { key: string; label: string }[];
  launcher: { collisionSelectors: string[] };
}

const ENABLED_VALUES = new Set(["on", "true"]);
const SRI_PATTERN = /^sha(256|384|512)-[A-Za-z0-9+/]+={0,2}$/;

function isLocalDevHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

/** https only; plain http is accepted for localhost outside production builds. */
function parseSecureUrl(raw: string, production: boolean): URL | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.username || url.password || url.hash) return null;
  if (url.protocol === "https:") return url;
  if (url.protocol === "http:" && !production && isLocalDevHost(url.hostname)) return url;
  return null;
}

/** Same normalisation as the widget, so both sides agree on the base URL. */
function normalizeApiBaseUrl(raw: string, production: boolean): string | null {
  const url = parseSecureUrl(raw, production);
  if (!url || url.search) return null;
  return `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
}

/** An absolute secure URL, or a same-origin path for a self-hosted copy. */
function normalizeWidgetUrl(raw: string, production: boolean): string | null {
  if (raw.startsWith("/") && !raw.startsWith("//") && !raw.includes("\\")) {
    return raw.includes("#") ? null : raw;
  }
  return parseSecureUrl(raw, production)?.href ?? null;
}

export function resolveSharedChatSettings(
  env: SharedChatEnv,
  production = process.env.NODE_ENV === "production",
): SharedChatResolution {
  if (!ENABLED_VALUES.has(env.enabled?.trim().toLowerCase() ?? "")) {
    return { status: "disabled" };
  }

  const problems: string[] = [];
  const apiBaseUrl = normalizeApiBaseUrl(env.apiBaseUrl?.trim() ?? "", production);
  if (!apiBaseUrl) problems.push("NEXT_PUBLIC_SHARED_CHAT_API_BASE_URL must be an https URL with no credentials, query or fragment.");

  const widgetUrl = normalizeWidgetUrl(env.widgetUrl?.trim() ?? "", production);
  if (!widgetUrl) problems.push("NEXT_PUBLIC_SHARED_CHAT_WIDGET_URL must be an https URL or a same-origin path.");

  const integrity = env.widgetIntegrity?.trim() || null;
  if (integrity && !SRI_PATTERN.test(integrity)) {
    problems.push("NEXT_PUBLIC_SHARED_CHAT_WIDGET_INTEGRITY must be a sha256/384/512 SRI hash.");
  }

  if (!apiBaseUrl || !widgetUrl || problems.length > 0) return { status: "invalid", problems };
  return { status: "ready", settings: { apiBaseUrl, widgetUrl, widgetIntegrity: integrity } };
}

export const sharedChat = resolveSharedChatSettings(sharedChatEnv);

/**
 * The published widget opens itself when `pw_chat=open` is on the page URL at
 * the moment its script runs. The value must be exactly `open`.
 */
export function sharedChatOpenRequested(search: string): boolean {
  const raw = search.startsWith("?") ? search.slice(1) : search;
  if (!raw) return false;
  try {
    return new URLSearchParams(raw).get("pw_chat") === "open";
  } catch {
    return false;
  }
}

/** Page URL without query or fragment: the widget only matches on the path. */
export function buildSharedChatEmbedConfig(
  settings: SharedChatSettings,
  location: Pick<Location, "origin" | "pathname">,
): SharedChatEmbedConfig {
  const pathname = location.pathname || "/";
  return {
    apiBaseUrl: settings.apiBaseUrl,
    siteKey: sharedChatIdentity.siteKey,
    siteName: sharedChatIdentity.siteName,
    pageUrl: `${location.origin}${pathname}`,
    pageType: sharedChatIdentity.pageType,
    isFrontPage: pathname === "/",
    storageKeys: { ...sharedChatStorageKeys },
    pageContext: { ...sharedChatPageContext },
    intents: sharedChatIntents.map(({ key, label }) => ({ key, label })),
    launcher: { collisionSelectors: [...sharedChatLauncher.collisionSelectors] },
  };
}
