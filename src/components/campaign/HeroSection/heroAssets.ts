/**
 * Extracted hero layers in public/assets/sections/hero/.
 * Served through the image optimizer as AVIF/WebP, both of which keep the
 * extracted alpha, at the width each layer actually renders.
 *
 * `hero-window-table.webp` shares the approved creative's canvas (1746 × 901
 * ≈ 1728 × 891), so it defines the scene coordinate system; every other layer
 * is placed relative to it in HeroSection.module.css.
 *
 * Below 1024px the scene always shows the same region of the canvas (x from
 * 39.4%, y from 30%), so layers that are mostly cropped there swap to a
 * pixel-exact crop of the same file (`mobile`), placed in the CSS so it lands
 * on the identical pixels. Layers never visible there swap to an empty source.
 */

/** Must match the media query of the crop placements in HeroSection.module.css. */
export const HERO_MOBILE_MEDIA = "(max-width: 1023px)";

export interface HeroMobileCrop {
  src: string;
  width: number;
  height: number;
  sizes: string;
}

export interface HeroAsset {
  src: string;
  width: number;
  height: number;
  /**
   * Rendered width: the layer's share (--w) of its plane. Below 1024px both
   * planes are 165vw wide; from 1024px the canvas reaches ~122vw at the
   * tallest hero and the stage is 100vw.
   */
  sizes: string;
  /**
   * Fetched at high priority: only the two environment layers that paint
   * the largest above-the-fold area. Everything else loads eagerly at
   * normal priority.
   */
  priority?: boolean;
  /** Source below 1024px: a crop of `src`, or nothing when the layer is off-screen there. */
  mobile?: HeroMobileCrop | "hidden";
}

export const heroAssets = {
  /** Mobile crop: source x 280–1280, y 400–724 (window glass plus motion margin). */
  mountain: {
    src: "/assets/sections/hero/hero-mountain-bg.webp",
    width: 2172,
    height: 724,
    sizes: "(min-width: 1024px) 132vw, 178vw",
    priority: true,
    mobile: {
      src: "/assets/sections/hero/hero-mountain-bg-mobile.webp",
      width: 1000,
      height: 324,
      sizes: "83vw",
    },
  },
  /** Mobile crop: source x 680–1746, y 264–901 (the visible region plus a few pixels). */
  windowTable: {
    src: "/assets/sections/hero/hero-window-table.webp",
    width: 1746,
    height: 901,
    sizes: "(min-width: 1024px) 122vw, 165vw",
    priority: true,
    mobile: {
      src: "/assets/sections/hero/hero-window-table-mobile.webp",
      width: 1066,
      height: 637,
      sizes: "101vw",
    },
  },
  plant: {
    src: "/assets/sections/hero/hero-plant.webp",
    width: 1306,
    height: 870,
    sizes: "(min-width: 1024px) 12vw, 19vw",
  },
  mug: {
    src: "/assets/sections/hero/hero-mug.webp",
    width: 1536,
    height: 1024,
    sizes: "(min-width: 1024px) 10vw, 16vw",
  },
  bookStack: {
    src: "/assets/sections/hero/hero-book-stack.webp",
    width: 1536,
    height: 1024,
    sizes: "(min-width: 1024px) 30vw, 50vw",
  },
  openBook: {
    src: "/assets/sections/hero/hero-open-book.webp",
    width: 1746,
    height: 901,
    sizes: "(min-width: 1024px) 53vw, 87vw",
  },
  /** Spans x −21% to 35% of the stage: entirely left of the mobile frame. */
  foliageLeft: {
    src: "/assets/sections/hero/hero-foliage-left.webp",
    width: 1268,
    height: 1241,
    sizes: "56vw",
    mobile: "hidden",
  },
  foliageRight: {
    src: "/assets/sections/hero/hero-foliage-right.webp",
    width: 1237,
    height: 1271,
    sizes: "(min-width: 1024px) 53vw, 87vw",
  },
} as const satisfies Record<string, HeroAsset>;
