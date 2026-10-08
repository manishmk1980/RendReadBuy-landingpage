import Image from "next/image";
import { CampaignSection } from "@/components/shared/CampaignSection";
import { CampaignButton } from "@/components/shared/CampaignButton";
import { SectionEyebrow } from "@/components/shared/SectionEyebrow";
import { campaignCopy, silverProposition } from "@/config/campaign";
import { heroAssets, type HeroAsset } from "./heroAssets";
import { HeroScene } from "./HeroScene";
import styles from "./HeroSection.module.css";

const benefitIcons = [BooksIcon, CoinsIcon, DeliveryIcon, ParcelIcon] as const;

export function HeroSection() {
  const copy = campaignCopy.hero;
  const { price } = silverProposition;
  const [termLead, ...termRest] = price.term.split(" ");
  const [headlineLead, headlineTail] = copy.headline.split(copy.headlineEmphasis);

  return (
    <CampaignSection section="hero" labelledBy="hero-heading" className={styles.hero}>
      <HeroScene className={styles.scene}>
        <div className={styles.sky} />
        <div className={styles.canvas}>
          <SceneLayer asset={heroAssets.mountain} className={styles.mountain} />
          <div className={styles.atmosphere} />
          <div className={styles.wall} />
          <SceneLayer asset={heroAssets.windowTable} className={styles.windowTable} />
        </div>
        <div className={styles.paperBlend} />
        <div className={styles.stage}>
          <SceneLayer asset={heroAssets.plant} className={styles.plant} />
          <SceneLayer asset={heroAssets.mug} className={styles.mug} />
          <SceneLayer asset={heroAssets.bookStack} className={styles.bookStack} />
          <SceneLayer asset={heroAssets.openBook} className={styles.openBook} />
          <SceneLayer asset={heroAssets.foliageLeft} className={styles.foliageLeft} />
          <SceneLayer asset={heroAssets.foliageRight} className={styles.foliageRight} />
        </div>
      </HeroScene>

      <div className={styles.content}>
        <SectionEyebrow className={styles.eyebrow}>{copy.eyebrow}</SectionEyebrow>
        <h1 id="hero-heading" className={styles.headline}>
          {headlineLead.trim()}
          <br />
          <span className={styles.emphasis}>
            {copy.headlineEmphasis}
            <HeadlineUnderline />
          </span>
          {headlineTail}
        </h1>
        <p className={styles.subheadline}>{copy.subheadline}</p>
        <p className={styles.body}>{copy.body}</p>
        <p className={styles.accent}>
          <AccentBrush />
          <span className={styles.accentText}>{copy.accent}</span>
        </p>

        <p className={styles.price}>
          <span className={styles.amount}>{price.display}</span>{" "}
          <span className={styles.term}>
            <span>{termLead}</span> <span>{termRest.join(" ")}</span>
          </span>
        </p>

        <ul className={styles.benefits}>
          {copy.benefits.map((label, index) => {
            const Icon = benefitIcons[index];
            return (
              <li key={label} className={styles.benefit}>
                <span className={styles.benefitIcon}>{Icon ? <Icon /> : null}</span>
                <span className={styles.benefitLabel}>{label}</span>
              </li>
            );
          })}
        </ul>

        <div className={styles.actions}>
          <CampaignButton
            link="silverMembership"
            trackEvent="silver_cta_click"
            trackParams={{ placement: "hero" }}
            className={styles.primaryCta}
          >
            {copy.primaryCta}
            <ArrowIcon />
          </CampaignButton>
          <p className={styles.reassurance}>{copy.reassurance}.</p>
          <CampaignButton
            link="giftSilver"
            variant="text"
            trackEvent="gift_membership_click"
            trackParams={{ placement: "hero" }}
            className={styles.giftCta}
          >
            <GiftIcon />
            <span className={styles.giftLabel}>{copy.giftCta}</span>
            <ArrowIcon />
          </CampaignButton>
        </div>
      </div>
    </CampaignSection>
  );
}

/**
 * Positioning wrapper (placement in the scene) → motion wrapper (pointer +
 * scroll transform, from CSS variables) → ambient wrapper (keyframes). Each
 * level owns one concern, so the three motion systems never overwrite.
 */
function SceneLayer({ asset, className }: { asset: HeroAsset; className: string }) {
  return (
    <div className={`${styles.layer} ${className}`}>
      <div className={styles.motion}>
        <div className={styles.ambient}>
          <Image
            src={asset.src}
            alt=""
            width={asset.width}
            height={asset.height}
            unoptimized
            draggable={false}
            className={styles.layerImage}
            loading="eager"
            fetchPriority={asset.priority ? "high" : "auto"}
          />
        </div>
      </div>
    </div>
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

function AccentBrush() {
  return (
    <svg
      viewBox="0 0 340 46"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={styles.brush}
    >
      <path d="M7 9.5C46 4.6 118 6.2 196 4.4c52-1.2 104-.4 136 2.6l-3.6 5.4 7.2 4.8-5.4 5.9 6.6 5.6-5.8 4.8c-34 3.4-98 2.1-168 4.2-58 1.8-112 2.6-156 1.4l4.4-5.6L4 32.4l6-5.2-7.6-6.3 6.4-5.3L3 11.4l4-1.9Z" />
      <path d="M22 13c66-3.2 148-4.4 238-3.6 26 .2 50 .9 68 2.1-62 1.6-150 2.8-252 4.6-4 .1-6-2.9-4-3.1Z" opacity="0.45" />
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

function BooksIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.icon}>
      <path d="M12 6.6C10.1 5.2 7.4 4.6 4 4.7v12.8c3.4-.1 6.1.5 8 1.9 1.9-1.4 4.6-2 8-1.9V4.7c-3.4-.1-6.1.5-8 1.9Z" />
      <path d="M12 6.6v12.8" />
    </svg>
  );
}

function CoinsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.icon}>
      <ellipse cx="12" cy="6" rx="6.2" ry="2.4" />
      <path d="M5.8 6v4c0 1.3 2.8 2.4 6.2 2.4s6.2-1.1 6.2-2.4V6" />
      <path d="M5.8 10v4c0 1.3 2.8 2.4 6.2 2.4s6.2-1.1 6.2-2.4v-4" />
      <path d="M5.8 14v4c0 1.3 2.8 2.4 6.2 2.4s6.2-1.1 6.2-2.4v-4" />
    </svg>
  );
}

function DeliveryIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.icon}>
      <path d="M2.8 6.5h10.6v9.8H2.8z" />
      <path d="M13.4 9.6h3.9l3 3.3v3.4h-6.9" />
      <circle cx="6.8" cy="17.4" r="1.7" />
      <circle cx="16.9" cy="17.4" r="1.7" />
      <path d="M5.6 9.4h3.6M5.6 11.6h2.2" />
    </svg>
  );
}

function ParcelIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.icon}>
      <path d="M12 3.6 4.4 7.4v9.2l7.6 3.8 7.6-3.8V7.4L12 3.6Z" />
      <path d="M4.4 7.4 12 11.2l7.6-3.8M12 11.2v9.2M8.2 5.5l7.6 3.8" />
    </svg>
  );
}

function GiftIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.giftIcon}>
      <path d="M3.8 8.6h16.4v3.8H3.8zM5.2 12.4h13.6v8H5.2zM12 8.6v11.8" />
      <path d="M12 8.6c-1.2-3.4-5.6-4.6-5.6-2.1 0 1.6 2.8 2.1 5.6 2.1Zm0 0c1.2-3.4 5.6-4.6 5.6-2.1 0 1.6-2.8 2.1-5.6 2.1Z" />
    </svg>
  );
}
