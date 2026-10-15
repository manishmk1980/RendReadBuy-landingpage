import "./dataLayer";
import type { CampaignEvent, CampaignEventParams } from "./events";

/**
 * Single dispatch point for campaign analytics. Each call appends one
 * dataLayer entry. Granting or withdrawing consent does not push that entry
 * again, so an earlier campaign event is not replayed when the choice changes.
 */
export function track(event: CampaignEvent, params: CampaignEventParams = {}) {
  if (typeof window === "undefined") return;

  (window.dataLayer ??= []).push({ event, ...params });

  if (process.env.NODE_ENV !== "production") {
    console.debug("[campaign analytics]", event, params);
  }
}
