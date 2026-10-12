import Script from "next/script";

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID?.trim();

/**
 * Google Tag Manager, loaded only when a container is configured. Off by
 * default: the container choice and consent handling are RentReadBuy decisions.
 * Campaign events queue in `window.dataLayer` until the container loads.
 */
export function TagManager() {
  if (!GTM_ID || !/^GTM-[A-Z0-9]+$/.test(GTM_ID)) return null;

  return (
    <Script id="gtm" strategy="afterInteractive">
      {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');`}
    </Script>
  );
}
