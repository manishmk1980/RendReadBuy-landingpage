"use client";

import { useCallback, useEffect, useState } from "react";
import { sharedChatDisclosure } from "@/config/sharedChat";
import { sharedChatOpenRequested, type SharedChatSettings } from "./config";
import { loadSharedChatWidget } from "./loadWidget";
import styles from "./ChatPrivacyNotice.module.css";

const HOST_ID = "pw-chat-root";
const HOST_WAIT_MS = 4000;

type Phase = "idle" | "opening" | "ready" | "unavailable";

type ChatWindow = Window & {
  PrimewayzChat?: { open?: () => void };
  __PRIMEWAYZ_ANALYTICS_CONSENT__?: boolean;
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
 * Loads the existing shared widget on the visitor's action, or when the page
 * URL asks the central widget to open (`?pw_chat=open`). The widget script,
 * its API calls and its session storage stay untouched until one of those
 * happens. `__PRIMEWAYZ_ANALYTICS_CONSENT__` is left unset, so the widget does
 * not forward chat events into the page's analytics.
 *
 * A failed script or a widget that never boots only changes this notice.
 * It does not throw, and it does not block the membership links.
 */
export function ChatSupportButton({ settings }: { settings: SharedChatSettings }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const copy = sharedChatDisclosure;

  const openChat = useCallback(async () => {
    let skipped = false;
    setPhase((current) => {
      if (current === "opening" || current === "ready") {
        skipped = true;
        return current;
      }
      return "opening";
    });
    if (skipped) return;

    try {
      const win = window as ChatWindow;
      const result = await loadSharedChatWidget(win, settings);
      if (result === "script_failed" || result === "config_conflict") {
        setPhase("unavailable");
        return;
      }
      const ready = await waitForHost(win);
      if (!ready) {
        setPhase("unavailable");
        return;
      }
      chatApi(win)?.open?.();
      setPhase("ready");
    } catch {
      setPhase("unavailable");
    }
  }, [settings]);

  useEffect(() => {
    if (!sharedChatOpenRequested(window.location.search)) return;
    const timer = window.setTimeout(() => {
      void openChat();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [openChat]);

  return (
    <div className={styles.action}>
      <button
        type="button"
        className={styles.button}
        onClick={() => void openChat()}
        disabled={phase === "opening"}
        aria-busy={phase === "opening"}
      >
        {phase === "opening" ? copy.openingLabel : copy.openLabel}
      </button>
      {phase === "unavailable" ? (
        <p className={styles.status} role="status">
          {copy.unavailable}
        </p>
      ) : null}
    </div>
  );
}
