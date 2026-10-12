import type { CampaignEvent, CampaignEventParams } from "./events";

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

/**
 * Single dispatch point for campaign analytics. Events are queued in
 * `window.dataLayer`; GTM (see `TagManager`) consumes the queue once a
 * container is configured, including events pushed before it loaded.
 */
export function track(event: CampaignEvent, params: CampaignEventParams = {}) {
  if (typeof window === "undefined") return;

  (window.dataLayer ??= []).push({ event, ...params });

  if (process.env.NODE_ENV !== "production") {
    console.debug("[campaign analytics]", event, params);
  }
}
