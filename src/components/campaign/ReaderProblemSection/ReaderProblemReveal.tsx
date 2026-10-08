"use client";

import type { ReactNode } from "react";
import { useInView } from "@/hooks/useInView";

interface ReaderProblemRevealProps {
  className?: string;
  children: ReactNode;
}

/**
 * Flags the copy once a meaningful share of it is on screen; the entrance
 * itself is CSS. Must wrap the text group only: observing the full-height
 * section fired while the copy was still below the fold.
 */
export function ReaderProblemReveal({ className, children }: ReaderProblemRevealProps) {
  const [ref, inView] = useInView<HTMLDivElement>({
    rootMargin: "0px 0px -12% 0px",
    threshold: 0.35,
  });

  return (
    <div ref={ref} className={className} data-revealed={inView}>
      {children}
    </div>
  );
}
