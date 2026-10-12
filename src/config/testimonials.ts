/**
 * Reader proof. Only genuine, approved reader testimonials may be added here:
 * real quotes, used with the reader's consent, with every optional detail
 * (location, portrait, membership) verified for that reader.
 *
 * Do not add illustrative names, quotes, photos or ratings, including the
 * sample endorsements shown in design creatives.
 */

export type TestimonialGlyph = "openBook" | "books" | "notebook";

export interface Testimonial {
  id: string;
  /** Verbatim approved quote, without surrounding quotation marks. */
  quote: string;
  /** Display name as approved by the reader, e.g. "R. Mehta". */
  readerName: string;
  /** Verified city, only if the reader approved showing it. */
  location?: string;
  /** Verified membership designation, e.g. "Silver member". */
  membership?: string;
  /** Approved reader photograph; alt text should identify the reader. */
  portrait?: {
    src: string;
    width: number;
    height: number;
    alt: string;
  };
  /** Small decorative book mark in the card's corner. */
  glyph?: TestimonialGlyph;
}

// TODO(content): supply approved testimonials and reader consent details.
export const testimonials: readonly Testimonial[] = [];

/**
 * Card slots shown in development only while `testimonials` is empty, so the
 * section layout can be reviewed. They carry no names, quotes or photos and
 * are never rendered in production builds.
 */
export const testimonialPlaceholderSlots = 3;
