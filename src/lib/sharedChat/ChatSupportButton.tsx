"use client";

import { useState } from "react";
import { sharedChatDisclosure } from "@/config/sharedChat";
import type { SharedChatSettings } from "./config";
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
 * Loads the existing shared widget on the visitor's action. The widget script,
 * its API calls and its session storage stay untouched until this runs.
 * `__PRIMEWAYZ_ANALYTICS_CONSENT__` is left unset, so the widget does not
 * forward chat events into the page's analytics.
 */
export function ChatSupportButton({ settings }: { settings: SharedChatSettings }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const copy = sharedChatDisclosure;

  async function openChat() {
    if (phase === "opening") return;
    setPhase("opening");
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
  }

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
