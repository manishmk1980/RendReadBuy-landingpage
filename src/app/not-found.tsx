import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found | RentReadBuy",
};

/*
 * Inline styles, not a CSS module: the root not-found's stylesheet is
 * preloaded on every page, where it would compete with the hero artwork.
 */
const page: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  justifyContent: "center",
  gap: "var(--space-4)",
  minHeight: "100vh",
  maxWidth: "40rem",
  marginInline: "auto",
  padding: "var(--space-8) var(--container-gutter)",
};

const headline: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: "clamp(1.75rem, 5vw, 2.5rem)",
  fontWeight: 800,
  lineHeight: 1.15,
};

const link: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: "2.75rem",
  color: "var(--color-brand-strong)",
  fontWeight: "var(--weight-semibold)",
  textDecoration: "underline",
  textUnderlineOffset: "0.2em",
};

export default function NotFound() {
  return (
    <main style={page}>
      <h1 style={headline}>This page could not be found.</h1>
      <p>The link may be out of date or mistyped.</p>
      <Link href="/" style={link}>
        Back to the Silver Membership page
      </Link>
    </main>
  );
}
