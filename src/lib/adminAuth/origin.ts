/**
 * Origin / Referer checks for state-changing admin requests.
 * Rejects cross-site POSTs even when SameSite=Lax is bypassed.
 *
 * Behind HTTPS termination (Apache → Next on 127.0.0.1), `request.url` is the
 * internal HTTP origin. Compare client Origin/Referer against the explicit
 * server-only `CHAT_ADMIN_PUBLIC_ORIGIN` instead. Never trust client-supplied
 * `X-Forwarded-Host` / `X-Forwarded-Proto` for this check.
 */

type EnvLike = Record<string, string | undefined>;

export const CHAT_ADMIN_PUBLIC_ORIGIN_ENV = "CHAT_ADMIN_PUBLIC_ORIGIN" as const;

function parseOrigin(value: string | null): URL | null {
  if (!value) return null;
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function sameSite(a: URL, b: URL): boolean {
  return a.protocol === b.protocol && a.host === b.host;
}

/**
 * Parse an explicitly configured public origin.
 * Accepts only absolute http(s) URLs that resolve to an origin (no credentials,
 * query, hash, or non-root path). Returns null when invalid (fail closed).
 */
export function parseConfiguredPublicOrigin(value: string): URL | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username || url.password) return null;
    if (url.search || url.hash) return null;
    if (url.pathname !== "/" && url.pathname !== "") return null;
    return new URL(url.origin);
  } catch {
    return null;
  }
}

/**
 * Resolve the origin that Origin/Referer must match.
 *
 * - When `CHAT_ADMIN_PUBLIC_ORIGIN` is set: use it (invalid → null / fail closed).
 * - When unset in production: null (required; do not fall back to proxy headers).
 * - When unset outside production: use the request URL origin (local/dev/test).
 */
export function resolveTrustedMutationOrigin(
  requestUrl: URL,
  env: EnvLike = process.env,
): URL | null {
  const configured = env[CHAT_ADMIN_PUBLIC_ORIGIN_ENV]?.trim();
  if (configured) {
    return parseConfiguredPublicOrigin(configured);
  }

  if (env.NODE_ENV === "production") {
    return null;
  }

  return new URL(requestUrl.origin);
}

/**
 * Accept when Origin matches the trusted public origin, or (if Origin is absent)
 * when Referer matches. Fail closed when neither is usable, when production
 * lacks a valid `CHAT_ADMIN_PUBLIC_ORIGIN`, or when the configured value is invalid.
 *
 * Deliberately ignores `X-Forwarded-Host` / `X-Forwarded-Proto`.
 */
export function isTrustedMutationOrigin(
  request: Request,
  env: EnvLike = process.env,
): boolean {
  let requestUrl: URL;
  try {
    requestUrl = new URL(request.url);
  } catch {
    return false;
  }

  const trusted = resolveTrustedMutationOrigin(requestUrl, env);
  if (!trusted) return false;

  const originHeader = request.headers.get("origin");
  if (originHeader) {
    const origin = parseOrigin(originHeader);
    return !!origin && sameSite(origin, trusted);
  }

  const refererHeader = request.headers.get("referer");
  if (refererHeader) {
    const referer = parseOrigin(refererHeader);
    return !!referer && sameSite(referer, trusted);
  }

  return false;
}
