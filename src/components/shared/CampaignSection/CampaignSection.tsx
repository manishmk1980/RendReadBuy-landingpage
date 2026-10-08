import type { ReactNode } from "react";
import { getSection, type CampaignSectionKey } from "@/config/campaign";

interface CampaignSectionProps {
  section: CampaignSectionKey;
  children?: ReactNode;
  /** id of the visible heading; falls back to the configured aria-label. */
  labelledBy?: string;
  className?: string;
}

/**
 * Semantic wrapper for one narrative step. Acts as the positioning context
 * for its depth layers and transitions (see `.campaign-section`).
 */
export function CampaignSection({
  section,
  children,
  labelledBy,
  className,
}: CampaignSectionProps) {
  const { id, label } = getSection(section);

  return (
    <section
      id={id}
      data-section={section}
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : label}
      className={["campaign-section", className].filter(Boolean).join(" ")}
    >
      {children}
    </section>
  );
}
