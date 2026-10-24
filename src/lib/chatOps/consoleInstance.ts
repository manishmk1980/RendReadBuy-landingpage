/**
 * Browser-only helper: stable per-tab console instance id (non-secret label).
 * Server derives operatorRef from the verified session + this id.
 */

const STORAGE_KEY = "rrb_silver_chat_console_instance";

export function getOrCreateConsoleInstanceId(): string {
  if (typeof window === "undefined" || typeof crypto === "undefined") {
    return "00000000000000000000000000000000";
  }
  try {
    const existing = window.sessionStorage.getItem(STORAGE_KEY);
    if (existing && /^[a-f0-9]{32}$/.test(existing)) {
      return existing;
    }
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    const id = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    window.sessionStorage.setItem(STORAGE_KEY, id);
    return id;
  } catch {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }
}
