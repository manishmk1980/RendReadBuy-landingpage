"use client";

import type { ReactNode } from "react";
import { useInView } from "@/hooks/useInView";

interface SilverCycleRevealProps {
  className?: string;
  /** Share of the group that must be on screen before it reveals. */
  threshold?: number;
  children: ReactNode;
}

/**
 * Flags its group once it is genuinely on screen; the entrance itself is CSS.
 * Each content group (intro, steps, reassurance) is observed on its own so
 * nothing plays while it is still below the fold.
 */
export function SilverCycleReveal({ className, threshold = 0.35, children }: SilverCycleRevealProps) {
  const [ref, inView] = useInView<HTMLDivElement>({
    rootMargin: "0px 0px -12% 0px",
    threshold,
  });

  return (
    <div ref={ref} className={className} data-revealed={inView}>
      {children}
    </div>
  );
}
