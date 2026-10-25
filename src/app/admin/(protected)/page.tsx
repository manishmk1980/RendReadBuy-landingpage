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
          site. Surfaces: Overview, Conversations, Operator Availability, and
          Diagnostics. This session does not grant Host Admin, platform Owner,
          or cross-tenant authorization. Archive/delete and Settings are not in
          this wave. Installation activation and Chat Connect lifecycle
          credentials are Host/Owner controlled and are not exposed here.
        </p>
        <p className={styles.note}>
          This administration interface is not production-ready until unresolved
          campaign admin-auth hardening findings are closed (shared session
          revocation and login throttle across instances). Public membership,
          consent, and visitor chat widget behaviour are unchanged. Admin
          surfaces target WCAG 2.2 AA (keyboard tabs, labelled controls, focus
          visibility, status and alert roles).
        </p>
      </section>
      <OperatorConsole />
    </>
  );
}
