"use client";

import type { ReactNode } from "react";
import { useInView } from "@/hooks/useInView";

interface FAQRevealProps {
  className?: string;
  /** Share of the group that must be on screen before it reveals. */
  threshold?: number;
  children: ReactNode;
}

/**
 * Flags its group once it is genuinely on screen; the entrance itself is CSS.
 * The intro and the accordion are observed separately, so neither plays while
 * it is still below the fold.
 */
export function FAQReveal({ className, threshold = 0.4, children }: FAQRevealProps) {
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
