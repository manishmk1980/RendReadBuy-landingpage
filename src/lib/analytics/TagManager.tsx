import Script from "next/script";

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID?.trim();

/**
 * Injects gtm.js only after the consent bootstrap has set its default.
 * The container id stays empty until a later approval, so this renders nothing.
 */
export function gtmLoaderSource(containerId: string): string {
  return `(function(w,d,s,l,i){if(!w.__rrbConsentDefaultSet)return;w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${containerId}');`;
}

export function TagManager() {
  if (!GTM_ID || !/^GTM-[A-Z0-9]+$/.test(GTM_ID)) return null;

  return (
    <Script id="gtm" strategy="afterInteractive">
      {gtmLoaderSource(GTM_ID)}
    </Script>
  );
}
