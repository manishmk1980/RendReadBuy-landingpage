"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { campaignCopy } from "@/config/campaign";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import styles from "./ReadingEssentialsSection.module.css";

/** Cards shown at once on wide desktop; used only as the pre-hydration guess. */
const DESKTOP_VISIBLE = 3;
/** Quiet period after the last scroll event that ends a navigation. */
const SETTLE_MS = 160;

interface CarouselState {
  start: number;
  visible: number;
  canPrev: boolean;
  canNext: boolean;
}

interface ProductCarouselProps {
  count: number;
  /** One list whose items are the slides. */
  children: ReactNode;
}

/**
 * Bounded, user-driven carousel over a native scroll-snap track, so swipe,
 * trackpad and no-JS scrolling all work. The arrows move one product at a
 * time and are disabled at either end; with nothing to scroll they hide.
 */
export function ProductCarousel({ count, children }: ProductCarouselProps) {
  const copy = campaignCopy.readingEssentials;
  const viewportId = useId();
  const viewportRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<number | null>(null);
  const reducedMotion = useReducedMotion();
  const [state, setState] = useState<CarouselState>({
    start: 0,
    visible: Math.min(count, DESKTOP_VISIBLE),
    canPrev: false,
    canNext: count > DESKTOP_VISIBLE,
  });

  const geometry = useCallback(() => {
    const viewport = viewportRef.current;
    const items = viewport?.firstElementChild?.children;
    if (!viewport || !items?.length) return null;
    const first = items[0] as HTMLElement;
    const second = items[1] as HTMLElement | undefined;
    const step = second ? second.offsetLeft - first.offsetLeft : first.offsetWidth;
    const max = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
    return { viewport, step, gap: step - first.offsetWidth, max };
  }, []);

  const measure = useCallback(() => {
    const g = geometry();
    if (!g || g.step <= 0) return;
    const { viewport, step, gap, max } = g;
    const next: CarouselState = {
      start: Math.min(count - 1, Math.round(viewport.scrollLeft / step)),
      visible: Math.max(1, Math.min(count, Math.floor((viewport.clientWidth + gap + 1) / step))),
      canPrev: viewport.scrollLeft > 1,
      canNext: viewport.scrollLeft < max - 1,
    };
    setState((prev) =>
      prev.start === next.start &&
      prev.visible === next.visible &&
      prev.canPrev === next.canPrev &&
      prev.canNext === next.canNext
        ? prev
        : next,
    );
  }, [count, geometry]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    let frame = 0;
    let settle = 0;
    const onScroll = () => {
      if (!frame) {
        frame = requestAnimationFrame(() => {
          frame = 0;
          measure();
        });
      }
      window.clearTimeout(settle);
      settle = window.setTimeout(() => {
        targetRef.current = null;
      }, SETTLE_MS);
    };

    const resize = new ResizeObserver(measure);
    resize.observe(viewport);
    viewport.addEventListener("scroll", onScroll, { passive: true });
    measure();
    return () => {
      resize.disconnect();
      viewport.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
      window.clearTimeout(settle);
    };
  }, [measure]);

  const go = (direction: -1 | 1) => {
    const g = geometry();
    if (!g || g.step <= 0) return;
    const { viewport, step, max } = g;
    const last = Math.ceil((max - 1) / step);
    const base = targetRef.current ?? Math.round(viewport.scrollLeft / step);
    const target = Math.min(last, Math.max(0, base + direction));
    targetRef.current = target;
    viewport.scrollTo({
      left: Math.min(target * step, max),
      behavior: reducedMotion ? "auto" : "smooth",
    });
  };

  const end = Math.min(count, state.start + state.visible);

  return (
    <div
      className={styles.carousel}
      role="region"
      aria-roledescription="carousel"
      aria-label={copy.carouselLabel}
      data-overflowing={state.canPrev || state.canNext}
    >
      <NavButton
        direction="previous"
        label={copy.previous}
        controls={viewportId}
        disabled={!state.canPrev}
        onClick={() => go(-1)}
      />
      <div id={viewportId} ref={viewportRef} className={styles.viewport}>
        {children}
      </div>
      <NavButton
        direction="next"
        label={copy.next}
        controls={viewportId}
        disabled={!state.canNext}
        onClick={() => go(1)}
      />
      <p className="visually-hidden" aria-live="polite">
        {`Showing ${state.start + 1}${end > state.start + 1 ? `–${end}` : ""} of ${count}`}
      </p>
    </div>
  );
}

interface NavButtonProps {
  direction: "previous" | "next";
  label: string;
  controls: string;
  disabled: boolean;
  onClick: () => void;
}

/** aria-disabled rather than disabled, so focus is not lost at either end. */
function NavButton({ direction, label, controls, disabled, onClick }: NavButtonProps) {
  return (
    <button
      type="button"
      className={styles.nav}
      data-direction={direction}
      aria-label={label}
      aria-controls={controls}
      aria-disabled={disabled}
      onClick={disabled ? undefined : onClick}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d={direction === "previous" ? "M14.5 6 8.5 12l6 6" : "M9.5 6l6 6-6 6"} />
      </svg>
    </button>
  );
}
