import type { CSSProperties } from "react";
import Image from "next/image";
import styles from "./TornPaperTransition.module.css";

interface TornPaperTransitionProps {
  /** Supplied torn-paper artwork (alpha WebP/PNG or SVG). */
  src: string;
  width: number;
  height: number;
  edge: "top" | "bottom";
  /** How far the artwork extends past the section edge, e.g. "50%" or "2rem". */
  overlap?: string;
  /** Rows of empty padding above the paper in the source, left out of the layout box. */
  trimTop?: number;
  className?: string;
}

/**
 * Torn-paper edge that visually bridges two sections. Rendered inside the
 * section it belongs to and offset across the boundary, so the DOM stays
 * one clean section per narrative step.
 *
 * Geometry and motion are tuned from the owning section's CSS through
 * --tear-* custom properties (see the module CSS).
 */
export function TornPaperTransition({
  src,
  width,
  height,
  edge,
  overlap,
  trimTop = 0,
  className,
}: TornPaperTransitionProps) {
  const paperHeight = height - trimTop;
  const style = {
    "--tear-ratio": width / paperHeight,
    "--tear-trim": height / paperHeight,
    ...(overlap ? { "--tear-overlap": overlap } : {}),
  } as CSSProperties;

  return (
    <div
      aria-hidden="true"
      className={[styles.transition, className].filter(Boolean).join(" ")}
      data-edge={edge}
      style={style}
    >
      <Image
        src={src}
        alt=""
        width={width}
        height={height}
        sizes="100vw"
        quality={85}
        loading="eager"
        draggable={false}
        className={styles.image}
      />
    </div>
  );
}
