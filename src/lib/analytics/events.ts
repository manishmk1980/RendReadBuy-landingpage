export const campaignEvents = [
  "silver_cta_click",
  "gift_membership_click",
  "sign_in_click",
  "rent_exit_click",
  "buy_exit_click",
  "featured_book_click",
  "affiliate_product_click",
  "faq_open",
  /** Any other hand-off to RentReadBuy: logos, the final fallback, footer links. */
  "rentreadbuy_exit_click",
  "social_profile_click",
] as const;

export type CampaignEvent = (typeof campaignEvents)[number];

export type CampaignEventParams = Record<string, string | number | boolean>;

export function isCampaignEvent(value: unknown): value is CampaignEvent {
  return (
    typeof value === "string" &&
    (campaignEvents as readonly string[]).includes(value)
  );
}
