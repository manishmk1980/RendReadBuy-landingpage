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
  /** Retailer / programme name, used for the CTA and analytics. */
  merchant: string;
  /** Overrides the default "View on {merchant}" label. */
  ctaLabel?: string;
  status: AffiliateProductStatus;
}

/**
 * Approved festive products. Each short link was opened and matched to its
 * Amazon.in listing before it was assigned — the list order below is the
 * campaign order, not the order the links were supplied in.
 *
 * B01yXDjqL → My Little Book of Festivals boxset (0143473492)
 * B03wpJNfy → Tales from Indian Mythology, collection of 10 books (9354400507)
 * B0fv3IwUs → Philips 1000 Series NA120/00 (B0D14BB5XY)
 * B09icsirQ → One94Store gold rechargeable table lamp (B0FG7K4JCH)
 */
export const affiliateProducts: readonly AffiliateProduct[] = [
  {
    id: "my-little-book-of-festivals",
    title: "My Little Book of Festivals (Boxset)",
    shortDescription: "Introduce little readers to India's festivals, traditions and celebrations.",
    imageUrl: "/assets/sections/gift/rrb-festive-2026-festival-books.jpg",
    imageAlt: "My Little Book of Festivals boxset, with board books on Navratri, Holi and Diwali",
    affiliateUrl: "https://link.amazon/B01yXDjqL",
    merchant: "Amazon",
    status: "approved",
  },
  {
    id: "tales-from-indian-mythology",
    title: "Tales from Indian Mythology: Collection of 10 Books",
    shortDescription: "Bring timeless Indian legends into your family's reading moments.",
    imageUrl: "/assets/sections/gift/rrb-festive-2026-mythology-books.jpg",
    imageAlt: "Tales from Indian Mythology, a collection of 10 illustrated books",
    affiliateUrl: "https://link.amazon/B03wpJNfy",
    merchant: "Amazon",
    status: "approved",
  },
  {
    id: "philips-na120-air-fryer",
    title: "Philips 1000 Series NA120/00 Air Fryer",
    shortDescription: "Make festive cooking more convenient and find more time for your next chapter.",
    imageUrl: "/assets/sections/gift/rrb-festive-2026-philips-air-fryer.jpg",
    imageAlt: "Philips 1000 Series NA120/00 air fryer",
    affiliateUrl: "https://link.amazon/B0fv3IwUs",
    merchant: "Amazon",
    status: "approved",
  },
  {
    id: "one94store-gold-table-lamp",
    title: "One94Store Gold Rechargeable Table Lamp",
    shortDescription: "Set a warm, peaceful mood for reading after the festivities.",
    imageUrl: "/assets/sections/gift/rrb-festive-2026-gold-table-lamp.jpg",
    imageAlt: "One94Store gold rechargeable table lamp, switched on",
    affiliateUrl: "https://link.amazon/B09icsirQ",
    merchant: "Amazon",
    status: "approved",
  },
];

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
