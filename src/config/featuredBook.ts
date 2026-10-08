/**
 * Featured Book slot. One title only, selected from current search demand and
 * confirmed RentReadBuy availability. The slot is intentionally empty until a
 * title is validated and approved; the section renders nothing while `null`.
 */

export interface FeaturedBook {
  title: string;
  author: string;
  context: string;
  cover: {
    src: string;
    width: number;
    height: number;
    alt: string;
  };
  /** RentReadBuy listing for this exact title. */
  listingUrl: string;
  rentUrl?: string;
  buyUrl?: string;
}

// TODO(content): supply the approved featured title, cover asset and RRB listing URLs.
export const featuredBook: FeaturedBook | null = null;
