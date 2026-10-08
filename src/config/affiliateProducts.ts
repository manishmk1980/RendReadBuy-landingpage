/**
 * Reading Essentials affiliate products. Products must have a natural
 * relationship to reading and use their approved affiliate destination.
 */

export interface AffiliateProduct {
  id: string;
  name: string;
  description?: string;
  image: {
    src: string;
    width: number;
    height: number;
    alt: string;
  };
  affiliateUrl: string;
  /** Retailer / programme name, used for disclosure and analytics. */
  partner: string;
}

// TODO(content): supply approved products, product imagery and affiliate URLs.
export const affiliateProducts: readonly AffiliateProduct[] = [];
