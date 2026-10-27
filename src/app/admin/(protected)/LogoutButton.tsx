"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ADMIN_CSRF_COOKIE, ADMIN_CSRF_HEADER } from "@/lib/adminAuth/constants";
import { getOrCreateConsoleInstanceId } from "@/lib/chatOps/consoleInstance";
import { clearPresenceIntent } from "@/lib/chatOps/presenceIntent";
import styles from "../admin.module.css";

function readCsrfCookie(): string | null {
  if (typeof document === "undefined") return null;
  const parts = document.cookie.split(";").map((p) => p.trim());
  const match = parts.find((p) => p.startsWith(`${ADMIN_CSRF_COOKIE}=`));
  if (!match) return null;
  return decodeURIComponent(match.slice(ADMIN_CSRF_COOKIE.length + 1));
}

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onLogout() {
    setPending(true);
    setError(null);
    const csrfToken = readCsrfCookie();
    const consoleInstanceId = getOrCreateConsoleInstanceId();

    // Best-effort Offline before session revoke. TTL clears residual Online.
    clearPresenceIntent();
    try {
      await fetch("/api/admin/chat/presence/offline", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(csrfToken ? { [ADMIN_CSRF_HEADER]: csrfToken } : {}),
        },
        body: JSON.stringify({
          csrfToken,
          consoleInstanceId,
          notAfterMs: Date.now(),
        }),
        credentials: "same-origin",
        keepalive: true,
      });
    } catch {
      // ignore — logout must still proceed
    }

    try {
      const response = await fetch("/api/admin/auth/logout", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(csrfToken ? { [ADMIN_CSRF_HEADER]: csrfToken } : {}),
        },
        body: JSON.stringify({ csrfToken }),
        credentials: "same-origin",
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(data?.error ?? "Sign-out failed. Session may still be active.");
        setPending(false);
        return;
      }

      router.replace("/admin/login");
      router.refresh();
    } catch {
      setError("Sign-out failed. Check your connection and try again.");
      setPending(false);
    }
  }

  return (
    <div className={styles.logoutWrap}>
      <button
        className={styles.ghost}
        type="button"
        onClick={() => void onLogout()}
        disabled={pending}
      >
        {pending ? "Signing out…" : "Log out"}
      </button>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
