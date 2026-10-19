"use client";

import type { ReactNode } from "react";
import { COOKIE_SETTINGS_ID, useConsent } from "./consent-context";

/** Footer control. Reopens preferences on the saved cookie, without navigating away. */
export function CookieSettingsButton({ className, children }: { className?: string; children: ReactNode }) {
  const { openCookieSettings } = useConsent();

  return (
    <button type="button" id={COOKIE_SETTINGS_ID} className={className} onClick={openCookieSettings}>
      {children}
    </button>
  );
}
