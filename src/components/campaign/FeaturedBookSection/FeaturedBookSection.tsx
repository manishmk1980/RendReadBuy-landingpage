import type { ReactNode } from "react";
import Image from "next/image";
import { CampaignButton } from "@/components/shared/CampaignButton";
import { CampaignSection } from "@/components/shared/CampaignSection";
import { SectionEyebrow } from "@/components/shared/SectionEyebrow";
import { campaignCopy } from "@/config/campaign";
import {
  featuredBook,
  featuredBookPlaceholder,
  featuredBookScene,
  type FeaturedBook,
  type FeaturedBookOffer,
} from "@/config/featuredBook";
import { FeaturedBookBackdrop } from "./FeaturedBookBackdrop";
import { FeaturedBookReveal } from "./FeaturedBookReveal";
import styles from "./FeaturedBookSection.module.css";

type BookAction = "rent" | "buy" | "view";

/**
 * One featured title over a reading-scene artwork. Renders only the approved
 * book from config; with none, development shows a plainly marked placeholder
 * for layout review and production omits the section. Every CTA is a real
 * link only when its offer is available and has a verified URL.
 */
export function FeaturedBookSection() {
  const copy = campaignCopy.featuredBook;
  const awaitingApproval = featuredBook === null;

  if (awaitingApproval && process.env.NODE_ENV === "production") return null;

  const book = featuredBook ?? featuredBookPlaceholder;
  const [lead, second] = copy.headlineLines;
  const emphasisStart = second.indexOf(copy.headlineEmphasis);
  const emphasisEnd = emphasisStart + copy.headlineEmphasis.length;
  const showCover = !featuredBookScene.coverBaked && book.image;

  return (
    <CampaignSection section="featuredBook" labelledBy="featured-book-heading" className={styles.section}>
      <FeaturedBookBackdrop
        src={featuredBookScene.background}
        className={styles.backdrop}
        imageClassName={styles.artwork}
      >
        {showCover && book.image && (
          <Image
            className={styles.cover}
            src={book.image.src}
            width={book.image.width}
            height={book.image.height}
            alt=""
            sizes="(min-width: 1200px) 17vw, 30vw"
            quality={85}
          />
        )}
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
          {awaitingApproval && (
            <p className={styles.reviewFlag} role="note">
              {copy.placeholder.flag}
            </p>
          )}
          <BookPanel book={book} preview={awaitingApproval} />
        </FeaturedBookReveal>
      </div>
    </CampaignSection>
  );
}

function BookPanel({ book, preview }: { book: FeaturedBook; preview: boolean }) {
  const copy = campaignCopy.featuredBook;
  const rent = offerAction(book.rent, preview);
  const buy = offerAction(book.buy, preview);
  const view = book.detailUrl || preview ? { href: book.detailUrl } : null;

  return (
    <article className={styles.panel} aria-labelledby="featured-book-title">
      <h3 id="featured-book-title" className={styles.title}>
        {book.title}
      </h3>
      <p className={styles.author}>{book.author}</p>
      <p className={styles.description}>{book.description}</p>

      {(rent || buy) && (
        <div className={styles.offers}>
          {rent && (
            <ActionLink action="rent" bookId={book.id} href={rent.href} className={styles.rent}>
              {rent.price ? `${copy.rentPriced} ${rent.price}` : copy.rentCta}
            </ActionLink>
          )}
          {buy && (
            <ActionLink action="buy" bookId={book.id} href={buy.href} className={styles.buy}>
              {buy.price ? `${copy.buyPriced} ${buy.price}` : copy.buyCta}
            </ActionLink>
          )}
        </div>
      )}

      {view && (
        <ActionLink action="view" bookId={book.id} href={view.href} className={styles.view}>
          {copy.cta}
          <ArrowIcon />
        </ActionLink>
      )}
    </article>
  );
}

/** An offer becomes an action only when available; outside preview it also needs a URL. */
function offerAction(offer: FeaturedBookOffer | undefined, preview: boolean) {
  if (!offer?.available) return null;
  if (!offer.url && !preview) return null;
  return { href: offer.url, price: offer.url ? offer.price : undefined };
}

interface ActionLinkProps {
  action: BookAction;
  bookId: string;
  href?: string;
  className: string;
  children: ReactNode;
}

/**
 * A verified destination renders a tracked link. Without one (development
 * preview only) the same styling renders as inert text, never a link.
 */
function ActionLink({ action, bookId, href, className, children }: ActionLinkProps) {
  const classes = `${styles.action} ${className}`;

  if (!href) {
    return (
      <span className={classes} data-preview="true" title={campaignCopy.featuredBook.placeholder.actionNote}>
        {children}
      </span>
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
