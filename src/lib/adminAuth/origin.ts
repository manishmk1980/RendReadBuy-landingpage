/**
 * Origin / Referer checks for state-changing admin requests.
 * Rejects cross-site POSTs even when SameSite=Lax is bypassed.
 */

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
 * Accept when Origin matches the request URL origin, or (if Origin is absent)
 * when Referer matches. Fail closed when neither is usable.
 */
export function isTrustedMutationOrigin(request: Request): boolean {
  let requestUrl: URL;
  try {
    requestUrl = new URL(request.url);
  } catch {
    return false;
  }

  const originHeader = request.headers.get("origin");
  if (originHeader) {
    const origin = parseOrigin(originHeader);
    return !!origin && sameSite(origin, requestUrl);
  }

  const refererHeader = request.headers.get("referer");
  if (refererHeader) {
    const referer = parseOrigin(refererHeader);
    return !!referer && sameSite(referer, requestUrl);
  }

  return false;
}
