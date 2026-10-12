"use client";

import { useRef } from "react";
import { usePointerParallax } from "@/hooks/usePointerParallax";

interface SilverBenefitsBackdropProps {
  className?: string;
  imageClassName?: string;
}

/** Clipping frame for the artwork; the pointer drifts the image inside it. */
export function SilverBenefitsBackdrop({ className, imageClassName }: SilverBenefitsBackdropProps) {
  const ref = useRef<HTMLDivElement>(null);
  usePointerParallax(ref, { xVar: "--sb-px", yVar: "--sb-py" });

  return (
    <div ref={ref} className={className} aria-hidden="true" data-deferred-art="">
      <div className={imageClassName} />
    </div>
  );
}
