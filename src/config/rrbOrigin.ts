/**
 * RentReadBuy platform origin. Kept apart from `links.ts` so client code can
 * read it without bundling the whole link registry.
 * The live site 301-redirects `www.` to this canonical, non-www host.
 */
export const RRB_BASE_URL =
  process.env.NEXT_PUBLIC_RRB_BASE_URL ?? "https://rentreadbuy.com";
