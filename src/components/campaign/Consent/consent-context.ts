"use client";

import { createContext, useContext } from "react";

export const COOKIE_SETTINGS_ID = "rrb-cookie-settings";

export type ConsentApi = {
  openCookieSettings: () => void;
};

export const ConsentContext = createContext<ConsentApi | null>(null);

export function useConsent(): ConsentApi {
  const value = useContext(ConsentContext);
  if (!value) {
    throw new Error("Cookie settings must be rendered inside campaign consent.");
  }
  return value;
}
