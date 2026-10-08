"use client";

import { useRef, type ReactNode } from "react";
import { usePointerParallax } from "@/hooks/usePointerParallax";

interface HeroSceneProps {
  className?: string;
  children: ReactNode;
}

/**
 * Decorative layer stack for the hero. Pointer position over the hero is
 * eased into `--hero-px` / `--hero-py` on this element; layers read those
 * variables in CSS (see usePointerParallax).
 */
export function HeroScene({ className, children }: HeroSceneProps) {
  const ref = useRef<HTMLDivElement>(null);
  usePointerParallax(ref, { xVar: "--hero-px", yVar: "--hero-py" });

  return (
    <div ref={ref} className={className} aria-hidden="true">
      {children}
    </div>
  );
}
