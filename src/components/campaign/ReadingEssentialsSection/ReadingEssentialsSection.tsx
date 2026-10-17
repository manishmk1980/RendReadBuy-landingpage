import { CampaignSection } from "@/components/shared/CampaignSection";
import { SectionEyebrow } from "@/components/shared/SectionEyebrow";
import { campaignCopy } from "@/config/campaign";
import {
  affiliateProductPlaceholders,
  affiliateProducts,
  isLiveAffiliateProduct,
} from "@/config/affiliateProducts";
import { ProductCard } from "./ProductCard";
import { ProductCarousel } from "./ProductCarousel";
import { ReadingEssentialsBackdrop } from "./ReadingEssentialsBackdrop";
import { ReadingEssentialsReveal } from "./ReadingEssentialsReveal";
import styles from "./ReadingEssentialsSection.module.css";

const BACKGROUND = "/assets/sections/reading-essentials/reading-essentials-background.webp";

/**
 * Secondary affiliate shelf. Production renders only approved products with a
 * valid affiliate URL and omits the section when there are none. Development
 * also shows incomplete records (or, with none configured, marked stand-ins)
 * with inert CTAs for layout review.
 */
export function ReadingEssentialsSection() {
  const copy = campaignCopy.readingEssentials;
  const isProduction = process.env.NODE_ENV === "production";
  const live = affiliateProducts.filter(isLiveAffiliateProduct);

  if (isProduction && live.length === 0) return null;

  const awaitingApproval = live.length === 0;
  const products = isProduction
    ? live
    : affiliateProducts.length > 0
      ? affiliateProducts
      : affiliateProductPlaceholders;

  const [lead, second] = copy.headlineLines;
  const emphasisStart = second.indexOf(copy.headlineEmphasis);
  const emphasisEnd = emphasisStart + copy.headlineEmphasis.length;

  return (
    <CampaignSection
      section="readingEssentials"
      labelledBy="reading-essentials-heading"
      className={styles.section}
    >
      <ReadingEssentialsBackdrop
        src={BACKGROUND}
        className={styles.backdrop}
        imageClassName={styles.artwork}
      />

      <div className={styles.content}>
        <ReadingEssentialsReveal className={styles.intro}>
          <SectionEyebrow className={styles.eyebrow}>
            <EyebrowMark />
            {copy.eyebrow}
          </SectionEyebrow>
          <h2 id="reading-essentials-heading" className={styles.headline}>
            <span className={styles.line}>{lead}</span>{" "}
            <span className={styles.line}>
              {second.slice(0, emphasisStart)}
              <span className={styles.emphasis}>
                {copy.headlineEmphasis}
                <HeadlineUnderline />
              </span>
              {second.slice(emphasisEnd)}
            </span>
          </h2>
          <p className={styles.body}>{copy.body}</p>
        </ReadingEssentialsReveal>

        <ReadingEssentialsReveal className={styles.shelf} threshold={0.3}>
          {awaitingApproval && (
            <p className={styles.reviewFlag} role="note">
              {copy.placeholder.flag}
            </p>
          )}
          <ProductCarousel count={products.length}>
            <ul className={styles.track} data-count={products.length}>
              {products.map((product) => (
                <li key={product.id} className={styles.slide}>
                  <ProductCard product={product} live={isLiveAffiliateProduct(product)} />
                </li>
              ))}
            </ul>
          </ProductCarousel>
        </ReadingEssentialsReveal>
      </div>
    </CampaignSection>
  );
}

function EyebrowMark() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={styles.eyebrowMark}>
      <path d="M5.5 3.5 10 8l-4.5 4.5" />
    </svg>
  );
}

function HeadlineUnderline() {
  return (
    <svg
      viewBox="0 0 240 24"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={styles.underline}
    >
      <path d="M3 11C50 6.5 120 4.5 190 5.5c20 .3 36 1.1 46 2.1 1 2 0 3.6-3 4.4-33 .4-83 1.4-133 3.4-30 1.2-64 3-92 5.2-5 .4-8-3.6-7-6.6.4-1.6 1-2.6 2-3Z" />
      <path
        d="M120 17.5c40-2.9 80-3.9 118-3.3 1 1.2 0 2.4-2 3-36 .4-76 1.6-114 3.4-3 0-4-2.6-2-3.1Z"
        opacity="0.85"
      />
    </svg>
  );
}
