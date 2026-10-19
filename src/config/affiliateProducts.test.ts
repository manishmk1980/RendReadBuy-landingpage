import { describe, expect, it } from "vitest";
import { affiliateProducts, isLiveAffiliateProduct } from "./affiliateProducts";
import { campaignCopy } from "./campaign";

/**
 * Destinations were checked against the Amazon.in listings they open.
 * Prompt order was not the product order.
 */
const verifiedDestinations = [
  ["My Little Book of Festivals (Boxset)", "https://link.amazon/B01yXDjqL"],
  ["Tales from Indian Mythology: Collection of 10 Books", "https://link.amazon/B03wpJNfy"],
  ["Philips 1000 Series NA120/00 Air Fryer", "https://link.amazon/B0fv3IwUs"],
  ["One94Store Gold Rechargeable Table Lamp", "https://link.amazon/B09icsirQ"],
] as const;

describe("festive reading essentials", () => {
  it("publishes the four verified products in campaign order", () => {
    expect(affiliateProducts.map((product) => [product.title, product.affiliateUrl])).toEqual(
      verifiedDestinations.map(([title, affiliateUrl]) => [title, affiliateUrl]),
    );
    expect(affiliateProducts.every((product) => product.merchant === "Amazon")).toBe(true);
    expect(affiliateProducts.every(isLiveAffiliateProduct)).toBe(true);
    expect(affiliateProducts.map((product) => product.imageUrl)).toEqual([
      "/assets/sections/gift/rrb-festive-2026-festival-books.jpg",
      "/assets/sections/gift/rrb-festive-2026-mythology-books.jpg",
      "/assets/sections/gift/rrb-festive-2026-philips-air-fryer.jpg",
      "/assets/sections/gift/rrb-festive-2026-gold-table-lamp.jpg",
    ]);
    expect(affiliateProducts.map((product) => product.imageAlt)).toEqual([
      "My Little Book of Festivals boxset, with board books on Navratri, Holi and Diwali",
      "Tales from Indian Mythology, a collection of 10 illustrated books",
      "Philips 1000 Series NA120/00 air fryer",
      "One94Store gold rechargeable table lamp, switched on",
    ]);
  });

  it("keeps the approved festive introduction", () => {
    const copy = campaignCopy.readingEssentials;
    expect(copy.eyebrow).toBe("Festive reading & gifting");
    expect(`${copy.headlineLines[0]} ${copy.headlineLines[1]}`).toBe(
      "Celebrate traditions. Make time for stories.",
    );
    expect(copy.headlineLines[1].includes(copy.headlineEmphasis)).toBe(true);
    expect(copy.body).toBe(
      "Thoughtful festive gifts, stories that connect generations, and little comforts that make more room for reading.",
    );
    expect(copy.ctaPrefix).toBe("View on");
  });
});
