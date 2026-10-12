import { RRB_BASE_URL } from "@/config/rrbOrigin";

/** Acquisition parameters carried from the landing URL to RentReadBuy. */
const PASSTHROUGH_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "gclid",
  "gbraid",
  "wbraid",
  "fbclid",
] as const;

/**
 * `off` when this page and RentReadBuy share one GA4 property: the shared
 * cookie already carries the landing session's attribution, and re-tagging
 * internal links would record a second campaign touch on rentreadbuy.com.
 */
const passthroughEnabled =
  process.env.NEXT_PUBLIC_ATTRIBUTION_PASSTHROUGH?.trim().toLowerCase() !== "off";

const rrbHost = new URL(RRB_BASE_URL).hostname.replace(/^www\./, "");

function isRentReadBuyUrl(url: URL) {
  return url.hostname.replace(/^www\./, "") === rrbHost;
}

/**
 * Copies the landing page's UTM and ad click IDs onto every link to the
 * RentReadBuy platform, so checkout can record which campaign a member came
 * from. Parameters already on a link are never overwritten.
 */
export function decorateOutboundLinks(root: ParentNode = document) {
  if (!passthroughEnabled) return;
  const incoming = new URLSearchParams(window.location.search);
  const carried = PASSTHROUGH_PARAMS.flatMap((key) => {
    const value = incoming.get(key);
    return value ? [[key, value] as const] : [];
  });
  if (carried.length === 0) return;

  for (const anchor of root.querySelectorAll<HTMLAnchorElement>("a[href]")) {
    let url: URL;
    try {
      url = new URL(anchor.href);
    } catch {
      continue;
    }
    if (!isRentReadBuyUrl(url)) continue;
    for (const [key, value] of carried) {
      if (!url.searchParams.has(key)) url.searchParams.set(key, value);
    }
    anchor.href = url.toString();
  }
}
