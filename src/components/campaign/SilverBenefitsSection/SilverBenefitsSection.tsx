import type { CSSProperties } from "react";
import { CampaignSection } from "@/components/shared/CampaignSection";
import { SectionEyebrow } from "@/components/shared/SectionEyebrow";
import { TornPaperTransition } from "@/components/shared/TornPaperTransition";
import { campaignCopy } from "@/config/campaign";
import { SilverBenefitsBackdrop } from "./SilverBenefitsBackdrop";
import { SilverBenefitsReveal } from "./SilverBenefitsReveal";
import styles from "./SilverBenefitsSection.module.css";

type Benefit = (typeof campaignCopy.silverBenefits.benefits)[number];
type BenefitIconName = Benefit["icon"];

export function SilverBenefitsSection() {
  const copy = campaignCopy.silverBenefits;
  const [lead, emphasis] = copy.headlineLines;

  return (
    <CampaignSection
      section="silverBenefits"
      labelledBy="silver-benefits-heading"
      className={styles.section}
    >
      <SilverBenefitsBackdrop className={styles.backdrop} imageClassName={styles.artwork} />
      <TornPaperTransition
        src="/assets/shared/hero-reader-torn-transition.png"
        width={1746}
        height={901}
        trimTop={600}
        edge="top"
        className={styles.tear}
      />

      <div className={styles.content}>
        <SilverBenefitsReveal className={styles.intro}>
          <SectionEyebrow className={styles.eyebrow}>{copy.eyebrow}</SectionEyebrow>
          <h2 id="silver-benefits-heading" className={styles.headline}>
            <span className={styles.line}>{lead}</span>
            <span className={`${styles.line} ${styles.emphasis}`}>
              {emphasis}
              <HeadlineUnderline />
            </span>
          </h2>
          <p className={styles.body}>{copy.body}</p>
        </SilverBenefitsReveal>

        <SilverBenefitsReveal className={styles.benefitsFrame} threshold={0.55}>
          <ul className={styles.benefits}>
            {copy.benefits.map((benefit, index) => (
              <li
                key={benefit.icon}
                className={styles.benefit}
                style={{ "--benefit": index } as CSSProperties}
              >
                <BenefitGlyph icon={benefit.icon} />
                <p className={styles.label}>
                  {"value" in benefit && benefit.value ? (
                    <span className={styles.value}>{benefit.value}</span>
                  ) : null}
                  {benefit.lines.map((line, lineIndex) => (
                    <span
                      key={line}
                      className={lineClass(benefit.icon, lineIndex, "value" in benefit)}
                    >
                      {line}
                    </span>
                  ))}
                </p>
              </li>
            ))}
          </ul>
        </SilverBenefitsReveal>
      </div>
    </CampaignSection>
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

function lineClass(icon: BenefitIconName, lineIndex: number, hasValue: boolean) {
  if (hasValue) return styles.detail;
  if (icon === "infinity" && lineIndex === 0) return `${styles.lead} ${styles.leadEmphasis}`;
  if (lineIndex === 0) return styles.lead;
  return styles.detail;
}

function BenefitGlyph({ icon }: { icon: BenefitIconName }) {
  return (
    <span className={styles.iconWrap}>
      <svg viewBox="0 0 48 48" aria-hidden="true" className={styles.icon}>
        {icon === "books" && (
          <>
            <rect x="12" y="8" width="24" height="8" rx="1.7" />
            <rect x="8.5" y="19" width="31" height="8" rx="1.7" />
            <rect x="12" y="30" width="24" height="8" rx="1.7" />
            <path d="M16.5 8v8M13 19v8M16.5 30v8" />
          </>
        )}
        {icon === "coins" && (
          <>
            <ellipse cx="24" cy="13.2" rx="10.2" ry="3.5" />
            <path d="M13.8 13.2v5.2c0 1.9 4.6 3.5 10.2 3.5s10.2-1.6 10.2-3.5v-5.2" />
            <path d="M13.8 16.2c0 1.9 4.6 3.5 10.2 3.5s10.2-1.6 10.2-3.5" />
            <circle cx="24" cy="32.2" r="9" />
            <path d="M19.4 28.6h8.4M19.4 31.3h8.4M19.4 28.6v3.1c2.9.2 5.2 1.4 5.2 3.5 0 2.3-2.5 3.7-6 4.8" />
          </>
        )}
        {icon === "truck" && (
          <>
            <path d="M5.5 30.5V18.2h15.8v12.3" />
            <path d="M21.3 22.4h7.4l7.3 6.1v2H21.3" />
            <circle cx="12.2" cy="33.4" r="3" />
            <circle cx="31.2" cy="33.4" r="3" />
            <path d="M15.2 33.4h13" />
          </>
        )}
        {icon === "return" && (
          <>
            <path d="M17.2 16.6A10.2 10.2 0 0 1 32.4 18" />
            <path d="M28.2 12.4 32.6 18l-5.8 1.6" />
            <path d="M30.8 31.4A10.2 10.2 0 0 1 15.6 30" />
            <path d="M19.8 35.6 15.4 30l5.8-1.6" />
          </>
        )}
        {icon === "infinity" && (
          <path d="M8 24c0-6.2 4.7-10 9.2-10 3.8 0 6.2 2.6 6.8 10 .6-7.4 3-10 6.8-10 4.5 0 9.2 3.8 9.2 10s-4.7 10-9.2 10c-3.8 0-6.2-2.6-6.8-10-.6 7.4-3 10-6.8 10C12.7 34 8 30.2 8 24Z" />
        )}
      </svg>
    </span>
  );
}
