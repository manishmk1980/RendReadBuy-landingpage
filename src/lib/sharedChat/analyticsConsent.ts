import { readStoredConsent, subscribeToConsent } from "@/lib/consent";

declare global {
  interface Window {
    /** Explicit gate read by Primewayz Chat before emitting visitor analytics. */
    __PRIMEWAYZ_ANALYTICS_CONSENT__?: boolean;
  }
}

/**
 * Maps this page's analytics cookie onto the flag the shared widget checks
 * before calling `gtag` / `dataLayer`. Consent bootstrap always creates those
 * sinks, so leaving the flag unset would let chat events fire without a grant.
 *
 * Advertising consent is intentionally ignored: chat analytics are not ads.
 */
export function syncSharedChatAnalyticsConsent(win: Window = window): boolean {
  const granted = readStoredConsent()?.analytics === "granted";
  win.__PRIMEWAYZ_ANALYTICS_CONSENT__ = granted;
  return granted;
}

/** Keeps the widget flag aligned when Cookie settings change on the open page. */
export function subscribeSharedChatAnalyticsConsent(win: Window = window): () => void {
  syncSharedChatAnalyticsConsent(win);
  return subscribeToConsent(() => {
    syncSharedChatAnalyticsConsent(win);
  });
}
