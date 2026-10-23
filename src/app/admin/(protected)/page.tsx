import styles from "../admin.module.css";

export const instant = false;

export default function AdminOverviewPage() {
  return (
    <section className={styles.panel} aria-labelledby="admin-home-title">
      <h1 id="admin-home-title" className={styles.title}>
        Silver Chat Administration
      </h1>
      <p className={styles.lede}>
        Campaign-local operator console for the RentReadBuy Silver membership site.
        This session does not grant Host Admin, platform Owner, or cross-tenant
        authorization.
      </p>
      <p className={styles.note}>
        Conversation inbox, reply, and presence controls are not available yet.
        They remain blocked until the approved Silver-specific central integration
        credential and scopes are bound for this campaign. The public Silver chat
        widget and membership workflows are unchanged.
      </p>
    </section>
  );
}
