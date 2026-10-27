/**
 * Tab-scoped operator presence intent for the Silver console.
 *
 * - `online` — last confirmed Online; remount re-confirms via Central heartbeat
 * - `offline` — explicit Go Offline; stay Offline across refresh until Go Online
 *   or a new login clears the intent
 * - absent — default after login / cleared failure: auto-establish Online via
 *   Central heartbeat (never show Online without confirmation)
 *
 * Unexpected tab closure drops sessionStorage; Central TTL expires the row.
 */

export type PresenceIntent = "online" | "offline";

const STORAGE_KEY = "rrb_silver_chat_presence_intent";

export function readPresenceIntent(): PresenceIntent | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.sessionStorage.getItem(STORAGE_KEY);
    if (value === "online" || value === "offline") return value;
    return null;
  } catch {
    return null;
  }
}

export function writePresenceIntent(intent: PresenceIntent | null): void {
  if (typeof window === "undefined") return;
  try {
    if (intent === null) {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } else {
      window.sessionStorage.setItem(STORAGE_KEY, intent);
    }
  } catch {
    // Private mode / blocked storage must not break the console.
  }
}

/** True unless the operator explicitly chose Go Offline in this tab. */
export function shouldEstablishPresenceOnMount(): boolean {
  return readPresenceIntent() !== "offline";
}

export function readPresenceOnlineIntent(): boolean {
  return readPresenceIntent() === "online";
}

export function writePresenceOnlineIntent(online: boolean): void {
  writePresenceIntent(online ? "online" : null);
}

export function clearPresenceIntent(): void {
  writePresenceIntent(null);
}
