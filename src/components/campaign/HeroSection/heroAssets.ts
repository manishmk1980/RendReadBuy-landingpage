/**
 * Extracted hero layers in public/assets/sections/hero/.
 * These are production WebPs. Serve them as-is so the extracted alpha is preserved.
 *
 * `hero-window-table.webp` shares the approved creative's canvas (1746 × 901
 * ≈ 1728 × 891), so it defines the scene coordinate system; every other layer
 * is placed relative to it in HeroSection.module.css.
 */

export interface HeroAsset {
  src: string;
  width: number;
  height: number;
  /**
   * Fetched at high priority: only the two environment layers that paint
   * the largest above-the-fold area. Everything else loads eagerly at
   * normal priority.
   */
  priority?: boolean;
}

export const heroAssets = {
  mountain: {
    src: "/assets/sections/hero/hero-mountain-bg.webp",
    width: 2172,
    height: 724,
    priority: true,
  },
  windowTable: {
    src: "/assets/sections/hero/hero-window-table.webp",
    width: 1746,
    height: 901,
    priority: true,
  },
  plant: {
    src: "/assets/sections/hero/hero-plant.webp",
    width: 1306,
    height: 870,
  },
  mug: {
    src: "/assets/sections/hero/hero-mug.webp",
    width: 1536,
    height: 1024,
  },
  bookStack: {
    src: "/assets/sections/hero/hero-book-stack.webp",
    width: 1536,
    height: 1024,
  },
  openBook: {
    src: "/assets/sections/hero/hero-open-book.webp",
    width: 1746,
    height: 901,
  },
  foliageLeft: {
    src: "/assets/sections/hero/hero-foliage-left.webp",
    width: 1268,
    height: 1241,
  },
  foliageRight: {
    src: "/assets/sections/hero/hero-foliage-right.webp",
    width: 1237,
    height: 1271,
  },
} as const satisfies Record<string, HeroAsset>;
