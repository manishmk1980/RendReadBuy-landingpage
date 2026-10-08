/**
 * Reader proof. Only genuine, approved reader testimonials may be added here.
 */

export interface Testimonial {
  id: string;
  quote: string;
  readerName: string;
  /** e.g. city or "Silver member since 2025"; only if approved by the reader. */
  readerDetail?: string;
  portrait?: {
    src: string;
    width: number;
    height: number;
    alt: string;
  };
}

// TODO(content): supply approved testimonials and reader consent details.
export const testimonials: readonly Testimonial[] = [];
