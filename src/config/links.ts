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

const RRB_BASE_URL =
  process.env.NEXT_PUBLIC_RRB_BASE_URL ?? "https://www.rentreadbuy.com";

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

// TODO(RRB): replace every path below with the confirmed destination.
export const links: Record<LinkKey, ExternalLink> = {
  home: rrb("/"),
  signIn: rrb("/"),
  silverMembership: rrb("/"),
  giftSilver: rrb("/"),
  rentBooks: rrb("/"),
  buyBooks: rrb("/"),
  terms: rrb("/"),
  privacy: rrb("/"),
  returns: rrb("/"),
  support: rrb("/"),
};

export const unconfirmedLinks = (Object.keys(links) as LinkKey[]).filter(
  (key) => !links[key].confirmed,
);
