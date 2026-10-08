import { campaignCopy } from "@/config/campaign";
import { links } from "@/config/links";

export function CampaignFooter() {
  const copy = campaignCopy.footer;
  const legalLinks = [
    { label: copy.terms, href: links.terms.href },
    { label: copy.privacy, href: links.privacy.href },
    { label: copy.returns, href: links.returns.href },
    { label: copy.support, href: links.support.href },
  ];

  return (
    <footer>
      <nav aria-label="Legal and support">
        <ul>
          {legalLinks.map((item) => (
            <li key={item.label}>
              <a href={item.href}>{item.label}</a>
            </li>
          ))}
        </ul>
      </nav>
      <p>© {copy.copyrightHolder}</p>
    </footer>
  );
}
