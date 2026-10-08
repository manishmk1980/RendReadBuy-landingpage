import Image from "next/image";
import { brand } from "@/config/brand";
import { campaignCopy } from "@/config/campaign";
import { links } from "@/config/links";
import { trackingAttributes } from "@/lib/analytics";
import styles from "./CampaignHeader.module.css";

export function CampaignHeader() {
  const { memberPrompt, signIn } = campaignCopy.header;

  return (
    <header className={styles.header}>
      {brand.logo && (
        <a href={links.home.href} className={styles.logoLink}>
          <Image
            src={brand.logo.src}
            alt={brand.logo.alt}
            width={brand.logo.width}
            height={brand.logo.height}
            sizes="180px"
            quality={90}
            preload
            className={styles.logo}
          />
        </a>
      )}
      <p className={styles.member}>
        {memberPrompt}{" "}
        <a
          href={links.signIn.href}
          className={styles.signIn}
          {...trackingAttributes("sign_in_click", { placement: "header" })}
        >
          {signIn}
          <span aria-hidden="true">→</span>
        </a>
      </p>
    </header>
  );
}
