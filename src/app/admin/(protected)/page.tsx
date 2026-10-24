import styles from "../admin.module.css";
import { OperatorConsole } from "./chat/OperatorConsole";

export const instant = false;

export default function AdminOverviewPage() {
  return (
    <>
      <section className={styles.panel} aria-labelledby="admin-home-title">
        <h1 id="admin-home-title" className={styles.title}>
          Silver Chat Administration
        </h1>
        <p className={styles.lede}>
          Campaign-local operator console for the RentReadBuy Silver membership
          site. This session does not grant Host Admin, platform Owner, or
          cross-tenant authorization. Installation activation and Chat Connect
          lifecycle credentials are Host/Owner controlled and are not exposed
          here.
        </p>
        <p className={styles.note}>
          This administration interface is not production-ready until unresolved
          campaign admin-auth hardening findings are closed (shared session
          revocation and login throttle across instances). Public membership,
          consent, and visitor chat widget behaviour are unchanged.
        </p>
      </section>
      <OperatorConsole />
    </>
  );
}
