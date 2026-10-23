import type { Metadata } from "next";
import type { ReactNode } from "react";
import styles from "./admin.module.css";

export const metadata: Metadata = {
  title: "Silver Chat Administration · RentReadBuy",
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Admin segment layout. Intentionally omits SharedChat / campaign footer so
 * the public widget never mounts on operator routes.
 */
export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <div className={styles.frame}>
        <header className={styles.brand}>
          <p className={styles.brandName}>RentReadBuy</p>
          <p className={styles.brandMark}>Silver membership campaign · chat operations</p>
        </header>
        {children}
      </div>
    </div>
  );
}
