import { brand } from "@/config/brand";
import { campaignMeta, silverProposition } from "@/config/campaign";
import type { FAQ } from "@/config/faqs";
import { links, RRB_BASE_URL, socialProfiles } from "@/config/links";

/**
 * Schema.org graph for the campaign page, built only from verified config so
 * it always matches the visible copy. Deliberately absent: ratings, reviews,
 * availability, delivery area and any Offer URL while the checkout link is
 * unconfirmed.
 */
export function buildStructuredData(faqs: readonly FAQ[]) {
  const { siteUrl } = campaignMeta;
  const rrbHome = new URL("/", RRB_BASE_URL).toString();
  const pageUrl = siteUrl ? new URL("/", siteUrl).toString() : undefined;
  const organizationId = `${rrbHome}#organization`;
  const serviceId = `${rrbHome}#silver-membership`;
  const { price } = silverProposition;

  const organization = {
    "@type": "Organization",
    "@id": organizationId,
    name: brand.name,
    url: rrbHome,
    ...(siteUrl && brand.logo && { logo: new URL(brand.logo.src, siteUrl).toString() }),
    sameAs: socialProfiles.filter((profile) => profile.confirmed).map((profile) => profile.href),
  };

  const service = {
    "@type": "Service",
    "@id": serviceId,
    name: "RentReadBuy Silver Membership",
    serviceType: "Physical book rental membership",
    description: campaignMeta.serviceDescription,
    provider: { "@id": organizationId },
    offers: {
      "@type": "Offer",
      name: `${silverProposition.planName} membership, 3 months`,
      price: price.amount,
      priceCurrency: price.currency,
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: price.amount,
        priceCurrency: price.currency,
        referenceQuantity: { "@type": "QuantitativeValue", value: 3, unitCode: "MON" },
      },
      ...(links.silverMembership.confirmed && { url: links.silverMembership.href }),
    },
  };

  const webPage = {
    "@type": "WebPage",
    ...(pageUrl && { "@id": `${pageUrl}#webpage`, url: pageUrl }),
    name: campaignMeta.title,
    description: campaignMeta.description,
    inLanguage: "en-IN",
    about: { "@id": serviceId },
    publisher: { "@id": organizationId },
    ...(siteUrl && {
      primaryImageOfPage: {
        "@type": "ImageObject",
        url: new URL(campaignMeta.socialImage.src, siteUrl).toString(),
        width: campaignMeta.socialImage.width,
        height: campaignMeta.socialImage.height,
      },
    }),
  };

  const faqPage =
    faqs.length > 0
      ? {
          "@type": "FAQPage",
          ...(pageUrl && { "@id": `${pageUrl}#faqs`, url: pageUrl }),
          inLanguage: "en-IN",
          mainEntity: faqs.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: { "@type": "Answer", text: faq.answer },
          })),
        }
      : null;

  return {
    "@context": "https://schema.org",
    "@graph": [organization, service, webPage, ...(faqPage ? [faqPage] : [])],
  };
}

/** JSON for a `<script type="application/ld+json">`; `<` is escaped so content can't close the tag. */
export function serializeJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
