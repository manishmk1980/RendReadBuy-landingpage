/**
 * Campaign-owned presentation for the shared Primewayz visitor chat (widget 1.3.0).
 *
 * `siteKey` is a presentation identifier only. The Primewayz backend resolves
 * the tenant from the browser's registered Origin, so no tenant, market or
 * source field is ever configured here.
 *
 * The six intent keys are stable labels the widget can send with a message.
 * Approved replies, sessions and leads stay on the Primewayz backend.
 */

import { silverProposition } from "./campaign";

export const sharedChatIdentity = {
  siteKey: "rentreadbuy-silver",
  siteName: "RentReadBuy Silver Membership",
  pageType: "silver_membership_landing",
} as const;

export const sharedChatPageContext = {
  greeting: "Questions about Silver Membership?",
  supportingText: `Ask about Silver: ${silverProposition.price.display} ${silverProposition.price.term}, with up to 2 physical books at a time.`,
} as const;

export const sharedChatIntents = [
  { key: "silver_how_it_works", label: "How does Silver Membership work?" },
  { key: "silver_price_inclusions", label: `What is included in ${silverProposition.price.display}?` },
  { key: "silver_book_limits", label: "How many books can I read?" },
  { key: "silver_returns", label: "How do returns and my next book work?" },
  { key: "silver_gifting", label: "Can I gift Silver Membership?" },
  { key: "silver_joining", label: "How do I join?" },
] as const;

export type SharedChatIntentKey = (typeof sharedChatIntents)[number]["key"];

/**
 * Floating controls the widget must keep its launcher clear of. The hero pause
 * control also carries `data-pw-chat-avoid`. Both labels are listed because
 * the accessible name flips between pause and play.
 */
export const sharedChatLauncher = {
  collisionSelectors: [
    'button[aria-label="Pause scenery animation"]',
    'button[aria-label="Play scenery animation"]',
  ],
} as const;

/**
 * Kept apart from the widget defaults (`primewayz_chat_*`) and from any other
 * RentReadBuy embed, so a session id can never be reused across tenants.
 */
export const sharedChatStorageKeys = {
  sessionId: "rrb_silver_chat_session_id",
  visitorName: "rrb_silver_chat_visitor_name",
  visitorEmail: "rrb_silver_chat_visitor_email",
  panelOpen: "rrb_silver_chat_panel_open",
  openTracked: "rrb_silver_chat_open_tracked",
  firstLanding: "rrb_silver_chat_first_landing",
} as const;

/**
 * Compact cookie-settings disclosure. Widget 1.3.0 has no attribution field:
 * panel title, assistant name and team name come from the platform
 * `chatWidget` payload. This copy is the landing-page credit.
 */
export const sharedChatDisclosure = {
  processing:
    "Chat support is powered by Primewayz Infotech. Messages and contact details shared may be processed to respond to your enquiry.",
  safetyLead: "Do not share passwords or payment details. See our",
  privacyLabel: "Privacy Policy",
  safetyTail: "for details.",
} as const;

/**
 * Canonical join host. Production builds for this origin must ship Shared Chat
 * ready — an accidental `ENABLED=off` (seen on live after PR #12) leaves visitors
 * with no launcher.
 */
export const sharedChatProductionSiteUrl = "https://join.rentreadbuy.com";

/**
 * Approved published widget 1.3.0 endpoints. Used when the matching
 * `NEXT_PUBLIC_SHARED_CHAT_*` URL/integrity env is blank so a partial deploy
 * env cannot wipe the API/widget URLs while enablement stays on.
 */
export const sharedChatPublishedEndpoints = {
  apiBaseUrl: "https://uk.primewayz.com",
  widgetUrl: "https://uk.primewayz.com/embed/chat/1.3.0/pw-chat.js",
  widgetIntegrity:
    "sha384-eViGVIdK7TNI/WYYpjF31NYjvzJEZ0sTcioyRIASbNuex4DHyjl0yRBYzCRfrEv4",
} as const;

function envOrPublished(raw: string | undefined, fallback: string): string {
  const trimmed = raw?.trim();
  return trimmed ? trimmed : fallback;
}

/**
 * Deployment-dependent public settings. Each `NEXT_PUBLIC_` value is inlined
 * at build time, so the references must stay literal. Enablement stays off
 * unless explicitly `on`/`true`; blank URL/integrity fall back to the published
 * Silver endpoints above.
 */
export const sharedChatEnv = {
  enabled: process.env.NEXT_PUBLIC_SHARED_CHAT_ENABLED,
  apiBaseUrl: envOrPublished(
    process.env.NEXT_PUBLIC_SHARED_CHAT_API_BASE_URL,
    sharedChatPublishedEndpoints.apiBaseUrl,
  ),
  widgetUrl: envOrPublished(
    process.env.NEXT_PUBLIC_SHARED_CHAT_WIDGET_URL,
    sharedChatPublishedEndpoints.widgetUrl,
  ),
  widgetIntegrity: envOrPublished(
    process.env.NEXT_PUBLIC_SHARED_CHAT_WIDGET_INTEGRITY,
    sharedChatPublishedEndpoints.widgetIntegrity,
  ),
};
