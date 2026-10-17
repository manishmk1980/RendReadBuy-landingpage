import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";
import { CampaignButton } from "@/components/shared/CampaignButton";
import { CampaignSection } from "@/components/shared/CampaignSection";
import { SectionEyebrow } from "@/components/shared/SectionEyebrow";
import { campaignCopy } from "@/config/campaign";
import {
  featuredBook,
  featuredBookScene,
  type FeaturedBook,
  type FeaturedBookImage,
  type FeaturedBookOffer,
} from "@/config/featuredBook";
import { FeaturedBookBackdrop } from "./FeaturedBookBackdrop";
import { FeaturedBookReveal } from "./FeaturedBookReveal";
import styles from "./FeaturedBookSection.module.css";

type BookAction = "rent" | "buy" | "view";

const UNVERIFIED_NOTE_ID = "featured-book-unverified";

/**
 * One featured title over the reading scene. While the backdrop already
 * contains the book, the separate mockup and cover overlay stay unused.
 * Production renders the section only for an approved record. Every action is
 * a link only when that record has a verified RentReadBuy inventory URL;
 * otherwise it stays an inactive control.
 */
export function FeaturedBookSection() {
  const copy = campaignCopy.featuredBook;
  const awaitingApproval = featuredBook === null;

  if (awaitingApproval && process.env.NODE_ENV === "production") return null;

  const book = featuredBook;
  const [lead, second] = copy.headlineLines;
  const emphasisStart = second.indexOf(copy.headlineEmphasis);
  const emphasisEnd = emphasisStart + copy.headlineEmphasis.length;

  return (
    <CampaignSection section="featuredBook" labelledBy="featured-book-heading" className={styles.section}>
      <FeaturedBookBackdrop
        src={featuredBookScene.background}
        className={styles.backdrop}
        imageClassName={styles.artwork}
      >
        {featuredBookScene.coverBaked ? null : <FeaturedBookMockup cover={book?.image} />}
      </FeaturedBookBackdrop>

      <div className={styles.content}>
        <FeaturedBookReveal className={styles.intro}>
          <SectionEyebrow className={styles.eyebrow}>
            <EyebrowMark />
            {copy.eyebrow}
          </SectionEyebrow>
          <h2 id="featured-book-heading" className={styles.headline}>
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
        </FeaturedBookReveal>

        <FeaturedBookReveal className={styles.panelFrame} threshold={0.5}>
          <BookPanel book={book} />
        </FeaturedBookReveal>
      </div>
    </CampaignSection>
  );
}

function FeaturedBookMockup({ cover }: { cover?: FeaturedBookImage }) {
  const { mockup, coverFace } = featuredBookScene;

  return (
    <div className={styles.mockup}>
      <Image
        className={styles.mockupImage}
        src={mockup.src}
        alt={cover ? "" : mockup.alt}
        width={mockup.width}
        height={mockup.height}
        sizes="(min-width: 1200px) 24vw, 58vw"
        quality={90}
        style={{ width: "100%", height: "100%" }}
      />
      {cover && (
        <div
          className={styles.coverFace}
          style={
            {
              top: coverFace.top,
              left: coverFace.left,
              width: coverFace.width,
              height: coverFace.height,
            } as CSSProperties
          }
        >
          <Image
            className={styles.coverArt}
            src={cover.src}
            alt={cover.alt}
            width={cover.width}
            height={cover.height}
            sizes="(min-width: 1200px) 14vw, 36vw"
            quality={85}
            style={{ width: "100%", height: "100%" }}
          />
        </div>
      )}
    </div>
  );
}

function BookPanel({ book }: { book: FeaturedBook | null }) {
  const copy = campaignCopy.featuredBook;
  const rent = offerHref(book?.rent);
  const buy = offerHref(book?.buy);
  const view = book?.detailUrl;
  const unverified = !rent || !buy || !view;

  return (
    <article
      className={styles.panel}
      aria-labelledby={book ? "featured-book-title" : undefined}
      aria-label={book ? undefined : "Featured book"}
      data-development-status={book ? undefined : copy.placeholder.flag}
    >
      <SectionEyebrow className={styles.panelEyebrow}>{copy.eyebrow}</SectionEyebrow>
      {book && (
        <>
          <h3 id="featured-book-title" className={styles.title}>
            {book.title}
          </h3>
          <p className={styles.author}>{book.author}</p>
          <p className={styles.description}>{book.description}</p>
        </>
      )}

      <div className={styles.offers}>
        <BookActionControl action="rent" bookId={book?.id} href={rent} className={styles.rent} describedBy={unverified}>
          {rent && book?.rent?.price ? `${copy.rentPriced} ${book.rent.price}` : copy.rentCta}
        </BookActionControl>
        <BookActionControl action="buy" bookId={book?.id} href={buy} className={styles.buy} describedBy={unverified}>
          {buy && book?.buy?.price ? `${copy.buyPriced} ${book.buy.price}` : copy.buyCta}
        </BookActionControl>
      </div>

      <BookActionControl action="view" bookId={book?.id} href={view} className={styles.view} describedBy={unverified}>
        {copy.cta}
        <ArrowIcon />
      </BookActionControl>

      {unverified && (
        <p id={UNVERIFIED_NOTE_ID} className="visually-hidden">
          {copy.placeholder.actionNote}
        </p>
      )}
    </article>
  );
}

/** A verified inventory URL is required before an available offer becomes a link. */
function offerHref(offer: FeaturedBookOffer | undefined) {
  if (!offer?.available || !offer.url) return undefined;
  return offer.url;
}

interface BookActionControlProps {
  action: BookAction;
  bookId?: string;
  href?: string;
  className: string;
  describedBy: boolean;
  children: ReactNode;
}

/**
 * A verified destination renders a tracked link. Without one the same control
 * stays focusable and inactive, so the missing destination can be announced.
 */
function BookActionControl({
  action,
  bookId,
  href,
  className,
  describedBy,
  children,
}: BookActionControlProps) {
  const classes = `${styles.action} ${className}`;

  if (!href || !bookId) {
    return (
      <button
        type="button"
        className={classes}
        aria-disabled="true"
        aria-describedby={describedBy ? UNVERIFIED_NOTE_ID : undefined}
      >
        {children}
      </button>
    );
  }

  return (
    <CampaignButton
      href={href}
      variant={action === "view" ? "text" : action === "buy" ? "primary" : "secondary"}
      trackEvent="featured_book_click"
      trackParams={{ placement: "featured_book", action, book: bookId }}
      className={classes}
    >
      {children}
    </CampaignButton>
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
