/**
 * Campaign-controlled content for the Silver membership acquisition campaign.
 *
 * `silverProposition` is locked business wording. Do not edit it without
 * explicit approval from RentReadBuy.
 */

export const campaignMeta = {
  name: "RentReadBuy Silver Membership Campaign",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://join.rentreadbuy.com",
  title: "RentReadBuy Silver Membership | Pay once. Keep reading.",
  description:
    "RentReadBuy Silver: ₹899 for 3 months. Up to 2 books at a time with no additional rental charge, no delivery charge and no return pickup charge.",
  locale: "en_IN",
} as const;

export const silverProposition = {
  coreLine: "Pay once. Keep reading.",
  planName: "Silver",
  price: {
    amount: 899,
    currency: "INR",
    display: "₹899",
    term: "for 3 months",
  },
  mechanics: [
    "Up to 2 books at a time",
    "No additional rental/product charge",
    "No delivery charge",
    "No return pickup charge",
    "No fixed total rental-book quota during active membership",
  ],
  cycle: [
    "Choose up to 2 books",
    "Read",
    "Request return",
    "Choose next books",
    "Repeat",
  ],
  nextBooksReassurance:
    "You can choose your next books without waiting for your returned books to reach RRB.",
} as const;

/**
 * Locked page architecture. Order here is the order rendered by `page.tsx`.
 * `id` doubles as the in-page anchor (e.g. the hero's "See how it works" cue).
 */
export const campaignSections = [
  { key: "hero", id: "hero", label: "Keep your reading going" },
  { key: "readerProblem", id: "reader-problem", label: "The reader problem" },
  { key: "silverCycle", id: "how-silver-works", label: "How Silver works" },
  { key: "silverBenefits", id: "silver-benefits", label: "Silver value and benefits" },
  { key: "readerFit", id: "reader-fit", label: "Is Silver right for you" },
  { key: "testimonials", id: "reader-proof", label: "What readers say" },
  { key: "gift", id: "gift-silver", label: "Gift a Silver membership" },
  { key: "featuredBook", id: "featured-book", label: "Featured book" },
  { key: "readingEssentials", id: "reading-essentials", label: "Reading essentials" },
  { key: "faq", id: "faqs", label: "Frequently asked questions" },
  { key: "finalConversion", id: "start-silver", label: "Start Silver membership" },
] as const;

export type CampaignSectionKey = (typeof campaignSections)[number]["key"];

export function getSection(key: CampaignSectionKey) {
  const section = campaignSections.find((s) => s.key === key);
  if (!section) throw new Error(`Unknown campaign section: ${key}`);
  return section;
}

/**
 * Section copy. The hero is the approved hero creative. Later sections keep
 * their architecture placeholders until those sections are implemented.
 * TODO(content): verify each later section against its approved creative when
 * that section's implementation instructions arrive.
 */
export const campaignCopy = {
  header: {
    memberPrompt: "Already a member?",
    signIn: "Sign in",
  },
  hero: {
    eyebrow: "For regular readers",
    headline: "Keep your reading going.",
    /** Word in `headline` set in brand teal with the coral underline. */
    headlineEmphasis: "reading",
    subheadline: "One membership. Your next book keeps coming.",
    body: "Choose up to 2 books at a time. When you're done, request a return and pick your next books right away.",
    accent: silverProposition.coreLine,
    benefits: [
      "Up to 2 books at a time",
      "No additional rental charge",
      "No delivery charge",
      "No return pickup charge",
    ],
    primaryCta: "Start Silver Membership",
    reassurance: silverProposition.mechanics[4],
    giftCta: "Gift a reading membership",
  },
  readerProblem: {
    eyebrow: "Sound familiar?",
    /** Rendered one per line; the last line is the teal, underlined emphasis. */
    headlineLines: ["You finish one book.", "And the next is", "already calling."],
    body: "When reading is a regular part of your life, finding and paying for each book separately can be time consuming and costly. There is a simpler way to keep your reading going.",
  },
  silverCycle: {
    eyebrow: "How Silver works",
    /** First line in ink, second in brand teal with the coral underline. */
    headlineLines: ["A simple cycle.", "Keep reading."],
    body: "With Silver, you can keep your reading going under one membership, without individual rental charges.",
    /** `lines` are the visual line breaks inside each step bubble. */
    steps: [
      { icon: "books", lines: ["Choose up to", "2 books at a time"] },
      { icon: "openBook", lines: ["Read", "at your pace"] },
      { icon: "parcel", lines: ["Request return", "when done"] },
      { icon: "books", lines: ["Choose your", "next books", "and keep reading"] },
    ],
    /** One sentence; the two entries are its visual line breaks. */
    reassuranceLines: [
      "You can choose your next books",
      "without waiting for your returned books to reach us.",
    ],
  },
  silverBenefits: {
    headline: "One membership. No extra charges.",
  },
  readerFit: {
    paths: [
      {
        key: "occasional",
        title: "I read occasionally",
        body: "Rent the book you want, when you want.",
        cta: "Rent on RentReadBuy",
        link: "rentBooks",
        recommended: false,
      },
      {
        key: "keep",
        title: "I want to keep a book",
        body: "Buy it for your shelf.",
        cta: "Buy on RentReadBuy",
        link: "buyBooks",
        recommended: false,
      },
      {
        key: "regular",
        title: "I keep moving to the next book",
        body: "Silver Membership may make more sense for this reading behaviour.",
        cta: "Start Silver Membership",
        link: "silverMembership",
        recommended: true,
      },
    ],
  },
  gift: {
    body: "You don't need to choose one book for them. Gift a RentReadBuy membership and let them choose the books they want to read.",
    primaryCta: "Gift a Silver Membership",
  },
  featuredBook: {
    cta: "View Book",
  },
  readingEssentials: {
    // TODO(compliance): supply the approved affiliate disclosure wording.
    affiliateDisclosure: "",
  },
  finalConversion: {
    headline: "Read regularly? Silver is for you.",
    primaryCta: "Start Silver Membership",
    rentCta: "Rent on RentReadBuy",
    buyCta: "Buy on RentReadBuy",
  },
  footer: {
    terms: "Terms",
    privacy: "Privacy",
    returns: "Returns Policy",
    support: "Contact / Support",
    // TODO(legal): confirm legal entity name and copyright year wording.
    copyrightHolder: "RentReadBuy",
  },
} as const;
