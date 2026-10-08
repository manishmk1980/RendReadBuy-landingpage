import type { ElementType, ReactNode } from "react";
import styles from "./CampaignContainer.module.css";

interface CampaignContainerProps {
  children: ReactNode;
  as?: ElementType;
  width?: "default" | "narrow";
  className?: string;
}

/** Content column sitting in the `--z-content` layer above section artwork. */
export function CampaignContainer({
  children,
  as: Tag = "div",
  width = "default",
  className,
}: CampaignContainerProps) {
  return (
    <Tag
      className={[styles.container, className].filter(Boolean).join(" ")}
      data-width={width}
    >
      {children}
    </Tag>
  );
}
