"use client";

import { useEffect, useRef, type RefObject } from "react";
import { useReducedMotion } from "./useReducedMotion";

/**
 * JS fallback for scroll-linked effects that CSS scroll-driven animations
 * cannot express. Prefer `ParallaxLayer` (pure CSS) where possible.
 *
 * Writes the element's viewport progress (0 when its top meets the viewport
 * bottom, 1 when its bottom leaves the viewport top) to the `--scroll-progress`
 * custom property. It never triggers React re-renders and is disabled under
 * reduced motion.
 */
export function useScrollProgress<T extends HTMLElement>(): RefObject<T | null> {
  const ref = useRef<T>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (reducedMotion) {
      element.style.removeProperty("--scroll-progress");
      return;
    }

    let frame = 0;
    let active = false;

    const update = () => {
      frame = 0;
      const rect = element.getBoundingClientRect();
      const viewport = window.innerHeight;
      const progress = (viewport - rect.top) / (viewport + rect.height);
      element.style.setProperty(
        "--scroll-progress",
        Math.min(1, Math.max(0, progress)).toFixed(4),
      );
    };

    const onScroll = () => {
      if (active && !frame) frame = requestAnimationFrame(update);
    };

    const observer = new IntersectionObserver(([entry]) => {
      active = entry.isIntersecting;
      if (active) onScroll();
    });
    observer.observe(element);

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [reducedMotion]);

  return ref;
}
