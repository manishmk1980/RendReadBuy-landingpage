import type { MetadataRoute } from "next";
import { campaignMeta } from "@/config/campaign";

export default function robots(): MetadataRoute.Robots {
  const { siteUrl } = campaignMeta;
  return {
    rules: { userAgent: "*", allow: "/" },
    ...(siteUrl && { sitemap: new URL("/sitemap.xml", siteUrl).toString() }),
  };
}
