import type { Metadata, Viewport } from "next";
import { Inter, Kalam, Literata } from "next/font/google";
import localFont from "next/font/local";
import Script from "next/script";
import { campaignMeta } from "@/config/campaign";
import { AnalyticsListener } from "@/lib/analytics/AnalyticsListener";
import { consentBootstrapSource } from "@/lib/analytics/consentMode";
import { ConsentModeSync } from "@/lib/analytics/ConsentModeSync";
import { TagManager } from "@/lib/analytics/TagManager";
import { SharedChat } from "@/lib/sharedChat/SharedChat";
import "@/styles/tokens.css";
import "@/styles/motion.css";
import "./globals.css";

const editorialSerif = Literata({
  subsets: ["latin"],
  axes: ["opsz"],
  variable: "--font-editorial-serif",
  display: "swap",
});

const cleanSans = Inter({
  subsets: ["latin"],
  variable: "--font-clean-sans",
  display: "swap",
});

/*
 * ₹ (U+20B9) lives in the ~70–85 KiB latin-ext subsets, and it is the only
 * latin-ext glyph the page renders. These faces hold just that glyph, cut from
 * the same Google variable fonts (wght and opsz axes kept), and sit first in
 * the font stacks so latin-ext is never fetched. No generated fallback: it
 * would cover every code point and shadow the families behind it.
 */
const rupeeSerif = localFont({
  src: "./fonts/literata-rupee.woff2",
  weight: "200 900",
  declarations: [{ prop: "unicode-range", value: "U+20B9" }],
  adjustFontFallback: false,
  variable: "--font-rupee-serif",
  display: "swap",
});

const rupeeSans = localFont({
  src: "./fonts/inter-rupee.woff2",
  weight: "100 900",
  declarations: [{ prop: "unicode-range", value: "U+20B9" }],
  adjustFontFallback: false,
  variable: "--font-rupee-sans",
  display: "swap",
});

const handwritten = Kalam({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-handwritten",
  display: "swap",
});

const { siteUrl, socialImage } = campaignMeta;

if (!siteUrl && process.env.NODE_ENV === "production") {
  console.warn(
    "NEXT_PUBLIC_SITE_URL is not set: canonical, og:url, og:image and the sitemap entry are omitted.",
  );
}

const shareImage = siteUrl
  ? [
      {
        url: socialImage.src,
        width: socialImage.width,
        height: socialImage.height,
        alt: socialImage.alt,
      },
    ]
  : undefined;

export const metadata: Metadata = {
  ...(siteUrl && {
    metadataBase: new URL(siteUrl),
    alternates: { canonical: "/" },
  }),
  title: campaignMeta.title,
  description: campaignMeta.description,
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  openGraph: {
    type: "website",
    siteName: "RentReadBuy",
    title: campaignMeta.socialTitle,
    description: campaignMeta.socialDescription,
    locale: campaignMeta.locale,
    ...(siteUrl && { url: "/", images: shareImage }),
  },
  twitter: {
    card: shareImage ? "summary_large_image" : "summary",
    title: campaignMeta.socialTitle,
    description: campaignMeta.socialDescription,
    images: shareImage,
  },
};

export const viewport: Viewport = {
  themeColor: "#fbf6ee",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-IN"
      className={`${editorialSerif.variable} ${cleanSans.variable} ${handwritten.variable} ${rupeeSerif.variable} ${rupeeSans.variable}`}
    >
      <body>
        <Script id="rrb-consent-bootstrap" strategy="beforeInteractive">
          {consentBootstrapSource()}
        </Script>
        {children}
        <SharedChat />
        <AnalyticsListener />
        <ConsentModeSync />
        <TagManager />
      </body>
    </html>
  );
}
