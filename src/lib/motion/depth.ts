/**
 * Visual depth groups used by every layered section. Values mirror the
 * `--parallax-*` and `--z-*` tokens in `src/styles/tokens.css`; CSS is the
 * source of truth for rendering, this module exists for typed props and any
 * justified JS-driven motion.
 */

export const depthLayers = [
  "far",
  "mid",
  "scene",
  "object",
  "foreground",
] as const;

export type DepthLayer = (typeof depthLayers)[number];

/** Relative parallax strength per layer (content/CTA layers do not move). */
export const parallaxStrength: Record<DepthLayer, number> = {
  far: 0.15,
  mid: 0.3,
  scene: 0.45,
  object: 0.65,
  foreground: 1,
};
