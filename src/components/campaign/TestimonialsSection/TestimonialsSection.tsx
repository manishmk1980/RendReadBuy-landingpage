import type { CSSProperties } from "react";
import Image from "next/image";
import { CampaignSection } from "@/components/shared/CampaignSection";
import { SectionEyebrow } from "@/components/shared/SectionEyebrow";
import { campaignCopy } from "@/config/campaign";
import {
  testimonialPlaceholderSlots,
  testimonials,
  type Testimonial,
  type TestimonialGlyph,
} from "@/config/testimonials";
import { TestimonialsBackdrop } from "./TestimonialsBackdrop";
import { TestimonialsReveal } from "./TestimonialsReveal";
import styles from "./TestimonialsSection.module.css";

const MAX_CARDS = 3;
const PLACEHOLDER_GLYPHS: readonly TestimonialGlyph[] = ["openBook", "openBook", "notebook"];

/**
 * Reader proof. Renders only approved testimonials from config; with none,
 * development shows clearly marked empty slots for layout review and
 * production omits the section rather than publish an unsupported claim.
 */
export function TestimonialsSection() {
  const copy = campaignCopy.testimonials;
  const approved = testimonials.slice(0, MAX_CARDS);
  const awaitingProof = approved.length === 0;

  if (awaitingProof && process.env.NODE_ENV === "production") return null;

  const cardCount = awaitingProof ? testimonialPlaceholderSlots : approved.length;
  const [lead, second] = copy.headlineLines;
  const emphasisEnd = second.indexOf(copy.headlineEmphasis) + copy.headlineEmphasis.length;

  return (
    <CampaignSection section="testimonials" labelledBy="reader-proof-heading" className={styles.section}>
      <TestimonialsBackdrop className={styles.backdrop} imageClassName={styles.artwork} />

      <div className={styles.content}>
        <TestimonialsReveal className={styles.intro}>
          <SectionEyebrow className={styles.eyebrow}>
            <EyebrowMark />
            {copy.eyebrow}
          </SectionEyebrow>
          <h2 id="reader-proof-heading" className={styles.headline}>
            <span className={styles.line}>{lead}</span>{" "}
            <span className={`${styles.line} ${styles.lineEmphasis}`}>
              {second.slice(0, second.indexOf(copy.headlineEmphasis))}
              <span className={styles.emphasis}>
                {copy.headlineEmphasis}
                <HeadlineUnderline />
              </span>
              {second.slice(emphasisEnd)}
            </span>
          </h2>
          <p className={styles.body}>{copy.body}</p>
        </TestimonialsReveal>

        <TestimonialsReveal className={styles.cardsFrame} threshold={0.3}>
          {awaitingProof && (
            <p className={styles.reviewFlag} role="note">
              {copy.placeholder.flag}
            </p>
          )}
          <ul className={styles.cards} data-count={cardCount}>
            {awaitingProof
              ? PLACEHOLDER_GLYPHS.slice(0, testimonialPlaceholderSlots).map((glyph, index) => (
                  <li
                    key={index}
                    className={styles.card}
                    data-tint={cardTint(index, cardCount)}
                    data-placeholder="true"
                    style={{ "--card": index } as CSSProperties}
                  >
                    <PlaceholderCard glyph={glyph} />
                  </li>
                ))
              : approved.map((testimonial, index) => (
                  <li
                    key={testimonial.id}
                    className={styles.card}
                    data-tint={cardTint(index, cardCount)}
                    style={{ "--card": index } as CSSProperties}
                  >
                    <TestimonialCard testimonial={testimonial} />
                  </li>
                ))}
          </ul>
        </TestimonialsReveal>
      </div>
    </CampaignSection>
  );
}

/** Only the centre card of a full row of three takes the mint paper. */
function cardTint(index: number, count: number) {
  return count === MAX_CARDS && index === 1 ? "mint" : "parchment";
}

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  const { quote, readerName, location, membership, portrait, glyph } = testimonial;

  return (
    <figure className={styles.figure}>
      <div className={styles.cardHead}>
        <QuoteMark />
        {portrait && (
          <Image
            className={styles.portrait}
            src={portrait.src}
            width={portrait.width}
            height={portrait.height}
            alt={portrait.alt}
            sizes="(min-width: 1200px) 7vw, 6rem"
            quality={85}
          />
        )}
      </div>
      <blockquote className={styles.quote}>
        <p>&ldquo;{quote}&rdquo;</p>
      </blockquote>
      <figcaption className={styles.attribution}>
        <span className={styles.reader}>
          <span aria-hidden="true">&mdash; </span>
          {readerName}
          {location && `, ${location}`}
        </span>
        {membership && <span className={styles.membership}>{membership}</span>}
      </figcaption>
      {glyph && <CardGlyph icon={glyph} />}
    </figure>
  );
}

/** Same footprint as a real card, but plainly marked and never a quotation. */
function PlaceholderCard({ glyph }: { glyph: TestimonialGlyph }) {
  const copy = campaignCopy.testimonials.placeholder;

  return (
    <div className={styles.figure}>
      <div className={styles.cardHead}>
        <QuoteMark />
        <span className={styles.portraitSlot} aria-hidden="true" />
      </div>
      <p className={styles.placeholderTag}>{copy.tag}</p>
      <p className={styles.placeholderBody}>{copy.body}</p>
      <p className={styles.attribution}>{copy.attribution}</p>
      <CardGlyph icon={glyph} />
    </div>
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

/** Heavy editorial opening quote, drawn so it never depends on the font. */
function QuoteMark() {
  return (
    <svg viewBox="0 0 40 30" aria-hidden="true" className={styles.quoteMark}>
      <path d="M16.4 3.2C9.1 5.6 3 11.4 3 19.3 3 24 5.9 27 9.7 27c3.4 0 5.9-2.4 5.9-5.6 0-3.1-2.3-5.3-5.3-5.5.6-3.6 3.5-7 7.7-9.1ZM36.4 3.2c-7.3 2.4-13.4 8.2-13.4 16.1 0 4.7 2.9 7.7 6.7 7.7 3.4 0 5.9-2.4 5.9-5.6 0-3.1-2.3-5.3-5.3-5.5.6-3.6 3.5-7 7.7-9.1Z" />
    </svg>
  );
}

function CardGlyph({ icon }: { icon: TestimonialGlyph }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={styles.glyph}>
      {icon === "openBook" && (
        <>
          <path d="M16 8.6c-2.9-2.1-6.8-2.9-11.6-2.8v17.6c4.8-.1 8.7.7 11.6 2.8 2.9-2.1 6.8-2.9 11.6-2.8V5.8c-4.8-.1-8.7.7-11.6 2.8Z" />
          <path d="M16 8.6v17.6" />
        </>
      )}
      {icon === "books" && (
        <>
          <rect x="7" y="5" width="18" height="6" rx="2" />
          <rect x="5.5" y="13" width="21" height="6" rx="2" />
          <rect x="7" y="21" width="18" height="6" rx="2" />
        </>
      )}
      {icon === "notebook" && (
        <>
          <rect x="6" y="6.5" width="20" height="21" rx="1.6" />
          <path d="M6 11.5h20M10.5 4v5M16 4v5M21.5 4v5M10 16h12M10 20h12M10 24h8" />
        </>
      )}
    </svg>
  );
}
