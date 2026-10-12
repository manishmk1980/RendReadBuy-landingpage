"use client";

import type { CSSProperties } from "react";
import { usePointerParallax } from "@/hooks/usePointerParallax";
import { useScrollProgress } from "@/hooks/useScrollProgress";

interface FinalConversionBackdropProps {
  src: string;
  className?: string;
  imageClassName?: string;
}

/**
 * Clipping frame for the artwork. Scroll progress and the pointer both drift
 * the image inside it; the frame itself, and the conversion panel above it,
 * never move.
 */
export function FinalConversionBackdrop({
  src,
  className,
  imageClassName,
}: FinalConversionBackdropProps) {
  const ref = useScrollProgress<HTMLDivElement>();
  usePointerParallax(ref, { xVar: "--fc-px", yVar: "--fc-py" });

  return (
    <div ref={ref} className={className} aria-hidden="true" data-deferred-art="">
      <div className={imageClassName} style={{ "--fc-art": `url("${src}")` } as CSSProperties} />
    </div>
  );
}
