/**
 * Central registry of every external RentReadBuy destination.
 *
 * Components must never hard-code RentReadBuy URLs; they reference a key from
 * `links`. All transactional journeys (sign in, membership purchase, gifting,
 * rent, buy) happen inside the existing RentReadBuy application.
 *
 * Entries with `confirmed: false` are placeholders awaiting the exact
 * destination from the RentReadBuy team.
 */

import { RRB_BASE_URL } from "./rrbOrigin";

export { RRB_BASE_URL };

export type LinkKey =
  | "home"
  | "signIn"
  | "silverMembership"
  | "giftSilver"
  | "rentBooks"
  | "buyBooks"
  | "terms"
  | "privacy"
  | "returns"
  | "support";

export interface ExternalLink {
  href: string;
  confirmed: boolean;
}

function rrb(path: string, confirmed = false): ExternalLink {
  return { href: new URL(path, RRB_BASE_URL).toString(), confirmed };
}

/**
 * Footer destinations were checked against the live pages (Phase F.2A).
 * Journey links point at the right live page but stay unconfirmed: the plans
 * page cannot preselect Silver or open the gift form from a URL, the login
 * redirect is untested with a real account, and `/products` is a combined
 * rent-and-buy catalogue rather than a rent-only or buy-only view.
 */
export const links: Record<LinkKey, ExternalLink> = {
  home: rrb("/"),
  signIn: rrb("/login?redirect=/subscription-plans"),
  silverMembership: rrb("/subscription-plans"),
  giftSilver: rrb("/subscription-plans"),
  rentBooks: rrb("/products"),
  buyBooks: rrb("/products"),
  terms: rrb("/terms-of-use", true),
  privacy: rrb("/privacy-policy", true),
  returns: rrb("/refund-cancellation", true),
  support: rrb("/contact-us", true),
};

export const unconfirmedLinks = (Object.keys(links) as LinkKey[]).filter(
  (key) => !links[key].confirmed,
);

export type SocialNetwork =
  | "facebook"
  | "instagram"
  | "youtube"
  | "linkedin"
  | "pinterest"
  | "x";

export interface SocialProfile extends ExternalLink {
  network: SocialNetwork;
  name: string;
}

/** Official RentReadBuy profiles, as linked from the live rentreadbuy.com footer. */
export const socialProfiles: readonly SocialProfile[] = [
  { network: "facebook", name: "Facebook", href: "https://www.facebook.com/rentreadbuy/", confirmed: true },
  { network: "instagram", name: "Instagram", href: "https://www.instagram.com/rentreadbuy/", confirmed: true },
  { network: "youtube", name: "YouTube", href: "https://www.youtube.com/channel/UC2KEZxYZuJufCaDVMXHyDtw", confirmed: true },
  { network: "linkedin", name: "LinkedIn", href: "https://in.linkedin.com/company/rentreadbuy", confirmed: true },
  { network: "pinterest", name: "Pinterest", href: "https://in.pinterest.com/rentreadbuy/", confirmed: true },
  { network: "x", name: "X", href: "https://x.com/rent_read_buy", confirmed: true },
];
