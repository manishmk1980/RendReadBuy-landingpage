import { ADMIN_CSRF_COOKIE, ADMIN_CSRF_HEADER } from "@/lib/adminAuth/constants";

export function readCsrfCookie(): string | null {
  if (typeof document === "undefined") return null;
  const parts = document.cookie.split(";").map((p) => p.trim());
  const match = parts.find((p) => p.startsWith(`${ADMIN_CSRF_COOKIE}=`));
  if (!match) return null;
  return decodeURIComponent(match.slice(ADMIN_CSRF_COOKIE.length + 1));
}

export async function adminGet<T>(
  path: string,
): Promise<{ status: number; body: T }> {
  const response = await fetch(path, {
    method: "GET",
    credentials: "same-origin",
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  const body = (await response.json()) as T;
  return { status: response.status, body };
}

export async function adminMutate<T>(
  path: string,
  payload: Record<string, unknown>,
): Promise<{ status: number; body: T }> {
  const csrfToken = readCsrfCookie();
  const response = await fetch(path, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      ...(csrfToken ? { [ADMIN_CSRF_HEADER]: csrfToken } : {}),
    },
    body: JSON.stringify({ ...payload, csrfToken }),
  });
  const body = (await response.json()) as T;
  return { status: response.status, body };
}
