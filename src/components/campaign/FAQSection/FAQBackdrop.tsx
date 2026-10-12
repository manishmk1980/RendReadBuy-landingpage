"use client";

import type { CSSProperties } from "react";
import { usePointerParallax } from "@/hooks/usePointerParallax";
import { useScrollProgress } from "@/hooks/useScrollProgress";

interface FAQBackdropProps {
  src: string;
  className?: string;
  imageClassName?: string;
}

/**
 * Clipping frame for the artwork. Scroll progress and the pointer both drift
 * the image inside it; the frame itself, and the accordion above it, never move.
 */
export function FAQBackdrop({ src, className, imageClassName }: FAQBackdropProps) {
  const ref = useScrollProgress<HTMLDivElement>();
  usePointerParallax(ref, { xVar: "--faq-px", yVar: "--faq-py" });

  return (
    <div ref={ref} className={className} aria-hidden="true" data-deferred-art="">
      <div className={imageClassName} style={{ "--faq-art": `url("${src}")` } as CSSProperties} />
    </div>
  );
}
