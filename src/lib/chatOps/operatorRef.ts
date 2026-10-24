import { createHash } from "node:crypto";
import type { VerifiedAdminSession } from "@/lib/adminAuth";

/**
 * Opaque console-instance label (non-secret). Held in sessionStorage per tab so
 * Offline for one tab cannot clear another operator's / tab's presence row.
 */
export const CONSOLE_INSTANCE_ID_PATTERN = /^[a-f0-9]{32}$/;

export const OPERATOR_REF_MAX = 64;

/**
 * Build a tenant-local operatorRef from the verified session + console instance.
 * Never accept a client-supplied operatorRef / tenantId / operatorUserId as authority.
 *
 * Shape: sil:{subHash8}:{sidPrefix8}:{consoleInstanceId32} ≤ 64 chars.
 */
export function buildSilverOperatorRef(
  session: Pick<VerifiedAdminSession, "sub" | "sid">,
  consoleInstanceId: string,
): string {
  if (!CONSOLE_INSTANCE_ID_PATTERN.test(consoleInstanceId)) {
    throw new Error("invalid_console_instance_id");
  }
  const subHash = createHash("sha256")
    .update(`sil-sub\0${session.sub}`, "utf8")
    .digest("hex")
    .slice(0, 8);
  const sidPrefix = createHash("sha256")
    .update(`sil-sid\0${session.sid}`, "utf8")
    .digest("hex")
    .slice(0, 8);
  const ref = `sil:${subHash}:${sidPrefix}:${consoleInstanceId}`;
  if (ref.length > OPERATOR_REF_MAX) {
    throw new Error("operator_ref_too_long");
  }
  return ref;
}

export function parseConsoleInstanceId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  if (!CONSOLE_INSTANCE_ID_PATTERN.test(trimmed)) return null;
  return trimmed;
}
