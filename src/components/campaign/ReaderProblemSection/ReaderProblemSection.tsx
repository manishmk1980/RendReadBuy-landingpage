import { CampaignSection } from "@/components/shared/CampaignSection";
import { SectionEyebrow } from "@/components/shared/SectionEyebrow";
import { TornPaperTransition } from "@/components/shared/TornPaperTransition";
import { campaignCopy } from "@/config/campaign";
import { ReaderProblemBackdrop } from "./ReaderProblemBackdrop";
import { ReaderProblemReveal } from "./ReaderProblemReveal";
import styles from "./ReaderProblemSection.module.css";

export function ReaderProblemSection() {
  const copy = campaignCopy.readerProblem;
  const leadLines = copy.headlineLines.slice(0, -1);
  const emphasis = copy.headlineLines[copy.headlineLines.length - 1];

  return (
    <CampaignSection
      section="readerProblem"
      labelledBy="reader-problem-heading"
      className={styles.section}
    >
      <ReaderProblemBackdrop className={styles.backdrop} imageClassName={styles.artwork} />
      <TornPaperTransition
        src="/assets/shared/hero-reader-torn-transition.png"
        width={1746}
        height={901}
        trimTop={600}
        edge="top"
        className={styles.tear}
      />

      <div className={styles.content}>
        <ReaderProblemReveal className={styles.copy}>
          <SectionEyebrow className={styles.eyebrow}>
            <EyebrowMark />
            {copy.eyebrow}
          </SectionEyebrow>
          <h2 id="reader-problem-heading" className={styles.headline}>
            {leadLines.map((line) => (
              <span key={line} className={styles.line}>
                {line}
              </span>
            ))}
            <span className={`${styles.line} ${styles.emphasis}`}>
              {emphasis}
              <HeadlineUnderline />
            </span>
          </h2>
          <p className={styles.body}>{copy.body}</p>
        </ReaderProblemReveal>
      </div>
    </CampaignSection>
  );
}

function EyebrowMark() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={styles.eyebrowMark}>
      <path d="M2.5 3.5c3.2 2.4 6.6 5.6 10.6 9.6M12.8 3.2C9.6 6 6.6 9.4 3.4 13.2" />
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
      <path d="M120 17.5c40-2.9 80-3.9 118-3.3 1 1.2 0 2.4-2 3-36 .4-76 1.6-114 3.4-3 0-4-2.6-2-3.1Z" opacity="0.85" />
    </svg>
  );
}
