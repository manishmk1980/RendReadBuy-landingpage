"use client";

import { useRef } from "react";
import { usePointerParallax } from "@/hooks/usePointerParallax";

interface ReaderFitBackdropProps {
  className?: string;
  imageClassName?: string;
}

/** Clipping frame for the artwork; the pointer drifts the image inside it. */
export function ReaderFitBackdrop({ className, imageClassName }: ReaderFitBackdropProps) {
  const ref = useRef<HTMLDivElement>(null);
  usePointerParallax(ref, { xVar: "--rf-px", yVar: "--rf-py" });

  return (
    <div ref={ref} className={className} aria-hidden="true" data-deferred-art="">
      <div className={imageClassName} />
    </div>
  );
}
