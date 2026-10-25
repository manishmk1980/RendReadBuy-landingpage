import { ADMIN_CSRF_COOKIE, ADMIN_CSRF_HEADER } from "@/lib/adminAuth/constants";

export function readCsrfCookie(): string | null {
  if (typeof document === "undefined") return null;
  const parts = document.cookie.split(";").map((p) => p.trim());
  const match = parts.find((p) => p.startsWith(`${ADMIN_CSRF_COOKIE}=`));
  if (!match) return null;
  return decodeURIComponent(match.slice(ADMIN_CSRF_COOKIE.length + 1));
}

export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const name = "name" in error ? String((error as { name?: unknown }).name) : "";
  return name === "AbortError";
}

type AdminFetchInit = {
  signal?: AbortSignal;
};

type ErrorBody = {
  error?: { message?: string };
};

async function readBody<T>(
  response: Response,
): Promise<{ status: number; body: T }> {
  try {
    const body = (await response.json()) as T;
    return { status: response.status, body };
  } catch {
    // Invalid/non-JSON bodies must never look like success — even on HTTP 2xx —
    // or callers would confirm presence transitions / mutations incorrectly.
    return {
      status: response.ok ? 0 : response.status,
      body: {
        error: { message: "The server returned an unreadable response." },
      } as T,
    };
  }
}

function networkFailureBody<T>(): T {
  return {
    error: { message: "Network error. Check your connection and retry." },
  } as T;
}

/**
 * Session-cookie GET. Never throws for network/JSON failures — returns status 0.
 * AbortError is rethrown so callers can ignore cancelled requests.
 */
export async function adminGet<T>(
  path: string,
  init?: AdminFetchInit,
): Promise<{ status: number; body: T }> {
  try {
    const response = await fetch(path, {
      method: "GET",
      credentials: "same-origin",
      headers: { accept: "application/json" },
      cache: "no-store",
      signal: init?.signal,
    });
    return await readBody<T>(response);
  } catch (error) {
    if (isAbortError(error)) throw error;
    return { status: 0, body: networkFailureBody<T>() };
  }
}

/**
 * CSRF-protected POST. Never throws for network/JSON failures — returns status 0.
 * AbortError is rethrown so callers can ignore cancelled requests.
 */
export async function adminMutate<T>(
  path: string,
  payload: Record<string, unknown>,
  init?: AdminFetchInit,
): Promise<{ status: number; body: T }> {
  const csrfToken = readCsrfCookie();
  try {
    const response = await fetch(path, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        ...(csrfToken ? { [ADMIN_CSRF_HEADER]: csrfToken } : {}),
      },
      body: JSON.stringify({ ...payload, csrfToken }),
      signal: init?.signal,
    });
    return await readBody<T>(response);
  } catch (error) {
    if (isAbortError(error)) throw error;
    return { status: 0, body: networkFailureBody<T>() };
  }
}

export function errorMessage(
  body: ErrorBody | null | undefined,
  fallback: string,
): string {
  const message = body?.error?.message;
  return typeof message === "string" && message.trim() ? message : fallback;
}
