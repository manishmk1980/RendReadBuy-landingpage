/**
 * Tab-scoped confirmed Online flag for the Silver console.
 *
 * - `online` — last Central-confirmed Online; remount re-confirms via heartbeat
 *   and surfaces a "Restored Online" status
 * - absent — after login / failed confirmation: auto-establish Online via
 *   Central heartbeat (never show Online without confirmation)
 *
 * There is no operator Offline preference. Online is automatic while the
 * session is valid; logout withdraws presence, and unexpected closure is
 * covered by Central heartbeat TTL (sessionStorage drops with the tab).
 */

const STORAGE_KEY = "rrb_silver_chat_presence_intent";

export function readPresenceOnlineIntent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) === "online";
  } catch {
    return false;
  }
}

export function writePresenceOnlineIntent(online: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (online) {
      window.sessionStorage.setItem(STORAGE_KEY, "online");
    } else {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Private mode / blocked storage must not break the console.
  }
}

export function clearPresenceIntent(): void {
  writePresenceOnlineIntent(false);
}
