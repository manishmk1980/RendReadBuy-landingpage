/**
 * Reading Essentials affiliate products. Products must have a natural
 * relationship to reading and use their approved affiliate destination.
 *
 * `affiliateProducts` holds real records only. A product is published (and
 * its merchant CTA made live) only when it is `approved` and carries a valid
 * https affiliate URL; production omits the section when none qualify.
 * Never invent URLs, images, prices, ratings or availability claims.
 */

export type AffiliateProductStatus = "approved" | "pending" | "unavailable";

export interface AffiliateProduct {
  /** Stable slug, sent with analytics events. */
  id: string;
  title: string;
  /** One short, benefit-led line. No unverified claims. */
  shortDescription: string;
  /** Approved product image: a /public path or the merchant's https URL. */
  imageUrl?: string;
  /** Defaults to the title. */
  imageAlt?: string;
  /** Approved affiliate destination for this exact product. */
  affiliateUrl?: string;
  /** Retailer / programme name, used for the CTA, disclosure and analytics. */
  merchant: string;
  /** Overrides the default "View on {merchant}" label. */
  ctaLabel?: string;
  status: AffiliateProductStatus;
  /** Programme-specific disclosure, shown once when any of its links are live. */
  disclosure?: string;
}

// TODO(content): supply approved products, product imagery and affiliate URLs.
export const affiliateProducts: readonly AffiliateProduct[] = [];

/**
 * Development-only stand-ins so the carousel can be reviewed, including
 * navigation beyond the first three cards. Generic categories only: no
 * brands, images, prices or links, and never rendered in production builds.
 * (A VOLO adjustable book stand is a candidate for the first slot; its
 * image, price and affiliate destination are not yet approved.)
 */
export const affiliateProductPlaceholders: readonly AffiliateProduct[] = [
  {
    id: "dev-book-stand",
    title: "Adjustable Book Stand",
    shortDescription: "Holds your book open at a comfortable angle, hands-free.",
    merchant: "Amazon",
    status: "pending",
  },
  {
    id: "dev-reading-light",
    title: "Clip-On Reading Light",
    shortDescription: "Focused light for comfortable reading, anytime.",
    merchant: "Amazon",
    status: "pending",
  },
  {
    id: "dev-magnetic-bookmarks",
    title: "Magnetic Bookmarks",
    shortDescription: "Keep your place without creasing a single page.",
    merchant: "Amazon",
    status: "pending",
  },
  {
    id: "dev-book-sleeve",
    title: "Padded Book Sleeve",
    shortDescription: "Protects your current read in a bag or on the move.",
    merchant: "Amazon",
    status: "pending",
  },
  {
    id: "dev-reading-journal",
    title: "Reading Journal",
    shortDescription: "A place for notes, quotes and the books still to come.",
    merchant: "Amazon",
    status: "pending",
  },
];

function isHttpsUrl(value: string | undefined): value is string {
  if (!value) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

/** Approved, with a valid https affiliate URL: the only state with a live CTA. */
export function isLiveAffiliateProduct(product: AffiliateProduct) {
  return product.status === "approved" && isHttpsUrl(product.affiliateUrl);
}
