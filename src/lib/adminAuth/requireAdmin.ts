import { redirect } from "next/navigation";
import { isAdminAuthConfigured } from "./config";
import { getVerifiedAdminSession } from "./http";
import type { VerifiedAdminSession } from "./session";

/**
 * Server-side gate for protected admin pages.
 * Always re-validates the signed cookie (MAC, expiry, revocation, role).
 */
export async function requireAdminPageSession(): Promise<VerifiedAdminSession> {
  const session = await getVerifiedAdminSession();
  if (!session) {
    const configured = isAdminAuthConfigured();
    const params = new URLSearchParams();
    if (!configured) params.set("error", "not_configured");
    else params.set("error", "auth_required");
    redirect(`/admin/login?${params.toString()}`);
  }
  return session;
}
