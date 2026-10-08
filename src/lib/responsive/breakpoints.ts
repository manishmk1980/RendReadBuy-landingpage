/**
 * Mobile-first breakpoints (min-width, px). CSS custom properties cannot be
 * used inside @media, so stylesheets repeat these literal values; keep both in
 * sync with the breakpoint table in `src/styles/tokens.css`.
 */
export const breakpoints = {
  sm: 480,
  md: 768,
  lg: 1024,
  xl: 1280,
  xxl: 1536,
} as const;

export type Breakpoint = keyof typeof breakpoints;

export function minWidth(bp: Breakpoint) {
  return `(min-width: ${breakpoints[bp]}px)`;
}
