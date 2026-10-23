# RentReadBuy Silver Membership Campaign

Independently deployable campaign landing page (proposed host `join.rentreadbuy.com`, not yet confirmed).
Its single job is converting regular readers into paid Silver members.

All transactions (sign in, membership purchase, payment, gifting, rent, buy)
happen in the existing RentReadBuy application via deep links in
`src/config/links.ts`. This project has no database and must never connect to
RentReadBuy production data directly.

## Commands

```bash
npm run dev     # local development
npm run build   # production build
npm run lint
```

## Where things live

| Path | Purpose |
|---|---|
| `src/config/` | Campaign copy, locked Silver proposition, section order, links, content slots |
| `src/styles/tokens.css` | Design, breakpoint, z-index/depth and motion tokens |
| `src/styles/motion.css` | CSS scroll-driven parallax and reduced-motion handling |
| `src/components/campaign/` | One component per locked section, in page order |
| `src/components/shared/` | Section shell, depth layers, transitions, buttons |
| `src/lib/analytics/` | Typed campaign events, single `track()` dispatcher, delegated listener, optional GTM loader, UTM/click-ID passthrough |
| `src/lib/seo/` | JSON-LD built from campaign config |
| `public/assets/sections/<section>/` | Prepared layer assets, supplied per section |
| `public/assets/brand/` | Official brand files only (see its README) |

## Environment

| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_RRB_BASE_URL` | `https://rentreadbuy.com` | RentReadBuy platform origin for every outbound link |
| `NEXT_PUBLIC_SITE_URL` | unset | Confirmed production origin of this page. Required at build time for the canonical URL, `og:url`, the social preview image, the sitemap entry and JSON-LD URLs; all are omitted while it is unset. |
| `NEXT_PUBLIC_GTM_ID` | unset | Google Tag Manager container. The confirmed container is `GTM-MRLNJ7Q`. When set, `gtm.js` is requested only after analytics and advertising are both granted. |
| `NEXT_PUBLIC_ATTRIBUTION_PASSTHROUGH` | `on` | `on` copies landing UTMs and ad click IDs onto RentReadBuy links. Set `off` when this page shares RentReadBuy's GA4 property. |
| `NEXT_PUBLIC_SHARED_CHAT_ENABLED` | `on` | `on` or `true` loads the floating Primewayz Chat launcher after mount. Any other value, including `off` and unset, leaves chat off: no widget script and no chat request. Production builds for `join.rentreadbuy.com` set this `on` after Primewayz activation. |
| `NEXT_PUBLIC_SHARED_CHAT_API_BASE_URL` | unset | Approved value: `https://uk.primewayz.com`. https only, with no credentials, query or fragment. Chat stays off while this is empty, and also while enablement is not `on` or `true`. |
| `NEXT_PUBLIC_SHARED_CHAT_WIDGET_URL` | unset | Approved value: `https://uk.primewayz.com/embed/chat/1.3.3/pw-chat.js`. An https URL, or a same-origin path when a copy is served from this site. Chat stays off while this is empty. |
| `NEXT_PUBLIC_SHARED_CHAT_WIDGET_INTEGRITY` | unset | Approved value for widget 1.3.3: `sha384-jaRJqzda7FgtN2U/hubbo/jUzx9+qp+bhtrN+K1QGZYc4FgebxlyCukI/BxkpAGJ`. A cross-origin URL with a hash is loaded as `crossorigin="anonymous"`. Leave empty to skip SRI. |

Shared chat is off unless it is explicitly enabled and both URLs are valid. Primewayz Infotech operates the chat service. The public API host remains `https://uk.primewayz.com`; that hostname is the technical endpoint, not the visitor-facing brand. The service owns tenant configuration, conversations, sessions, replies, leads and administration. This page only loads the public widget. It does not proxy chat traffic and it does not ship administrative credentials. The Silver site key is `rentreadbuy-silver` (tenant `rrb-silver-campaign`); do not reuse the general `rrb` or `pw-uk` tenants.

With the flag on, the published widget 1.3.3 loads once on the client and shows the floating launcher. Opening `?pw_chat=open` opens that same panel; it does not start a second chatbot. Other `pw_chat` values do nothing. Landing UTM parameters stay on the page URL. The widget requests capabilities and availability after it boots. Chat session storage is created when the panel opens. A failed script or API response removes or hides the launcher and leaves membership signup working. GTM stays unset for this chat-only release (`NEXT_PUBLIC_GTM_ID` empty).

This page mirrors the visitor's analytics cookie onto `__PRIMEWAYZ_ANALYTICS_CONSENT__`, so the widget only forwards chat events into `gtag` / `dataLayer` after analytics is granted. Advertising consent does not enable chat analytics. Cookie settings do not enable or disable the chat launcher.

See `.env.example` for a template.
