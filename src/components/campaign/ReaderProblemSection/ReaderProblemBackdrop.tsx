"use client";

import { useRef } from "react";
import { usePointerParallax } from "@/hooks/usePointerParallax";

interface ReaderProblemBackdropProps {
  className?: string;
  imageClassName?: string;
}

/** Clipping frame for the artwork; the pointer drifts the image inside it. */
export function ReaderProblemBackdrop({ className, imageClassName }: ReaderProblemBackdropProps) {
  const ref = useRef<HTMLDivElement>(null);
  usePointerParallax(ref, { xVar: "--rp-px", yVar: "--rp-py" });

  return (
    <div ref={ref} className={className} aria-hidden="true" data-deferred-art="">
      <div className={imageClassName} />
    </div>
  );
}
