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
| `NEXT_PUBLIC_SHARED_CHAT_ENABLED` | `off` | `on` or `true` loads the shared Primewayz visitor chat. Any other value, including unset, leaves chat off: no widget script and no chat request. |
| `NEXT_PUBLIC_SHARED_CHAT_API_BASE_URL` | unset | Primewayz public chat API. https only, with no credentials, query or fragment. The preview origin is `https://uk.primewayz.com`. Chat stays off while this is empty. |
| `NEXT_PUBLIC_SHARED_CHAT_WIDGET_URL` | unset | Versioned `pw-chat.js` for widget 1.1.0. An https URL such as `https://uk.primewayz.com/embed/chat/1.1.0/pw-chat.js`, or a same-origin path when a copy is served from this site. Chat stays off while this is empty. |
| `NEXT_PUBLIC_SHARED_CHAT_WIDGET_INTEGRITY` | unset | Optional SRI hash (`sha256`, `sha384` or `sha512`) of that exact widget file. Leave empty to skip SRI. For widget 1.1.0 the sha384 hash is `sha384-NoTM6nKvWU6U4TPvQ2rbNTuxv6aP4fj8BWZBSG5XIDPPuz9IhKp1EjwJ3BNOo4XO`. A cross-origin URL with a hash is loaded as `crossorigin="anonymous"`. |

Shared chat is off unless it is explicitly enabled and both URLs are valid. The Primewayz UK service owns tenant configuration, conversations, sessions, replies, leads and administration. This page only loads the public widget. It does not proxy chat traffic and it does not ship administrative credentials.

See `.env.example` for a template.
