/**
 * Purchase-objection FAQs. Questions are locked by the Locked Structure V2.
 *
 * Answers are drafted only from the confirmed Silver rules in the Campaign
 * Blueprint V1 and are marked `approved: false` until RentReadBuy signs off.
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
    answer: "Silver members can have up to 2 books at a time.",
    approved: false,
  },
  {
    id: "finish-early",
    question: "What happens if I finish early?",
    answer:
      "Raise a return request and choose your next books straight away. You don't have to wait for your returned books to reach RentReadBuy.",
    approved: false,
  },
  {
    id: "keep-duration",
    question: "How long can I keep my books?",
    answer:
      "The standard Silver rental period is up to 60 days. While your membership is active, you can request an extension through customer care.",
    approved: false,
  },
  {
    id: "buy-a-book",
    question: "Can I buy a book I really like?",
    answer:
      "Yes. You can request to keep a rented book, and applicable member purchase benefits apply.",
    approved: false,
  },
  {
    id: "membership-expires",
    question: "What happens when membership expires?",
    answer:
      "You can renew your membership, or return your books under the applicable return process.",
    approved: false,
  },
  {
    id: "upgrade-plan",
    question: "Can I upgrade to another plan later?",
    answer: "Yes. You can upgrade to a higher plan on RentReadBuy.",
    approved: false,
  },
];
