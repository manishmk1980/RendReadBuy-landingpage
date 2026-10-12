import { CampaignButton } from "@/components/shared/CampaignButton";
import { campaignCopy } from "@/config/campaign";
import type { AffiliateProduct } from "@/config/affiliateProducts";
import { ProductImage } from "./ProductImage";
import styles from "./ReadingEssentialsSection.module.css";

interface ProductCardProps {
  product: AffiliateProduct;
  /** Approved with a valid affiliate URL; anything else renders an inert CTA. */
  live: boolean;
}

export function ProductCard({ product, live }: ProductCardProps) {
  const copy = campaignCopy.readingEssentials;
  const titleId = `product-${product.id}`;
  const label = product.ctaLabel ?? `${copy.ctaPrefix} ${product.merchant}`;

  return (
    <article className={styles.card} aria-labelledby={titleId}>
      <ProductImage src={product.imageUrl} alt={product.imageAlt ?? product.title} />
      <div className={styles.cardBody}>
        <h3 id={titleId} className={styles.cardTitle}>
          {product.title}
        </h3>
        <p className={styles.cardText}>{product.shortDescription}</p>
        {live && product.affiliateUrl ? (
          <CampaignButton
            href={product.affiliateUrl}
            rel="sponsored"
            variant="secondary"
            trackEvent="affiliate_product_click"
            trackParams={{
              placement: "reading_essentials",
              product_id: product.id,
              merchant: product.merchant,
            }}
            className={styles.cta}
          >
            {label}
            <ArrowIcon />
          </CampaignButton>
        ) : (
          <span className={styles.cta} data-preview="true" title={copy.placeholder.actionNote}>
            {label}
            <ArrowIcon />
            <span className="visually-hidden">. {copy.placeholder.actionNote}</span>
          </span>
        )}
      </div>
    </article>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.ctaArrow}>
      <path d="M4.5 12h14.2M13.4 6.4 19 12l-5.6 5.6" />
    </svg>
  );
}
