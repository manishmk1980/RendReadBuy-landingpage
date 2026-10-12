"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface HeroAmbientControlProps {
  className?: string;
  iconClassName?: string;
}

/**
 * Pause control for the hero's looping ambient motion (WCAG 2.2.2): the
 * swaying leaves and plant, the drifting landscape and the shifting light.
 * It names the action it will perform, like its icon, so the label and
 * tooltip always match. It also pauses the loops while the hero is
 * off-screen. Both states are written to the hero section as data
 * attributes; the pausing itself is CSS. Not rendered under reduced motion,
 * or without JavaScript, where nothing loops.
 *
 * `data-pw-chat-avoid` tells the shared chat widget to lift its launcher
 * clear of this control. The widget never moves or hides the button.
 */
export function HeroAmbientControl({ className, iconClassName }: HeroAmbientControlProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const reducedMotion = useReducedMotion();
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const hero = ref.current?.closest("section");
    if (!hero) return;

    const observer = new IntersectionObserver((entries) => {
      // Fast scrolling can batch several entries; only the newest is current.
      hero.toggleAttribute("data-ambient-offscreen", !entries[entries.length - 1].isIntersecting);
    });
    observer.observe(hero);
    return () => {
      observer.disconnect();
      hero.removeAttribute("data-ambient-offscreen");
    };
  }, [reducedMotion]);

  useEffect(() => {
    const hero = ref.current?.closest("section");
    if (!hero) return;
    hero.toggleAttribute("data-ambient-paused", paused);
    return () => hero.removeAttribute("data-ambient-paused");
  }, [paused, reducedMotion]);

  if (reducedMotion) return null;

  const label = paused ? "Play scenery animation" : "Pause scenery animation";

  return (
    <button
      ref={ref}
      type="button"
      className={className}
      aria-label={label}
      title={label}
      data-pw-chat-avoid=""
      onClick={() => setPaused((value) => !value)}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className={iconClassName}>
        {paused ? <path d="M8.5 6.2v11.6L18 12 8.5 6.2Z" /> : <path d="M8.5 6.5v11M15.5 6.5v11" />}
      </svg>
    </button>
  );
}
