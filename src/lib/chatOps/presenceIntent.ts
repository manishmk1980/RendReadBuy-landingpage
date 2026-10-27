/**
 * Tab-scoped Online intent for the operator console.
 *
 * Survives refresh (sessionStorage) so the console can re-confirm presence with
 * Central after remount. Cleared on explicit Offline / logout. Unexpected tab
 * closure drops sessionStorage; Central TTL then expires the presence row.
 */

const STORAGE_KEY = "rrb_silver_chat_presence_intent";
const ONLINE_VALUE = "online";

export function readPresenceOnlineIntent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) === ONLINE_VALUE;
  } catch {
    return false;
  }
}

export function writePresenceOnlineIntent(online: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (online) {
      window.sessionStorage.setItem(STORAGE_KEY, ONLINE_VALUE);
    } else {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Private mode / blocked storage must not break the console.
  }
}
