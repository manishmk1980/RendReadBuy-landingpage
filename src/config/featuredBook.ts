/**
 * Featured Book slot. One title only, selected from current search demand and
 * confirmed RentReadBuy availability.
 *
 * `featuredBook` is the approved record: every field in it, including prices,
 * URLs and availability, must be verified against the live RentReadBuy
 * listing. It stays `null` until a title is approved; production then omits
 * the section rather than publish an unverified product or "trending" claim.
 */

export interface FeaturedBookImage {
  src: string;
  width: number;
  height: number;
  alt: string;
}

/** One way to get the book. Rendered as a CTA only when available with a URL. */
export interface FeaturedBookOffer {
  available: boolean;
  /** Verified display price, e.g. "₹139". Omit rather than estimate. */
  price?: string;
  /** Verified RentReadBuy destination for this action. */
  url?: string;
}

export interface FeaturedBook {
  /** Stable slug, sent with analytics events. */
  id: string;
  title: string;
  author: string;
  /** Short, approved editorial description. No unverified popularity claims. */
  description: string;
  /**
   * Cover artwork. Rendered only once the section background no longer has
   * a cover baked in (see `featuredBookScene.coverBaked`).
   */
  image?: FeaturedBookImage;
  /** RentReadBuy listing for this exact title. */
  detailUrl?: string;
  rent?: FeaturedBookOffer;
  buy?: FeaturedBookOffer;
}

// TODO(content): supply the approved featured title, description, verified prices and RRB URLs.
export const featuredBook: FeaturedBook | null = null;

/**
 * Development-only stand-in so the section layout can be reviewed. Title and
 * author name the book printed in the background artwork; it carries no
 * prices, URLs or demand claims and is never rendered in production builds.
 */
export const featuredBookPlaceholder: FeaturedBook = {
  id: "development-placeholder",
  title: "The Psychology of Money",
  author: "Morgan Housel",
  description:
    "Placeholder description. The approved editorial summary for the featured title will appear here.",
  rent: { available: true },
  buy: { available: true },
};

/**
 * The section's background artwork. While `coverBaked` is true the featured
 * cover is part of the image (currently The Psychology of Money) and no cover
 * is overlaid; an approved title other than `bakedCoverTitle` needs a clean
 * background, after which `coverBaked: false` lets `image` fill the cover slot.
 */
export const featuredBookScene = {
  background: "/assets/sections/featured-book/featured-book-background.webp",
  coverBaked: true,
  bakedCoverTitle: "The Psychology of Money",
} as const;
