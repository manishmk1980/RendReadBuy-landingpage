"use client";

import { useEffect } from "react";
import type { SharedChatSettings } from "./config";
import { loadSharedChatWidget } from "./loadWidget";

const IDLE_TIMEOUT_MS = 4000;
const IDLE_FALLBACK_MS = 1500;

/**
 * Starts the shared widget once the page has loaded and the main thread is
 * idle, so it never competes with the hero or the membership CTAs. Strict
 * Mode remounts cancel the pending start; the loader itself is idempotent.
 */
export function SharedChatLoader({ settings }: { settings: SharedChatSettings }) {
  const { apiBaseUrl, widgetUrl, widgetIntegrity } = settings;

  useEffect(() => {
    let idleId: number | null = null;
    let timeoutId: number | null = null;

    const start = () => {
      void loadSharedChatWidget(window, { apiBaseUrl, widgetUrl, widgetIntegrity }).then(
        (result) => {
          if (process.env.NODE_ENV !== "production") {
            console.debug("[shared chat]", result);
          }
        },
      );
    };

    const scheduleIdle = () => {
      if (typeof window.requestIdleCallback === "function") {
        idleId = window.requestIdleCallback(start, { timeout: IDLE_TIMEOUT_MS });
      } else {
        timeoutId = window.setTimeout(start, IDLE_FALLBACK_MS);
      }
    };

    if (document.readyState === "complete") scheduleIdle();
    else window.addEventListener("load", scheduleIdle, { once: true });

    return () => {
      window.removeEventListener("load", scheduleIdle);
      if (idleId !== null) window.cancelIdleCallback(idleId);
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };
  }, [apiBaseUrl, widgetUrl, widgetIntegrity]);

  return null;
}
