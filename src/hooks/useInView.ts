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

    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting && entry.intersectionRatio >= minRatio;
        setInView(visible);
        if (visible && once) observer.disconnect();
      },
      { rootMargin, threshold },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [rootMargin, threshold, once]);

  return [ref, inView];
}
