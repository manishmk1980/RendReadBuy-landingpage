"use client";

import { usePointerParallax } from "@/hooks/usePointerParallax";
import { useScrollProgress } from "@/hooks/useScrollProgress";

interface GiftBackdropProps {
  className?: string;
  imageClassName?: string;
}

/**
 * Clipping frame for the artwork. Scroll progress and the pointer both drift
 * the image inside it; the frame itself never moves.
 */
export function GiftBackdrop({ className, imageClassName }: GiftBackdropProps) {
  const ref = useScrollProgress<HTMLDivElement>();
  usePointerParallax(ref, { xVar: "--gf-px", yVar: "--gf-py" });

  return (
    <div ref={ref} className={className} aria-hidden="true" data-deferred-art="">
      <div className={imageClassName} />
    </div>
  );
}
