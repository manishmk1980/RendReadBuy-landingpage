import type { ReactNode } from "react";
import { links, type LinkKey } from "@/config/links";
import {
  trackingAttributes,
  type CampaignEvent,
  type CampaignEventParams,
} from "@/lib/analytics";
import styles from "./CampaignButton.module.css";

type Destination =
  | { link: LinkKey; href?: never }
  /** Only for config-driven URLs not in `links` (featured book, affiliates). */
  | { href: string; link?: never };

type CampaignButtonProps = Destination & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "text";
  trackEvent?: CampaignEvent;
  trackParams?: CampaignEventParams;
  /** Affiliate destinations must pass "sponsored". */
  rel?: string;
  className?: string;
};

/**
 * Every CTA leaves the campaign for an existing RentReadBuy (or approved
 * affiliate) destination, so this always renders a real link.
 */
export function CampaignButton({
  children,
  variant = "primary",
  trackEvent,
  trackParams,
  rel,
  className,
  ...destination
}: CampaignButtonProps) {
  const href =
    destination.link !== undefined
      ? links[destination.link].href
      : destination.href;

  return (
    <a
      href={href}
      rel={rel}
      className={[styles.button, className].filter(Boolean).join(" ")}
      data-variant={variant}
      {...(trackEvent ? trackingAttributes(trackEvent, trackParams) : {})}
    >
      {children}
    </a>
  );
}
