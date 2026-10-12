"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { campaignCopy } from "@/config/campaign";
import styles from "./ReadingEssentialsSection.module.css";

interface ProductImageProps {
  src?: string;
  alt: string;
}

/**
 * Fixed 4:3 slot, so cards never shift. Shows the configured image, or a
 * quiet placeholder when none is configured or it fails to load.
 */
export function ProductImage({ src, alt }: ProductImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const showImage = Boolean(src) && failedSrc !== src;

  // A server-rendered image can fail before hydration attaches onError.
  useEffect(() => {
    const image = imageRef.current;
    if (src && image?.complete && image.naturalWidth === 0) setFailedSrc(src);
  }, [src]);

  return (
    <div className={styles.imageSlot}>
      {showImage && src ? (
        <Image
          ref={imageRef}
          className={styles.image}
          src={src}
          alt={alt}
          fill
          sizes="(min-width: 1200px) 17vw, (min-width: 768px) 45vw, 80vw"
          quality={85}
          // Merchant-hosted images are served as-is rather than proxied.
          unoptimized={/^https?:\/\//.test(src)}
          onError={() => setFailedSrc(src)}
        />
      ) : (
        <div className={styles.imagePlaceholder}>
          <PlaceholderIcon />
          <span>{campaignCopy.readingEssentials.imageComingSoon}</span>
        </div>
      )}
    </div>
  );
}

function PlaceholderIcon() {
  return (
    <svg viewBox="0 0 48 40" aria-hidden="true" className={styles.placeholderIcon}>
      <path d="M24 9.5c-4.6-3.3-10.7-4.5-18-4.3v26.6c7.3-.2 13.4 1 18 4.3 4.6-3.3 10.7-4.5 18-4.3V5.2c-7.3-.2-13.4 1-18 4.3Z" />
      <path d="M24 9.5v26.6M10.5 12.5c3.4.1 6.4.8 9 2M10.5 18.5c3.4.1 6.4.8 9 2M37.5 12.5c-3.4.1-6.4.8-9 2" />
    </svg>
  );
}
