/**
 * Official RentReadBuy brand assets. Only the supplied official files in
 * public/assets/brand/ may be used; the logo is never redrawn or substituted.
 */

export interface BrandImage {
  src: string;
  width: number;
  height: number;
  alt: string;
}

export const brand: { name: string; logo: BrandImage | null } = {
  name: "RentReadBuy",
  logo: {
    src: "/assets/brand/rrb-logo.png",
    width: 2172,
    height: 724,
    alt: "RentReadBuy",
  },
};
