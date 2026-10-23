"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ADMIN_CSRF_COOKIE, ADMIN_CSRF_HEADER } from "@/lib/adminAuth/constants";
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

  async function onLogout() {
    setPending(true);
    const csrfToken = readCsrfCookie();
    try {
      await fetch("/api/admin/auth/logout", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(csrfToken ? { [ADMIN_CSRF_HEADER]: csrfToken } : {}),
        },
        body: JSON.stringify({ csrfToken }),
        credentials: "same-origin",
      });
    } catch {
      // Still clear local navigation; server revocation happens when the call succeeds.
    }
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <button className={styles.ghost} type="button" onClick={onLogout} disabled={pending}>
      {pending ? "Signing out…" : "Log out"}
    </button>
  );
}
