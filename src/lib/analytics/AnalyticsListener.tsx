"use client";

import { useEffect } from "react";
import { decorateOutboundLinks } from "./attribution";
import { isCampaignEvent, type CampaignEventParams } from "./events";
import { track } from "./track";

function readParams(element: HTMLElement): CampaignEventParams {
  const raw = element.dataset.trackParams;
  if (!raw) return {};
  try {
    return JSON.parse(raw) as CampaignEventParams;
  } catch {
    return {};
  }
}

/**
 * Mounted once in the root layout. Carries landing-URL attribution onto
 * RentReadBuy links (see `attribution.ts`) and handles clicks on `[data-track-event]`
 * elements and opening of `<details data-track-event>` (toggle does not
 * bubble, so it is observed in the capture phase).
 */
export function AnalyticsListener() {
  useEffect(() => {
    decorateOutboundLinks();

    function onClick(event: MouseEvent) {
      const target = (event.target as Element | null)?.closest<HTMLElement>(
        "[data-track-event]",
      );
      if (!target || target instanceof HTMLDetailsElement) return;
      const name = target.dataset.trackEvent;
      if (isCampaignEvent(name)) track(name, readParams(target));
    }

    function onToggle(event: Event) {
      const target = event.target;
      if (!(target instanceof HTMLDetailsElement) || !target.open) return;
      const name = target.dataset.trackEvent;
      if (isCampaignEvent(name)) track(name, readParams(target));
    }

    document.addEventListener("click", onClick);
    document.addEventListener("toggle", onToggle, true);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("toggle", onToggle, true);
    };
  }, []);

  return null;
}
