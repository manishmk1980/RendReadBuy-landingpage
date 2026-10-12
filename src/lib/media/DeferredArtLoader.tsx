"use client";

import { useEffect } from "react";

/**
 * Mounted once, at the end of the page rather than in the root layout: the
 * layout hydrates first, and changing the backdrops' attributes before the
 * page's sections hydrate causes a hydration mismatch.
 * Section artwork is CSS background-image,
 * which the browser fetches for every rendered element at load. Backdrops
 * marked `data-deferred-art` keep their artwork suppressed (globals.css)
 * until they come within one viewport of the screen, so the hero's layers
 * are not competing with below-the-fold scenes.
 */
export function DeferredArtLoader() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-deferred-art", "ready");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "100% 0px" },
    );
    document
      .querySelectorAll('[data-deferred-art=""]')
      .forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return null;
}
