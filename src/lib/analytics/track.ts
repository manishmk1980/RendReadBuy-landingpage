import type { CampaignEvent, CampaignEventParams } from "./events";

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

/**
 * Single dispatch point for campaign analytics. No vendor is wired yet; when
 * GTM/GA4 is approved it only needs to be connected here.
 */
export function track(event: CampaignEvent, params: CampaignEventParams = {}) {
  if (typeof window === "undefined") return;

  window.dataLayer?.push({ event, ...params });

  if (process.env.NODE_ENV !== "production") {
    console.debug("[campaign analytics]", event, params);
  }
}
