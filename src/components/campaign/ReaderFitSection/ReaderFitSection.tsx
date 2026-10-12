import type { CSSProperties } from "react";
import { CampaignButton } from "@/components/shared/CampaignButton";
import { CampaignSection } from "@/components/shared/CampaignSection";
import { SectionEyebrow } from "@/components/shared/SectionEyebrow";
import { campaignCopy } from "@/config/campaign";
import { ReaderFitBackdrop } from "./ReaderFitBackdrop";
import { ReaderFitReveal } from "./ReaderFitReveal";
import styles from "./ReaderFitSection.module.css";

type PathIconName = (typeof campaignCopy.readerFit.paths)[number]["icon"];

export function ReaderFitSection() {
  const copy = campaignCopy.readerFit;
  const [lead, second] = copy.headlineLines;
  const secondLead = second.slice(0, second.indexOf(copy.headlineEmphasis));

  return (
    <CampaignSection section="readerFit" labelledBy="reader-fit-heading" className={styles.section}>
      <ReaderFitBackdrop className={styles.backdrop} imageClassName={styles.artwork} />

      <div className={styles.content}>
        <ReaderFitReveal className={styles.intro}>
          <SectionEyebrow className={styles.eyebrow}>
            <EyebrowMark />
            {copy.eyebrow}
          </SectionEyebrow>
          <h2 id="reader-fit-heading" className={styles.headline}>
            <span className={styles.line}>{lead}</span>
            <span className={styles.line}>
              {secondLead}
              <span className={styles.emphasis}>
                {copy.headlineEmphasis}
                <HeadlineUnderline />
              </span>
            </span>
          </h2>
          <p className={styles.body}>{copy.body}</p>
        </ReaderFitReveal>

        <ReaderFitReveal className={styles.cardsFrame} threshold={0.3}>
          <ul className={styles.cards}>
            {copy.paths.map((path, index) => (
              <li
                key={path.key}
                className={styles.card}
                data-recommended={path.recommended}
                style={{ "--card": index } as CSSProperties}
              >
                <PathGlyph icon={path.icon} />
                <h3 className={styles.cardTitle}>
                  {path.title}
                  <TitleSwash />
                </h3>
                <p className={styles.cardBody}>{path.body}</p>
                <CampaignButton
                  link={path.link}
                  variant={path.recommended ? "primary" : "secondary"}
                  trackEvent={path.trackEvent}
                  trackParams={{ placement: "reader_fit", path: path.key }}
                  className={styles.cta}
                >
                  {path.cta}
                  <ArrowIcon />
                </CampaignButton>
              </li>
            ))}
          </ul>
        </ReaderFitReveal>
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

function TitleSwash() {
  return (
    <svg viewBox="0 0 120 10" preserveAspectRatio="none" aria-hidden="true" className={styles.swash}>
      <path d="M2 6.4C30 3.6 62 2.6 96 3.2c8 .2 15 .6 21 1.2.9 1 .4 2-1.2 2.4-30-.2-68 .6-112 2.6-2 .1-3.2-2.3-1.8-3Z" />
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

/** Ink line icon flanked by small coral accent ticks, as in the approved creative. */
function PathGlyph({ icon }: { icon: PathIconName }) {
  return (
    <span className={styles.iconWrap}>
      <svg viewBox="0 0 72 48" aria-hidden="true" className={styles.icon}>
        <g className={styles.ticks}>
          <path d="M8 16.5 12.5 19M6.5 24h5M8 31.5l4.5-2.5" />
          <path d="M64 16.5 59.5 19M65.5 24h-5M64 31.5l-4.5-2.5" />
        </g>
        {icon === "openBook" && (
          <>
            <path d="M36 14.2c-4.4-3.2-10.3-4.4-17.6-4.2v26.6c7.3-.2 13.2 1 17.6 4.2 4.4-3.2 10.3-4.4 17.6-4.2V10c-7.3-.2-13.2 1-17.6 4.2Z" />
            <path d="M36 14.2v26.6" />
          </>
        )}
        {icon === "bookmark" && <path d="M26.5 8.5h19v31.5L36 32.4l-9.5 7.6Z" />}
        {icon === "books" && (
          <>
            <rect x="22" y="8.5" width="28" height="8.4" rx="3.2" />
            <rect x="20" y="19.8" width="32" height="8.4" rx="3.2" />
            <rect x="22" y="31.1" width="28" height="8.4" rx="3.2" />
            <path d="M27 12.7h18M25 24h22M27 35.3h18" />
          </>
        )}
      </svg>
    </span>
  );
}
