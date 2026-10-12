import type { CSSProperties } from "react";
import { CampaignSection } from "@/components/shared/CampaignSection";
import { SectionEyebrow } from "@/components/shared/SectionEyebrow";
import { TornPaperTransition } from "@/components/shared/TornPaperTransition";
import { campaignCopy } from "@/config/campaign";
import { SilverCycleReveal } from "./SilverCycleReveal";
import styles from "./SilverCycleSection.module.css";

type StepIcon = (typeof campaignCopy.silverCycle.steps)[number]["icon"];

export function SilverCycleSection() {
  const copy = campaignCopy.silverCycle;
  const [lead, emphasis] = copy.headlineLines;

  return (
    <CampaignSection
      section="silverCycle"
      labelledBy="silver-cycle-heading"
      className={styles.section}
    >
      <div className={styles.backdrop} aria-hidden="true" data-deferred-art="">
        <div className={styles.artwork} />
      </div>
      <TornPaperTransition
        src="/assets/shared/hero-reader-torn-transition.png"
        width={1746}
        height={901}
        trimTop={600}
        edge="top"
        className={styles.tear}
      />

      <div className={styles.content}>
        <SilverCycleReveal className={styles.intro}>
          <SectionEyebrow className={styles.eyebrow}>
            <EyebrowMark />
            {copy.eyebrow}
          </SectionEyebrow>
          <h2 id="silver-cycle-heading" className={styles.headline}>
            <span className={styles.line}>{lead}</span>
            <span className={`${styles.line} ${styles.emphasis}`}>
              {emphasis}
              <HeadlineUnderline />
            </span>
          </h2>
          <p className={styles.body}>{copy.body}</p>
        </SilverCycleReveal>

        <SilverCycleReveal className={styles.stepsFrame} threshold={0.6}>
          <ol className={styles.steps}>
            {copy.steps.map((step, index) => (
              <li
                key={step.lines.join(" ")}
                className={styles.step}
                style={{ "--step": index } as CSSProperties}
              >
                <div className={styles.bubble}>
                  <span className={styles.ring} aria-hidden="true" />
                  <span className={styles.number} aria-hidden="true">
                    {index + 1}
                  </span>
                  <StepGlyph icon={step.icon} />
                  <span className={styles.label}>
                    {step.lines.map((line) => (
                      <span key={line} className={styles.labelLine}>
                        {line}{" "}
                      </span>
                    ))}
                  </span>
                </div>
                {index < copy.steps.length - 1 && <StepArrow />}
              </li>
            ))}
          </ol>
        </SilverCycleReveal>

        <SilverCycleReveal className={styles.reassuranceFrame} threshold={0.8}>
          <LoopArrow className={styles.loopStart} />
          <p className={styles.reassurance}>
            {copy.reassuranceLines.map((line) => (
              <span key={line} className={styles.reassuranceLine}>
                {line}{" "}
              </span>
            ))}
          </p>
          <LoopArrow className={styles.loopEnd} />
        </SilverCycleReveal>
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
      <path d="M120 17.5c40-2.9 80-3.9 118-3.3 1 1.2 0 2.4-2 3-36 .4-76 1.6-114 3.4-3 0-4-2.6-2-3.1Z" opacity="0.85" />
    </svg>
  );
}

function StepGlyph({ icon }: { icon: StepIcon }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={styles.icon}>
      {icon === "books" && (
        <>
          <rect x="9" y="8" width="30" height="9" rx="2.5" />
          <rect x="6" y="19.5" width="32" height="9" rx="2.5" />
          <rect x="9" y="31" width="30" height="9" rx="2.5" />
          <path d="M14 8v9M11 19.5v9M14 31v9" />
        </>
      )}
      {icon === "openBook" && (
        <>
          <path d="M24 14c-5-4-12-4.5-18-2v26c6-2.5 13-2 18 2 5-4 12-4.5 18-2V12c-6-2.5-13-2-18 2Z" />
          <path d="M24 14v26" />
        </>
      )}
      {icon === "parcel" && (
        <>
          <path d="M7 15 24 6l17 9v19l-17 9-17-9Z" />
          <path d="m7 15 17 9 17-9M24 24v19" />
          <path d="m15.5 10.5 17 9v6" />
        </>
      )}
    </svg>
  );
}

function StepArrow() {
  return (
    <svg viewBox="0 0 32 16" aria-hidden="true" className={styles.arrow}>
      <path d="M3 8h24M21 2.5 27 8l-6 5.5" />
    </svg>
  );
}

/** Dashed curve from the message up towards a book stack; drawn for the left side. */
function LoopArrow({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 64 40" aria-hidden="true" className={`${styles.loop} ${className}`}>
      <path className={styles.loopPath} d="M61 33C40 35 18 29 8 10" />
      <path d="M7.9 17 8 10l6 3.6" />
    </svg>
  );
}
