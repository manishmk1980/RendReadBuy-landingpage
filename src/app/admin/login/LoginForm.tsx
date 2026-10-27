"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ADMIN_CSRF_HEADER } from "@/lib/adminAuth/constants";
import { clearPresenceIntent } from "@/lib/chatOps/presenceIntent";
import styles from "../admin.module.css";

const CSRF_INIT_ERROR =
  "Could not initialize secure sign-in. Refresh the page and try again.";

type CsrfStatus = "idle" | "loading" | "ready" | "error";

export function LoginForm({
  configured,
  initialError,
}: {
  configured: boolean;
  initialError: string | null;
}) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [csrfStatus, setCsrfStatus] = useState<CsrfStatus>(
    configured ? "loading" : "idle",
  );
  const [error, setError] = useState<string | null>(initialError);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!configured) return;

    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch("/api/admin/auth/csrf", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        });
        const data = (await response.json().catch(() => null)) as {
          csrfToken?: unknown;
          error?: string;
        } | null;

        if (cancelled) return;

        if (
          !response.ok ||
          !data ||
          typeof data.csrfToken !== "string" ||
          data.csrfToken.length === 0
        ) {
          setCsrfToken(null);
          setCsrfStatus("error");
          // Never bypass CSRF; surface a fixed message (do not trust error bodies).
          setError((prev) => prev ?? CSRF_INIT_ERROR);
          return;
        }

        setCsrfToken(data.csrfToken);
        setCsrfStatus("ready");
      } catch {
        if (cancelled) return;
        setCsrfToken(null);
        setCsrfStatus("error");
        setError((prev) => prev ?? CSRF_INIT_ERROR);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [configured]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!configured) {
      setError("Admin login is not configured on this server.");
      return;
    }

    if (!csrfToken || csrfStatus !== "ready") {
      setError(CSRF_INIT_ERROR);
      return;
    }

    setPending(true);
    try {
      const response = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          [ADMIN_CSRF_HEADER]: csrfToken,
        },
        body: JSON.stringify({ username, password, csrfToken }),
        credentials: "same-origin",
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Sign-in failed.");
        setPending(false);
        return;
      }

      // Fresh login: clear prior Online confirmation so the console announces
      // newly established Online rather than a restore after remount.
      clearPresenceIntent();
      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Sign-in failed. Check your connection and try again.");
      setPending(false);
    }
  }

  const submitDisabled =
    pending || !configured || csrfStatus !== "ready" || !csrfToken;

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      <label className={styles.label}>
        Username
        <input
          className={styles.input}
          name="username"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          disabled={pending || !configured}
        />
      </label>

      <label className={styles.label}>
        Password
        <input
          className={styles.input}
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={pending || !configured}
        />
      </label>

      <button className={styles.submit} type="submit" disabled={submitDisabled}>
        {pending
          ? "Signing in…"
          : csrfStatus === "loading"
            ? "Preparing secure sign-in…"
            : "Sign in"}
      </button>
    </form>
  );
}
