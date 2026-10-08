import type { Metadata, Viewport } from "next";
import { Inter, Kalam, Literata } from "next/font/google";
import { campaignMeta } from "@/config/campaign";
import { AnalyticsListener } from "@/lib/analytics/AnalyticsListener";
import "@/styles/tokens.css";
import "@/styles/motion.css";
import "./globals.css";

/* latin-ext carries U+20B9 (₹), which the offer price depends on. */
const editorialSerif = Literata({
  subsets: ["latin", "latin-ext"],
  axes: ["opsz"],
  variable: "--font-editorial-serif",
  display: "swap",
});

const cleanSans = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-clean-sans",
  display: "swap",
});

const handwritten = Kalam({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-handwritten",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(campaignMeta.siteUrl),
  title: campaignMeta.title,
  description: campaignMeta.description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "RentReadBuy",
    title: campaignMeta.title,
    description: campaignMeta.description,
    locale: campaignMeta.locale,
  },
};

export const viewport: Viewport = {
  themeColor: "#fbf6ee",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-IN"
      className={`${editorialSerif.variable} ${cleanSans.variable} ${handwritten.variable}`}
    >
      <body>
        {children}
        <AnalyticsListener />
      </body>
    </html>
  );
}
