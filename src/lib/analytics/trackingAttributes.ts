import type { CampaignEvent, CampaignEventParams } from "./events";

/**
 * Declarative tracking for server-rendered markup. Spread the result onto any
 * link, button or <details>; `AnalyticsListener` picks the event up through
 * one delegated listener, so components never import tracking code.
 *
 *   <a href={...} {...trackingAttributes("silver_cta_click", { placement: "hero" })}>
 */
export function trackingAttributes(
  event: CampaignEvent,
  params?: CampaignEventParams,
) {
  return {
    "data-track-event": event,
    ...(params ? { "data-track-params": JSON.stringify(params) } : {}),
  };
}
