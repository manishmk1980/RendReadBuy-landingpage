import { describe, expect, it } from "vitest";
import { campaignCopy, campaignMeta, silverProposition } from "./campaign";
import { faqs } from "./faqs";
import { sharedChatPageContext } from "./sharedChat";

const campaignText = JSON.stringify({ campaignCopy, campaignMeta, silverProposition, faqs, sharedChatPageContext });

describe("approved Silver membership facts", () => {
  it("prices Silver at ₹899 for three months", () => {
    expect(silverProposition.price).toMatchObject({ amount: 899, currency: "INR", term: "for 3 months" });
  });

  it("states the approved rental rules", () => {
    expect(campaignText).toContain("Up to 2 books at a time");
    expect(campaignText).toContain("No fixed total rental-book quota");
    expect(campaignText).toContain("No delivery charge");
    expect(campaignText).toContain("No return pickup charge");
    expect(campaignText).toContain("up to 60 days");
    expect(campaignText).toContain("5-day post-expiry return window");
    expect(campaignText).toContain("5% off the purchase");
  });

  it("lets readers choose next books after requesting a return", () => {
    expect(faqs.find((faq) => faq.id === "finish-early")?.answer).toMatch(/return request and choose your next books/);
  });

  it("never claims unlimited or simultaneous-without-limit rentals", () => {
    expect(campaignText.toLowerCase()).not.toMatch(/unlimited|any number of books|as many books/);
  });
});
