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
| `NEXT_PUBLIC_GTM_ID` | unset | Google Tag Manager container (`GTM-…`). GTM loads only when set. RentReadBuy's container is `GTM-MRLNJ7Q`; do not set it until consent handling and duplicate tracking are checked. |
| `NEXT_PUBLIC_ATTRIBUTION_PASSTHROUGH` | `on` | `on` copies landing UTMs and ad click IDs onto RentReadBuy links. Set `off` when this page shares RentReadBuy's GA4 property. |
| `NEXT_PUBLIC_SHARED_CHAT_ENABLED` | `off` | `on` or `true` loads the shared Primewayz visitor chat. Any other value, including `off` and unset, leaves chat off: no widget script and no chat request. Leave this `off` until activation is approved. |
| `NEXT_PUBLIC_SHARED_CHAT_API_BASE_URL` | unset | Approved value: `https://uk.primewayz.com`. https only, with no credentials, query or fragment. Chat stays off while this is empty, and also while enablement is not `on` or `true`. |
| `NEXT_PUBLIC_SHARED_CHAT_WIDGET_URL` | unset | Approved value: `https://uk.primewayz.com/embed/chat/1.1.0/pw-chat.js`. An https URL, or a same-origin path when a copy is served from this site. Chat stays off while this is empty. |
| `NEXT_PUBLIC_SHARED_CHAT_WIDGET_INTEGRITY` | unset | Approved value for widget 1.1.0: `sha384-NoTM6nKvWU6U4TPvQ2rbNTuxv6aP4fj8BWZBSG5XIDPPuz9IhKp1EjwJ3BNOo4XO`. A cross-origin URL with a hash is loaded as `crossorigin="anonymous"`. Leave empty to skip SRI. |

Shared chat is off unless it is explicitly enabled and both URLs are valid. The Primewayz UK service owns tenant configuration, conversations, sessions, replies, leads and administration. This page only loads the public widget. It does not proxy chat traffic and it does not ship administrative credentials.

Leave the flag `off` in production. With the flag on, the published widget loads after the page is idle and before any cookie choice, then requests Primewayz UK capabilities and availability. It does not create a conversation or a chat session id until the visitor opens chat. The cookie banner on this page describes analytics and advertising only. Do not enable chat until a privacy disclosure that covers this service is approved.

See `.env.example` for a template.
