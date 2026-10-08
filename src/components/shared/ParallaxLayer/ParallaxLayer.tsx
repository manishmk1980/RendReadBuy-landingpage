import type { CSSProperties, ReactNode } from "react";
import type { DepthLayer } from "@/lib/motion/depth";

interface ParallaxLayerProps {
  depth: DepthLayer;
  children: ReactNode;
  /** Set false to keep the layer in its depth group without scroll movement. */
  parallax?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * Decorative depth layer inside a `CampaignSection`. Positioning comes from
 * the caller's `className`; z-index and scroll movement come from the depth
 * group (src/styles/motion.css). Never place text or controls in a layer.
 */
export function ParallaxLayer({
  depth,
  children,
  parallax = true,
  className,
  style,
}: ParallaxLayerProps) {
  return (
    <div
      aria-hidden="true"
      data-depth={depth}
      data-parallax={parallax ? "true" : "false"}
      className={className}
      style={style}
    >
      {children}
    </div>
  );
}
