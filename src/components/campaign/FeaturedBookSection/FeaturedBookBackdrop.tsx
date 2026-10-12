"use client";

import type { CSSProperties, ReactNode } from "react";
import { usePointerParallax } from "@/hooks/usePointerParallax";
import { useScrollProgress } from "@/hooks/useScrollProgress";

interface FeaturedBookBackdropProps {
  src: string;
  className?: string;
  imageClassName?: string;
  /** Drawn inside the artwork layer so it stays registered through drift. */
  children?: ReactNode;
}

/**
 * Clipping frame for the artwork. Scroll progress and the pointer both drift
 * the image inside it; the frame itself never moves.
 */
export function FeaturedBookBackdrop({
  src,
  className,
  imageClassName,
  children,
}: FeaturedBookBackdropProps) {
  const ref = useScrollProgress<HTMLDivElement>();
  usePointerParallax(ref, { xVar: "--fb-px", yVar: "--fb-py" });

  return (
    <div ref={ref} className={className} aria-hidden="true" data-deferred-art="">
      <div
        className={imageClassName}
        style={{ "--fb-art": `url("${src}")` } as CSSProperties}
      >
        {children}
      </div>
    </div>
  );
}
