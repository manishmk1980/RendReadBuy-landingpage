import { CampaignSection } from "@/components/shared/CampaignSection";
import { SectionEyebrow } from "@/components/shared/SectionEyebrow";
import { campaignCopy } from "@/config/campaign";
import { publishedFaqs } from "@/config/faqs";
import { FAQAccordion } from "./FAQAccordion";
import { FAQBackdrop } from "./FAQBackdrop";
import { FAQReveal } from "./FAQReveal";
import styles from "./FAQSection.module.css";

const BACKGROUND = "/assets/sections/faq/faq-background.webp";

/**
 * Purchase-objection FAQs over a reading-scene artwork. Production publishes
 * only approved answers and omits the section if there are none.
 */
export function FAQSection() {
  const copy = campaignCopy.faq;
  const items = publishedFaqs;

  if (items.length === 0) return null;

  const [lead, second] = copy.headlineLines;

  return (
    <CampaignSection section="faq" labelledBy="faq-heading" className={styles.section}>
      <FAQBackdrop src={BACKGROUND} className={styles.backdrop} imageClassName={styles.artwork} />

      <div className={styles.content}>
        <FAQReveal className={styles.intro}>
          <SectionEyebrow className={styles.eyebrow}>
            <EyebrowMark />
            {copy.eyebrow}
          </SectionEyebrow>
          <h2 id="faq-heading" className={styles.headline}>
            <span className={styles.line}>{lead}</span>{" "}
            <span className={styles.line}>
              <span className={styles.emphasis}>
                {second}
                <HeadlineUnderline />
              </span>
            </span>
          </h2>
          <p className={styles.body}>{copy.body}</p>
        </FAQReveal>

        <FAQReveal className={styles.faqFrame} threshold={0.3}>
          <FAQAccordion items={items} />
        </FAQReveal>
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
