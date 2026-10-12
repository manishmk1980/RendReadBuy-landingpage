import { CampaignButton } from "@/components/shared/CampaignButton";
import { CampaignSection } from "@/components/shared/CampaignSection";
import { SectionEyebrow } from "@/components/shared/SectionEyebrow";
import { campaignCopy } from "@/config/campaign";
import { FinalConversionBackdrop } from "./FinalConversionBackdrop";
import { FinalConversionReveal } from "./FinalConversionReveal";
import styles from "./FinalConversionSection.module.css";

const BACKGROUND = "/assets/sections/final-conversion/final-conversion-background.webp";

/**
 * The closing decision. Silver is the only filled action; the general
 * RentReadBuy hand-off is a quieter text link beside it.
 */
export function FinalConversionSection() {
  const copy = campaignCopy.finalConversion;
  const { offer, fallback } = copy;
  const [first, second, emphasis] = copy.headlineLines;
  const [offerLead, offerEmphasis] = offer.headlineLines;

  return (
    <CampaignSection
      section="finalConversion"
      labelledBy="final-conversion-heading"
      className={styles.section}
    >
      <FinalConversionBackdrop
        src={BACKGROUND}
        className={styles.backdrop}
        imageClassName={styles.artwork}
      />

      <div className={styles.content}>
        <FinalConversionReveal className={styles.intro}>
          <SectionEyebrow className={styles.eyebrow}>
            <EyebrowMark />
            {copy.eyebrow}
          </SectionEyebrow>
          <h2 id="final-conversion-heading" className={styles.headline}>
            <span className={styles.line}>{first}</span>{" "}
            <span className={styles.line}>{second}</span>{" "}
            <span className={`${styles.line} ${styles.emphasis}`}>
              {emphasis}
              <HeadlineUnderline />
            </span>
          </h2>
        </FinalConversionReveal>

        <FinalConversionReveal className={styles.panelFrame} threshold={0.35}>
          <div className={styles.panel}>
            <div className={styles.offer}>
              <div className={styles.offerHead}>
                {/* Repeats the heading verbatim, so assistive tech skips it. */}
                <p className={styles.kicker} aria-hidden="true">
                  {offer.kicker}
                </p>
                <h3 className={styles.offerHeadline}>
                  <span className={styles.offerLine}>{offerLead}</span>{" "}
                  <span className={`${styles.offerLine} ${styles.offerEmphasis}`}>
                    {offerEmphasis}
                  </span>
                </h3>
                <p className={styles.price}>
                  <strong className={styles.amount}>
                    {offer.price.display}
                    <PriceCircle />
                  </strong>{" "}
                  {offer.price.term}
                </p>
              </div>
              <div className={styles.actions}>
                <CampaignButton
                  link="silverMembership"
                  trackEvent="silver_cta_click"
                  trackParams={{ placement: "final_conversion" }}
                  cue="reveal"
                  className={styles.cta}
                >
                  {offer.primaryCta}
                  <ArrowIcon />
                </CampaignButton>
              </div>
            </div>

            <div className={styles.fallback}>
              <span className={styles.fallbackIcon}>
                <AccentRays />
                <OpenBookIcon />
              </span>
              <h3 className={styles.fallbackTitle}>{fallback.title}</h3>
              <p className={styles.fallbackBody}>{fallback.body}</p>
              <CampaignButton
                link="home"
                variant="text"
                trackEvent="rentreadbuy_exit_click"
                trackParams={{ placement: "final_conversion", destination: "home" }}
                className={styles.fallbackLink}
              >
                {fallback.cta}
                <ArrowIcon />
              </CampaignButton>
            </div>
          </div>
        </FinalConversionReveal>
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

/** Hand-drawn coral loop around the price, in the hero's brush-mark language. */
function PriceCircle() {
  return (
    <svg viewBox="0 0 120 56" preserveAspectRatio="none" aria-hidden="true" className={styles.priceCircle}>
      <path
        pathLength={1}
        d="M70 6.5C46 3 14 9 6.5 24 0 37 22 50.5 58 50.5c34 0 57-9 56-24C113.5 12 88 4.5 62 5.5 50 6 40 8 33 11"
      />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.arrow}>
      <path d="M4.5 12h14.2M13.4 6.4 19 12l-5.6 5.6" />
    </svg>
  );
}

/** Short hand-drawn coral strokes radiating from either side of the icon. */
function AccentRays() {
  return (
    <svg viewBox="0 0 64 32" aria-hidden="true" className={styles.rays}>
      <path d="M8 6.5 3.5 3M6 16H1M8 25.5 3.5 29M56 6.5 60.5 3M58 16h5M56 25.5l4.5 3.5" />
    </svg>
  );
}

function OpenBookIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={styles.bookIcon}>
      <path d="M16 9.6c-2.9-2.1-6.8-2.9-11.6-2.8v16.6c4.8-.1 8.7.7 11.6 2.8 2.9-2.1 6.8-2.9 11.6-2.8V6.8c-4.8-.1-8.7.7-11.6 2.8Z" />
      <path d="M16 9.6v16.6" />
    </svg>
  );
}
