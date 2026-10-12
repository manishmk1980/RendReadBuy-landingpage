"use client";

import type { ReactNode } from "react";
import { useInView } from "@/hooks/useInView";

interface FeaturedBookRevealProps {
  className?: string;
  /** Share of the group that must be on screen before it reveals. */
  threshold?: number;
  children: ReactNode;
}

/**
 * Flags its group once it is genuinely on screen; the entrance itself is CSS.
 * The intro and the book panel are observed separately, so neither plays
 * while it is still below the fold.
 */
export function FeaturedBookReveal({
  className,
  threshold = 0.4,
  children,
}: FeaturedBookRevealProps) {
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
