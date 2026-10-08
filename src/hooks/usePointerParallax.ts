"use client";

import { useEffect, type RefObject } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const FINE_POINTER_QUERY = "(hover: hover) and (pointer: fine)";
/** Fraction of the remaining distance covered per frame (~60fps). */
const EASING = 0.075;
const SETTLE_EPSILON = 0.0005;

interface PointerParallaxOptions {
  /** Custom properties written on the target, each eased within -1..1. */
  xVar: string;
  yVar: string;
}

/**
 * Pointer-parallax controller: one rAF loop eases the pointer position over
 * the target's parent (normalised to -1..1 around its centre) into two custom
 * properties on the target. CSS turns those into transforms, so pointer
 * movement never re-renders React.
 *
 * Disabled for touch/coarse pointers and reduced motion; the variables are
 * then removed, so layers rest at 0.
 */
export function usePointerParallax<T extends HTMLElement>(
  ref: RefObject<T | null>,
  { xVar, yVar }: PointerParallaxOptions,
) {
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const target = ref.current;
    const host = target?.parentElement;
    if (!target || !host) return;

    const finePointer = window.matchMedia(FINE_POINTER_QUERY);
    let frame = 0;
    let current = { x: 0, y: 0 };
    let goal = { x: 0, y: 0 };

    const write = () => {
      target.style.setProperty(xVar, current.x.toFixed(4));
      target.style.setProperty(yVar, current.y.toFixed(4));
    };

    const tick = () => {
      current = {
        x: current.x + (goal.x - current.x) * EASING,
        y: current.y + (goal.y - current.y) * EASING,
      };
      const settled =
        Math.abs(goal.x - current.x) < SETTLE_EPSILON &&
        Math.abs(goal.y - current.y) < SETTLE_EPSILON;
      if (settled) current = { ...goal };
      write();
      frame = settled ? 0 : requestAnimationFrame(tick);
    };

    const start = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const rect = host.getBoundingClientRect();
      const clamp = (value: number) => Math.min(1, Math.max(-1, value));
      goal = {
        x: clamp(((event.clientX - rect.left) / rect.width) * 2 - 1),
        y: clamp(((event.clientY - rect.top) / rect.height) * 2 - 1),
      };
      start();
    };

    const onLeave = () => {
      goal = { x: 0, y: 0 };
      start();
    };

    const reset = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      current = { x: 0, y: 0 };
      goal = { x: 0, y: 0 };
      target.style.removeProperty(xVar);
      target.style.removeProperty(yVar);
    };

    const attach = () => {
      host.addEventListener("pointermove", onMove, { passive: true });
      host.addEventListener("pointerleave", onLeave);
    };

    const detach = () => {
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      reset();
    };

    const sync = () => {
      detach();
      if (!reducedMotion && finePointer.matches) attach();
    };

    sync();
    finePointer.addEventListener("change", sync);
    return () => {
      finePointer.removeEventListener("change", sync);
      detach();
    };
  }, [ref, xVar, yVar, reducedMotion]);
}
