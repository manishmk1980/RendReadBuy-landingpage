/**
 * Campaign-controlled content for the Silver membership acquisition campaign.
 *
 * `silverProposition` is locked business wording. Do not edit it without
 * explicit approval from RentReadBuy.
 */

export const campaignMeta = {
  name: "RentReadBuy Silver Membership Campaign",
  /**
   * Production origin of this page. Deliberately no default: until RentReadBuy
   * confirms the hostname, every absolute URL (canonical, og:url, og:image,
   * sitemap, JSON-LD url) is omitted rather than pointing at a guessed host.
   */
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL?.trim() || null,
  title: "Book Rental Membership in India | Silver ₹899 | RentReadBuy",
  description:
    "Rent physical books with RentReadBuy Silver. ₹899 for 3 months, up to 2 books at a time, no extra rental, delivery or return pickup charges.",
  socialTitle: "Keep your reading going with RentReadBuy Silver",
  socialDescription:
    "₹899 for 3 months. Up to 2 physical books at a time, with no extra rental, delivery or return pickup charges during your membership.",
  socialImage: {
    src: "/assets/social/silver-membership-og.jpg",
    width: 1200,
    height: 630,
    alt: "RentReadBuy Silver: Keep your reading going. ₹899 for 3 months, up to 2 books at a time.",
  },
  /** Plain-language summary of the approved rules, for structured data. */
  serviceDescription:
    "A physical book rental membership. ₹899 for 3 months: rent up to 2 books at a time, with no additional rental/product charge, no delivery charge and no return pickup charge during an active membership, and no fixed total rental-book quota. After requesting a return, members can choose their next books straight away. The standard rental period is up to 60 days.",
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
    body: "Silver is RentReadBuy’s physical book rental membership: keep reading without individual rental charges.",
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
    eyebrow: "Silver value & benefits",
    /** First line in ink, second in brand teal with the coral underline. */
    headlineLines: ["One membership.", "No extra charges."],
    body: "₹899 for 3 months covers your book rentals, delivery and return pickups while your membership is active.",
    /**
     * Approved Silver benefits. The quota line applies only during an active
     * membership and does not override the 2-books-at-a-time limit.
     * `lines` are the visual line breaks under the icon.
     */
    benefits: [
      { icon: "books", lines: ["Up to 2 books", "at a time"] },
      { icon: "coins", value: "₹0", lines: ["additional rental/product charge"] },
      { icon: "truck", value: "₹0", lines: ["delivery charge"] },
      { icon: "return", value: "₹0", lines: ["return pickup charge"] },
      {
        icon: "infinity",
        lines: ["No fixed total", "rental-book quota", "during active membership"],
      },
    ],
  },
  readerFit: {
    eyebrow: "Find your fit",
    /** First line in ink; the second ends in `headlineEmphasis`, set in brand teal with the coral underline. */
    headlineLines: ["Which option", "is right for you?"],
    headlineEmphasis: "right for you?",
    body: "Choose the option that matches your reading habit.",
    /** Rendered left to right; only the `recommended` path gets the filled Silver CTA. */
    paths: [
      {
        key: "occasional",
        icon: "openBook",
        title: "I read occasionally",
        body: "Rent the book you want, when you want.",
        cta: "Rent on RentReadBuy",
        link: "rentBooks",
        trackEvent: "rent_exit_click",
        recommended: false,
      },
      {
        key: "keep",
        icon: "bookmark",
        title: "I want to keep a book",
        body: "Buy it for your shelf.",
        cta: "Buy on RentReadBuy",
        link: "buyBooks",
        trackEvent: "buy_exit_click",
        recommended: false,
      },
      {
        key: "regular",
        icon: "books",
        title: "I keep moving to the next book",
        body: "Silver membership makes more sense for me.",
        cta: "Start Silver Membership",
        link: "silverMembership",
        trackEvent: "silver_cta_click",
        recommended: true,
      },
    ],
  },
  testimonials: {
    eyebrow: "Reader stories",
    /** First line in ink; the second ends in brand teal, with the coral underline under `headlineEmphasis`. */
    headlineLines: ["Loved by", "readers like you."],
    headlineEmphasis: "readers",
    body: "Real stories from RentReadBuy members.",
    /**
     * Development-only review copy for the empty card slots. Never a
     * testimonial; production omits the section until approved proof exists.
     */
    placeholder: {
      flag: "Section 6 is awaiting approved customer proof",
      tag: "Internal placeholder",
      body: "An approved reader quote will appear here.",
      attribution: "Reader name and city, once approved",
    },
  },
  gift: {
    eyebrow: "Gift a subscription",
    /** First two lines in ink; the last in brand teal with the coral underline. */
    headlineLines: ["Know someone", "who always has", "another book in mind?"],
    body: "Give them a RentReadBuy membership instead of choosing just one book for them.",
    primaryCta: "Gift a Silver Membership",
    /** Rendered left to right; `lines` are the visual line breaks under the icon. */
    benefits: [
      { icon: "choose", tint: "mint", lines: ["They choose", "the books they love."] },
      { icon: "gift", tint: "coral", lines: ["You send a", "thoughtful gift."] },
      { icon: "openBook", tint: "blue", lines: ["They enjoy months", "of reading."] },
      { icon: "gift", tint: "cream", lines: ["A simple and", "meaningful gift."] },
    ],
  },
  featuredBook: {
    eyebrow: "Featured book",
    /** First line in ink; the second ends in `headlineEmphasis`, set in brand teal with the coral underline. */
    headlineLines: ["Trending with", "readers right now."],
    headlineEmphasis: "right now.",
    body: "A popular choice among readers. Available to rent or buy on RentReadBuy.",
    /** Used when no verified price is configured; with one, `rentPriced` / `buyPriced` precede it. */
    rentCta: "Rent Book",
    buyCta: "Buy Book",
    rentPriced: "Rent",
    buyPriced: "Buy",
    cta: "View Book",
    /** Development-only marking while no approved title is configured. */
    placeholder: {
      flag: "Section 8 is awaiting an approved featured title",
      actionNote: "Destination not yet verified",
    },
  },
  readingEssentials: {
    eyebrow: "Reading essentials",
    /** First line in ink; the second ends in `headlineEmphasis`, set in brand teal with the coral underline. */
    headlineLines: ["Useful companions", "for your reading time."],
    headlineEmphasis: "your reading time.",
    body: "Make your reading time more comfortable and enjoyable with these handpicked products.",
    carouselLabel: "Reading essentials products",
    previous: "Previous products",
    next: "Next products",
    /** Prefixes the merchant name unless a product sets its own `ctaLabel`. */
    ctaPrefix: "View on",
    imageComingSoon: "Product image coming soon",
    // TODO(compliance): confirm the affiliate disclosure wording.
    /** Shown beside the products only while at least one affiliate link is live. */
    affiliateDisclosure:
      "RentReadBuy may earn a commission from qualifying purchases made through these links.",
    /** Development-only marking while no approved products are configured. */
    placeholder: {
      flag: "Section 9 is awaiting approved affiliate products",
      actionNote: "Affiliate link not yet configured",
    },
  },
  faq: {
    eyebrow: "FAQs",
    /** First line in ink; the second in brand teal with the coral underline. */
    headlineLines: ["Questions before", "you join?"],
    body: "Get the answers you need.",
  },
  finalConversion: {
    eyebrow: "Start reading with Silver",
    /** First two lines in ink; the last in brand teal with the coral underline. */
    headlineLines: ["Your next book", "doesn’t have to be", "your last this month."],
    /** The paper panel: Silver first, the general RentReadBuy fallback second. */
    offer: {
      kicker: "Read regularly? Silver is for you.",
      /** First line in ink, second in brand teal. */
      headlineLines: ["Read regularly?", "Silver is for you."],
      price: silverProposition.price,
      primaryCta: "Start Silver Membership",
    },
    fallback: {
      title: "Prefer one book instead?",
      body: "Browse and rent or buy on RentReadBuy.",
      cta: "Go to RentReadBuy",
    },
  },
  consent: {
    bannerTitle: "Cookies on this page",
    bannerBody:
      "Analytics and advertising cookies are optional. Both stay off until you choose. This page saves your choice in this browser, and you can change it any time from Cookie settings in the footer.",
    acceptAll: "Accept All",
    rejectOptional: "Reject Optional",
    managePreferences: "Manage Preferences",
    dialogTitle: "Cookie settings",
    dialogBody:
      "Choose whether this page may use analytics and advertising cookies. Both stay off unless you allow them. Closing without saving leaves your saved choice unchanged.",
    analyticsLabel: "Analytics",
    analyticsHint: "Measures how this page is used.",
    advertisingLabel: "Advertising",
    advertisingHint: "Measures advertising on this page.",
    save: "Save preferences",
    close: "Close",
  },
  footer: {
    navLabel: "Legal and support",
    terms: "Terms",
    privacy: "Privacy",
    returns: "Returns Policy",
    support: "Contact / Support",
    cookieSettings: "Cookie settings",
    socialLabel: "RentReadBuy on social media",
    socialLinkPrefix: "RentReadBuy on",
    newTabNotice: "(opens in a new tab)",
    // TODO(legal): confirm legal entity name and copyright year wording.
    copyrightYear: 2026,
    copyrightHolder: "RentReadBuy",
  },
} as const;
