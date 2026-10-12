import type { MetadataRoute } from "next";
import { campaignMeta } from "@/config/campaign";

/** A single-page campaign; empty until the production hostname is configured. */
export default function sitemap(): MetadataRoute.Sitemap {
  const { siteUrl } = campaignMeta;
  return siteUrl ? [{ url: new URL("/", siteUrl).toString() }] : [];
}
