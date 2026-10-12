"use client";

import type { CSSProperties } from "react";
import { usePointerParallax } from "@/hooks/usePointerParallax";
import { useScrollProgress } from "@/hooks/useScrollProgress";

interface ReadingEssentialsBackdropProps {
  src: string;
  className?: string;
  imageClassName?: string;
}

/**
 * Clipping frame for the artwork. Scroll progress and the pointer both drift
 * the image inside it; the frame itself, and the carousel above it, never move.
 */
export function ReadingEssentialsBackdrop({
  src,
  className,
  imageClassName,
}: ReadingEssentialsBackdropProps) {
  const ref = useScrollProgress<HTMLDivElement>();
  usePointerParallax(ref, { xVar: "--re-px", yVar: "--re-py" });

  return (
    <div ref={ref} className={className} aria-hidden="true" data-deferred-art="">
      <div className={imageClassName} style={{ "--re-art": `url("${src}")` } as CSSProperties} />
    </div>
  );
}
