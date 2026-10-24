"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ADMIN_CSRF_HEADER } from "@/lib/adminAuth/constants";
import styles from "../admin.module.css";

export function LoginForm({
  csrfToken,
  configured,
  initialError,
}: {
  csrfToken: string | null;
  configured: boolean;
  initialError: string | null;
}) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(initialError);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!configured || !csrfToken) {
      setError("Admin login is not configured on this server.");
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

      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Sign-in failed. Check your connection and try again.");
      setPending(false);
    }
  }

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

      <button className={styles.submit} type="submit" disabled={pending || !configured || !csrfToken}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
