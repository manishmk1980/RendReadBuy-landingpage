/**
 * Campaign-owned presentation for the shared Primewayz visitor chat (widget 1.1.0).
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
 * Deployment-dependent public settings. Each `NEXT_PUBLIC_` value is inlined
 * at build time, so the references must stay literal.
 */
export const sharedChatEnv = {
  enabled: process.env.NEXT_PUBLIC_SHARED_CHAT_ENABLED,
  apiBaseUrl: process.env.NEXT_PUBLIC_SHARED_CHAT_API_BASE_URL,
  widgetUrl: process.env.NEXT_PUBLIC_SHARED_CHAT_WIDGET_URL,
  widgetIntegrity: process.env.NEXT_PUBLIC_SHARED_CHAT_WIDGET_INTEGRITY,
};
