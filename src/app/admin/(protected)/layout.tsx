import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import { requireAdminPageSession } from "@/lib/adminAuth";
import styles from "../admin.module.css";
import { CsrfBootstrap } from "./CsrfBootstrap";
import { LogoutButton } from "./LogoutButton";

export const instant = false;

async function ProtectedChrome({ children }: { children: ReactNode }) {
  await connection();
  const session = await requireAdminPageSession();

  return (
    <>
      {/* CSRF cookie is issued by Route Handler — not during RSC render. */}
      <CsrfBootstrap />
      <div className={styles.meta}>
        <p className={styles.operator}>
          Signed in as <strong>{session.sub}</strong>
        </p>
        <LogoutButton />
      </div>
      {children}
    </>
  );
}

export default function ProtectedAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Suspense fallback={<section className={styles.panel}>Checking session…</section>}>
      <ProtectedChrome>{children}</ProtectedChrome>
    </Suspense>
  );
}
