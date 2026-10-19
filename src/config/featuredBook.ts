/**
 * Featured Book slot. One title only, selected from current search demand and
 * confirmed RentReadBuy availability.
 *
 * `featuredBook` is the approved record. Editorial fields may be set once the
 * title is approved. A destination is published only when it is that title's
 * own RentReadBuy inventory URL. Production omits the section while
 * `featuredBook` is `null`.
 *
 * Rent, buy and view destinations must be the inventory record for that title
 * on rentreadbuy.com. Do not point them at /products, another catalogue, or
 * an affiliate link, and do not invent a checkout URL. When that inventory
 * page is where the reader chooses rent or buy, the verified detail URL is
 * the destination for every action. Only show a price read from that page.
 */

export interface FeaturedBookImage {
  src: string;
  width: number;
  height: number;
  alt: string;
}

/** One way to get the book. Rendered as a link only when available with a verified URL. */
export interface FeaturedBookOffer {
  available: boolean;
  /** Verified display price, e.g. "₹139". Omit rather than estimate. */
  price?: string;
  /** Verified RentReadBuy inventory URL for this action. */
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
   * Cover artwork for the upright book. Clipped to `featuredBookScene.coverFace`
   * once the scenic background no longer has a cover baked in.
   */
  image?: FeaturedBookImage;
  /** RentReadBuy listing for this exact title. */
  detailUrl?: string;
  rent?: FeaturedBookOffer;
  buy?: FeaturedBookOffer;
}

/**
 * Approved editorial identity for The Palace of Illusions.
 *
 * Inventory page confirmed 16 Oct 2026:
 * https://rentreadbuy.com/book/the-palace-of-illusions-5053
 * (product 5053, ISBN 9780330458535, Chitra Banerjee Divakaruni).
 *
 * That page lets the reader choose Rent @ ₹160 or Buy @ ₹399. Neither choice
 * has its own URL, and neither completes on click, so rent, buy and view all
 * open this same inventory page.
 */
const palaceOfIllusionsUrl = "https://rentreadbuy.com/book/the-palace-of-illusions-5053";

export const featuredBook: FeaturedBook | null = {
  id: "the-palace-of-illusions",
  title: "The Palace of Illusions",
  author: "Chitra Banerjee Divakaruni",
  description:
    "Experience the Mahabharata through Draupadi's eyes—a captivating story of love, ambition, destiny and the choices that shape our lives.",
  detailUrl: palaceOfIllusionsUrl,
  rent: {
    available: true,
    price: "₹160",
    url: palaceOfIllusionsUrl,
  },
  buy: {
    available: true,
    price: "₹399",
    url: palaceOfIllusionsUrl,
  },
};

export interface FeaturedBookScene {
  /** Artwork currently painted behind the section. */
  background: string;
  /** Book-free scene kept for a future cover overlay. Not painted while `coverBaked` is true. */
  cleanBackground: string;
  mockup: FeaturedBookImage;
  coverFace: {
    top: string;
    left: string;
    width: string;
    height: string;
  };
  /**
   * True when `background` already contains the upright book. The section then
   * skips the mockup and any `featuredBook.image` overlay.
   */
  coverBaked: boolean;
}

/**
 * Scenic background, plus the blank two-book mockup retained for reuse.
 *
 * While `coverBaked` is true the Palace of Illusions backdrop is the only
 * book artwork. To restore the overlay, point `background` at `cleanBackground`
 * and set `coverBaked` to false. A configured `featuredBook.image` is then
 * clipped to `coverFace`. With no image, the upright book stays blank.
 *
 * `coverFace` is the upright book's front board, as percentages of the mockup
 * (1278 × 1230). It is inset from the spine (groove at x ≈ 329), the outer
 * rounded edges (x 283–1009, y 70–962) and the teal hardcover, so the mockup's
 * spine, edge light, texture and contact shadow stay visible.
 */
export const featuredBookScene: FeaturedBookScene = {
  background: "/assets/sections/featured-book/featured-bok-the-palace-of-illusions-backdrop.jpg",
  cleanBackground: "/assets/sections/featured-book/featured-book-background.webp",
  mockup: {
    src: "/assets/sections/featured-book/stacked-book-mock-for-featured-books.png",
    width: 1278,
    height: 1230,
    alt: "Blank cream book standing on a teal hardcover",
  },
  coverFace: {
    top: "6.67%",
    left: "27.23%",
    width: "51.17%",
    height: "70.57%",
  },
  coverBaked: true,
};
