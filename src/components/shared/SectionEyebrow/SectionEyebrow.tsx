import type { ReactNode } from "react";
import styles from "./SectionEyebrow.module.css";

interface SectionEyebrowProps {
  children: ReactNode;
  className?: string;
}

export function SectionEyebrow({ children, className }: SectionEyebrowProps) {
  return (
    <p className={[styles.eyebrow, className].filter(Boolean).join(" ")}>
      {children}
    </p>
  );
}
