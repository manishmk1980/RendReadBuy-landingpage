"use client";

import { useEffect } from "react";
import { subscribeToConsent } from "@/lib/consent";

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID?.trim() ?? "";

/**
 * Consent state that may load the shared container.
 *
 * Live container GTM-MRLNJ7Q version 17 runs GA4 from the Google tag and
 * advertising from Meta Custom HTML. The Meta tags do not read Consent Mode.
 * Loading that container for analytics-only consent would let advertising tags
 * run before an advertising grant. Loading it for advertising-only consent
 * would let the Google tag run before an analytics grant. Every other
 * combination leaves gtm.js unloaded.
 *
 * A later withdrawal updates Consent Mode on the open page. It cannot unload a
 * container that has already started, and it cannot stop Custom HTML that
 * ignores Consent Mode. That remaining control is a Google-side container change.
 */
export const GTM_GRANTED_CONSENT = "granted|granted|granted|granted";

export function gtmContainerId(value = GTM_ID): string | null {
  return /^GTM-[A-Z0-9]+$/.test(value) ? value : null;
}

/**
 * Inserts gtm.js once, and only after the consent bootstrap has denied every
 * storage type and a later update has granted analytics and advertising together.
 */
export function gtmLoaderSource(containerId: string): string {
  return `(function(w,d,s,l,i){if(!w.__rrbConsentDefaultSet||w.__rrbGtmLoaded)return;if(w.__rrbConsentApplied!==${JSON.stringify(GTM_GRANTED_CONSENT)})return;w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var j=d.createElement(s),f=d.getElementsByTagName(s)[0],dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.id='gtm';j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;if(f&&f.parentNode)f.parentNode.insertBefore(j,f);else (d.head||d.documentElement).appendChild(j);w.__rrbGtmLoaded=true;})(window,document,'script','dataLayer',${JSON.stringify(containerId)});`;
}

export function loadGtmContainer(containerId: string) {
  if (!gtmContainerId(containerId) || typeof window === "undefined") return;
  const execute = new Function(gtmLoaderSource(containerId));
  execute();
}

export function TagManager() {
  const containerId = gtmContainerId();

  useEffect(() => {
    if (!containerId) return;
    const attempt = () => {
      try {
        loadGtmContainer(containerId);
      } catch {
        // A tag-manager failure must not interrupt membership signup.
      }
    };
    attempt();
    return subscribeToConsent(attempt);
  }, [containerId]);

  return null;
}
