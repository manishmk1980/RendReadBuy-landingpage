"use client";

import { useEffect } from "react";
import { readStoredConsent, subscribeToConsent } from "@/lib/consent";
import { applyOpenPageConsent, runConsentBootstrap } from "./consentMode";

/**
 * Keeps Consent Mode aligned with the open page. The head bootstrap has
 * already applied a saved cookie; this listens for a later choice and sends
 * one consent update. It does not load GTM.
 */
export function ConsentModeSync() {
  useEffect(() => {
    runConsentBootstrap();
    return subscribeToConsent(() => {
      const stored = readStoredConsent();
      if (!stored) return;
      applyOpenPageConsent(stored);
    });
  }, []);

  return null;
}
