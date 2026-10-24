"use client";

import { useEffect } from "react";

/**
 * Refreshes the double-submit CSRF cookie for logout and admin mutations.
 * Cookie mutation must happen via the Route Handler, not Server Component render.
 */
export function CsrfBootstrap() {
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/admin/auth/csrf", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!response.ok || cancelled) return;
        // Set-Cookie applies the readable CSRF cookie for client double-submit.
        await response.json().catch(() => null);
      } catch {
        // Fail closed: mutations without a valid CSRF cookie are rejected.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
