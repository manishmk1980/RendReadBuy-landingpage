"use client";

import type { ReactNode } from "react";
import { useInView } from "@/hooks/useInView";

interface FinalConversionRevealProps {
  className?: string;
  /** Share of the group that must be on screen before it reveals. */
  threshold?: number;
  children: ReactNode;
}

/**
 * Flags its group once it is genuinely on screen; the entrance itself is CSS.
 * The headline uses it for its entrance. The conversion panel uses it only to
 * time decorative cues (the price circle, the CTA sheen): nothing in the
 * panel is ever hidden or held back.
 */
export function FinalConversionReveal({
  className,
  threshold = 0.4,
  children,
}: FinalConversionRevealProps) {
  const [ref, inView] = useInView<HTMLDivElement>({
    rootMargin: "0px 0px -10% 0px",
    threshold,
  });

  return (
    <div ref={ref} className={className} data-revealed={inView}>
      {children}
    </div>
  );
}
