import Image from "next/image";
import { brand } from "@/config/brand";
import { campaignCopy } from "@/config/campaign";
import { links, socialProfiles } from "@/config/links";
import { CookieSettingsButton } from "@/components/campaign/Consent";
import { trackingAttributes } from "@/lib/analytics";
import { SocialIcon } from "./SocialIcon";
import styles from "./CampaignFooter.module.css";

/** A calm sign-off: the official logo, legal and support links, social profiles, copyright. */
export function CampaignFooter() {
  const copy = campaignCopy.footer;
  const legalLinks = [
    { key: "terms", label: copy.terms, href: links.terms.href },
    { key: "privacy", label: copy.privacy, href: links.privacy.href },
    { key: "returns", label: copy.returns, href: links.returns.href },
    { key: "support", label: copy.support, href: links.support.href },
  ];

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        {brand.logo && (
          <a
            href={links.home.href}
            className={styles.logoLink}
            {...trackingAttributes("rentreadbuy_exit_click", {
              placement: "footer_logo",
              destination: "home",
            })}
          >
            <Image
              src={brand.logo.src}
              alt={brand.logo.alt}
              width={brand.logo.width}
              height={brand.logo.height}
              sizes="200px"
              quality={90}
              className={styles.logo}
            />
          </a>
        )}

        <ul className={styles.social} aria-label={copy.socialLabel}>
          {socialProfiles.map((profile) => (
            <li key={profile.network}>
              <a
                href={profile.href}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.socialLink}
                {...trackingAttributes("social_profile_click", {
                  placement: "footer",
                  network: profile.network,
                })}
              >
                <SocialIcon network={profile.network} className={styles.socialIcon} />
                <span className="visually-hidden">
                  {`${copy.socialLinkPrefix} ${profile.name} ${copy.newTabNotice}`}
                </span>
              </a>
            </li>
          ))}
        </ul>

        <div className={styles.meta}>
          <nav aria-label={copy.navLabel}>
            <ul className={styles.links}>
              {legalLinks.map((item) => (
                <li key={item.key} className={styles.item}>
                  <a
                    href={item.href}
                    className={styles.link}
                    {...trackingAttributes("rentreadbuy_exit_click", {
                      placement: "footer",
                      destination: item.key,
                    })}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
              <li className={styles.item}>
                <CookieSettingsButton className={styles.link}>
                  {copy.cookieSettings}
                </CookieSettingsButton>
              </li>
            </ul>
          </nav>
          <p className={styles.copyright}>
            © {copy.copyrightYear} {copy.copyrightHolder}
          </p>
        </div>
      </div>
    </footer>
  );
}
