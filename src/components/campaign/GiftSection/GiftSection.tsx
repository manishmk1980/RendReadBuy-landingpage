import type { CSSProperties } from "react";
import { CampaignButton } from "@/components/shared/CampaignButton";
import { CampaignSection } from "@/components/shared/CampaignSection";
import { SectionEyebrow } from "@/components/shared/SectionEyebrow";
import { campaignCopy } from "@/config/campaign";
import { GiftBackdrop } from "./GiftBackdrop";
import { GiftReveal } from "./GiftReveal";
import styles from "./GiftSection.module.css";

type BenefitIconName = (typeof campaignCopy.gift.benefits)[number]["icon"];

/**
 * Gift proposition. The only action is the hand-off to RentReadBuy's own
 * gift flow; the benefit row is illustration, not a plan comparison.
 */
export function GiftSection() {
  const copy = campaignCopy.gift;
  const [first, second, emphasis] = copy.headlineLines;

  return (
    <CampaignSection section="gift" labelledBy="gift-heading" className={styles.section}>
      <GiftBackdrop className={styles.backdrop} imageClassName={styles.artwork} />

      <div className={styles.content}>
        <GiftReveal className={styles.intro}>
          <SectionEyebrow className={styles.eyebrow}>
            <EyebrowMark />
            {copy.eyebrow}
          </SectionEyebrow>
          <h2 id="gift-heading" className={styles.headline}>
            <span className={styles.line}>{first}</span>{" "}
            <span className={styles.line}>{second}</span>{" "}
            <span className={`${styles.line} ${styles.emphasis}`}>
              {emphasis}
              <HeadlineUnderline />
            </span>
          </h2>
          <p className={styles.body}>{copy.body}</p>
          <div className={styles.actions}>
            <CampaignButton
              link="giftSilver"
              trackEvent="gift_membership_click"
              trackParams={{ placement: "gift_section" }}
              cue="reveal"
              className={styles.cta}
            >
              {copy.primaryCta}
              <ArrowIcon />
            </CampaignButton>
          </div>
        </GiftReveal>

        <GiftReveal className={styles.benefitsFrame} threshold={0.6}>
          <ul className={styles.benefits}>
            {copy.benefits.map((benefit, index) => (
              <li
                key={index}
                className={styles.benefit}
                data-tint={benefit.tint}
                style={{ "--benefit": index } as CSSProperties}
              >
                <span className={styles.bubble}>
                  <AccentTicks />
                  <BenefitGlyph icon={benefit.icon} />
                </span>
                <p className={styles.label}>
                  {benefit.lines.map((line) => (
                    <span key={line} className={styles.labelLine}>
                      {line}
                    </span>
                  ))}
                </p>
              </li>
            ))}
          </ul>
        </GiftReveal>
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

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.arrow}>
      <path d="M4.5 12h14.2M13.4 6.4 19 12l-5.6 5.6" />
    </svg>
  );
}

/** Small hand-drawn coral strokes off each bubble's upper-left edge. */
function AccentTicks() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={styles.ticks}>
      <path d="M5 2.5 7.6 7.2M1.5 8.6l4.4 1.6" />
    </svg>
  );
}

function BenefitGlyph({ icon }: { icon: BenefitIconName }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={styles.glyph}>
      {icon === "choose" && (
        <>
          <rect x="5" y="9" width="5.5" height="17" rx="1" />
          <rect x="11.5" y="6.5" width="5.5" height="19.5" rx="1" />
          <path d="m19.6 9.6 5.2-1.4 4.5 16.8-5.2 1.4Z" />
          <path d="M3.5 26h25M7.75 13v4M14.25 11v4" />
        </>
      )}
      {icon === "gift" && (
        <>
          <rect x="5" y="12" width="22" height="5.5" rx="1" />
          <path d="M7 17.5V27h18v-9.5M16 12v15" />
          <path d="M16 12c-1.6-3.6-5.6-5.6-7-3.6-1.3 1.9 2 3.6 7 3.6Zm0 0c1.6-3.6 5.6-5.6 7-3.6 1.3 1.9-2 3.6-7 3.6Z" />
        </>
      )}
      {icon === "openBook" && (
        <>
          <path d="M16 9.6c-2.9-2.1-6.8-2.9-11.6-2.8v16.6c4.8-.1 8.7.7 11.6 2.8 2.9-2.1 6.8-2.9 11.6-2.8V6.8c-4.8-.1-8.7.7-11.6 2.8Z" />
          <path d="M16 9.6v16.6M7.5 11.5c2 0 3.7.4 5.3 1.1M7.5 15.5c2 0 3.7.4 5.3 1.1M24.5 11.5c-2 0-3.7.4-5.3 1.1M24.5 15.5c-2 0-3.7.4-5.3 1.1" />
        </>
      )}
    </svg>
  );
}
