"use client";

import Image from "next/image";
import { useLayoutEffect, useRef } from "react";
import { brand } from "@/config/brand";
import { campaignCopy } from "@/config/campaign";
import { links } from "@/config/links";
import { trackingAttributes } from "@/lib/analytics";
import styles from "./CampaignHeader.module.css";

/** Matches the desktop header query in CampaignHeader.module.css. */
const MOBILE_HEADER_QUERY = "(max-width: 1023px)";

/**
 * Page scroll offset across the viewport and the document scrollport.
 * `scroll(root)` does not track every browser's actual scrolling element.
 */
function pageScrollTop(): number {
  return Math.max(
    window.scrollY || 0,
    document.documentElement.scrollTop || 0,
    document.body.scrollTop || 0,
    document.scrollingElement?.scrollTop || 0,
  );
}

export function CampaignHeader() {
  const headerRef = useRef<HTMLElement>(null);
  const { memberPrompt, signIn } = campaignCopy.header;

  useLayoutEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const mobileQuery = window.matchMedia(MOBILE_HEADER_QUERY);
    let frame = 0;
    let listening = false;

    const apply = () => {
      frame = 0;
      header.toggleAttribute("data-scrolled", pageScrollTop() > 0);
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(apply);
    };

    const start = () => {
      if (listening) return;
      listening = true;
      apply();
      window.addEventListener("scroll", onScroll, { passive: true });
      document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    };

    const stop = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      header.removeAttribute("data-scrolled");
      if (!listening) return;
      listening = false;
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("scroll", onScroll, { capture: true });
    };

    const onBreakpoint = () => {
      if (mobileQuery.matches) start();
      else stop();
    };

    onBreakpoint();
    mobileQuery.addEventListener("change", onBreakpoint);

    return () => {
      stop();
      mobileQuery.removeEventListener("change", onBreakpoint);
    };
  }, []);

  return (
    <header ref={headerRef} className={styles.header}>
      {brand.logo && (
        <a
          href={links.home.href}
          className={styles.logoLink}
          {...trackingAttributes("rentreadbuy_exit_click", {
            placement: "header_logo",
            destination: "home",
          })}
        >
          <Image
            src={brand.logo.src}
            alt={brand.logo.alt}
            width={brand.logo.width}
            height={brand.logo.height}
            sizes="180px"
            quality={90}
            preload
            className={styles.logo}
          />
        </a>
      )}
      <p className={styles.member}>
        {memberPrompt}{" "}
        <a
          href={links.signIn.href}
          className={styles.signIn}
          {...trackingAttributes("sign_in_click", { placement: "header" })}
        >
          {signIn}
          <span aria-hidden="true">→</span>
        </a>
      </p>
    </header>
  );
}
