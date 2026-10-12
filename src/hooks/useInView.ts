"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

interface UseInViewOptions {
  rootMargin?: string;
  threshold?: number | number[];
  /** Stop observing after the element first enters the viewport. */
  once?: boolean;
}

export function useInView<T extends Element>({
  rootMargin = "0px",
  threshold = 0,
  once = true,
}: UseInViewOptions = {}): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // isIntersecting is true for any overlap, even below the threshold.
    const minRatio = Math.min(...[threshold].flat());

    /*
     * An element taller than the viewport ÷ minRatio (short landscape
     * screens, high zoom) can never reach minRatio, so it also counts once
     * it fills that share of the viewport. The extra steps keep callbacks
     * coming while it scrolls through.
     */
    const steps = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9].filter((step) => step < minRatio);

    const observer = new IntersectionObserver(
      (entries) => {
        // Fast scrolling can batch several entries; only the newest is current.
        const entry = entries[entries.length - 1];
        const fillsViewport =
          entry.rootBounds !== null &&
          entry.intersectionRect.height >= entry.rootBounds.height * minRatio;
        const visible =
          entry.isIntersecting && (entry.intersectionRatio >= minRatio || fillsViewport);
        setInView(visible);
        if (visible && once) observer.disconnect();
      },
      { rootMargin, threshold: [...steps, ...[threshold].flat()] },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [rootMargin, threshold, once]);

  return [ref, inView];
}
