/**
 * Purchase-objection FAQs. Questions are locked by the Locked Structure V2.
 *
 * Answers state only the approved Silver membership rules. Rendered in order:
 * the first three form the left column on desktop, the last three the right.
 * Only `approved` entries are published in production.
 */

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  approved: boolean;
}

export const faqs: readonly FAQ[] = [
  {
    id: "books-at-a-time",
    question: "How many books can I rent at a time?",
    answer:
      "Silver lets you have up to 2 books at a time, with no fixed total rental-book quota during an active membership. After requesting a return, you can choose your next books straight away.",
    approved: true,
  },
  {
    id: "finish-early",
    question: "What happens if I finish early?",
    answer:
      "Raise a return request and choose your next books straight away. You don't need to wait for your returned books to reach our warehouse.",
    approved: true,
  },
  {
    id: "keep-duration",
    question: "How long can I keep my books?",
    answer:
      "The standard Silver rental period is up to 60 days. While your membership is active, you can contact customer care to request an extension.",
    approved: true,
  },
  {
    id: "buy-a-book",
    question: "Can I buy a book I really like?",
    answer:
      "Yes. Request to keep a rented book and we'll share the applicable purchase amount. As a Silver member, you get 5% off the purchase.",
    approved: true,
  },
  {
    id: "membership-expires",
    question: "What happens when membership expires?",
    answer:
      "You can renew, or return your books within the 5-day post-expiry return window with no additional pickup charge.",
    approved: true,
  },
  {
    id: "upgrade-plan",
    question: "Can I upgrade to another plan later?",
    answer: "Yes. You can upgrade to a higher plan on RentReadBuy.",
    approved: true,
  },
];

/** What the page renders, and what its FAQPage structured data repeats. */
export const publishedFaqs: readonly FAQ[] =
  process.env.NODE_ENV === "production" ? faqs.filter((faq) => faq.approved) : faqs;
