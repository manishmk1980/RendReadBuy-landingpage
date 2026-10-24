import { connection } from "next/server";
import { Suspense } from "react";
import { isAdminAuthConfigured, issueCsrfCookie } from "@/lib/adminAuth";
import styles from "../admin.module.css";
import { LoginForm } from "./LoginForm";

export const instant = false;

function mapError(code: string | undefined, configured: boolean): string | null {
  if (!configured) {
    return "Admin login is not configured on this server.";
  }
  switch (code) {
    case "not_configured":
      return "Admin login is not configured on this server.";
    case "auth_required":
      return "Sign in to continue.";
    default:
      return null;
  }
}

async function LoginPanel({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const configured = isAdminAuthConfigured();
  const csrfToken = configured ? await issueCsrfCookie(process.env.NODE_ENV === "production") : null;
  const params = await searchParams;
  const raw = params.error;
  const errorCode = Array.isArray(raw) ? raw[0] : raw;
  const initialError = mapError(errorCode, configured);

  return (
    <section className={styles.panel} aria-labelledby="admin-login-title">
      <h1 id="admin-login-title" className={styles.title}>
        Operator sign-in
      </h1>
      <p className={styles.lede}>
        Silver chat administration for this campaign site. Credentials stay on the server;
        this login does not grant RentReadBuy Host or platform Owner access.
      </p>
      <LoginForm csrfToken={csrfToken} configured={configured} initialError={initialError} />
    </section>
  );
}

export default function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<section className={styles.panel}>Loading sign-in…</section>}>
      <LoginPanel searchParams={searchParams} />
    </Suspense>
  );
}
