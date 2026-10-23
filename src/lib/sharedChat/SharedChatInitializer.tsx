"use client";

import { useEffect } from "react";
import { subscribeSharedChatAnalyticsConsent } from "./analyticsConsent";
import { sharedChatOpenRequested, type SharedChatSettings } from "./config";
import { loadSharedChatWidget } from "./loadWidget";

const HOST_ID = "pw-chat-root";
const HOST_WAIT_MS = 4000;

type ChatWindow = Window & {
  PrimewayzChat?: { open?: () => void };
};

function chatApi(win: ChatWindow) {
  return win.PrimewayzChat;
}

async function waitForHost(win: ChatWindow) {
  const start = Date.now();
  while (Date.now() - start < HOST_WAIT_MS) {
    if (win.document.getElementById(HOST_ID) && typeof chatApi(win)?.open === "function") return true;
    await new Promise((resolve) => win.setTimeout(resolve, 50));
  }
  return Boolean(win.document.getElementById(HOST_ID) && chatApi(win)?.open);
}

/**
 * Loads the shared Primewayz widget once on mount so the floating launcher
 * appears without a separate page button. The panel stays closed unless the
 * URL asks for it (`?pw_chat=open`). Analytics consent is mirrored onto
 * `__PRIMEWAYZ_ANALYTICS_CONSENT__` so the widget only emits GA4/dataLayer
 * events after an analytics grant on this page.
 *
 * A failed script or a widget that never boots is ignored: the rest of the
 * page, including membership links, must keep working.
 */
export function SharedChatInitializer({ settings }: { settings: SharedChatSettings }) {
  useEffect(() => {
    let cancelled = false;
    const stopConsentSync = subscribeSharedChatAnalyticsConsent(window);

    async function init() {
      try {
        const win = window as ChatWindow;
        const result = await loadSharedChatWidget(win, settings);
        if (cancelled) return;
        if (result === "script_failed" || result === "config_conflict") return;
        if (!sharedChatOpenRequested(win.location.search)) return;

        const ready = await waitForHost(win);
        if (cancelled || !ready) return;
        chatApi(win)?.open?.();
      } catch {
        // Chat must never break the landing page.
      }
    }

    void init();
    return () => {
      cancelled = true;
      stopConsentSync();
    };
  }, [settings]);

  return null;
}
