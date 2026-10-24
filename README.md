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
| `NEXT_PUBLIC_SHARED_CHAT_ENABLED` | `on` | `on` or `true` shows the chat privacy notice. The shared widget script loads only after the visitor opens chat. Any other value, including `off` and unset, leaves chat off: no notice, no widget script and no chat request. Production builds for `join.rentreadbuy.com` set this `on` after Primewayz activation. |
| `NEXT_PUBLIC_SHARED_CHAT_API_BASE_URL` | unset | Approved value: `https://uk.primewayz.com`. https only, with no credentials, query or fragment. Chat stays off while this is empty, and also while enablement is not `on` or `true`. |
| `NEXT_PUBLIC_SHARED_CHAT_WIDGET_URL` | unset | Approved value: `https://uk.primewayz.com/embed/chat/1.3.0/pw-chat.js`. An https URL, or a same-origin path when a copy is served from this site. Chat stays off while this is empty. |
| `NEXT_PUBLIC_SHARED_CHAT_WIDGET_INTEGRITY` | unset | Approved value for widget 1.3.0: `sha384-eViGVIdK7TNI/WYYpjF31NYjvzJEZ0sTcioyRIASbNuex4DHyjl0yRBYzCRfrEv4`. A cross-origin URL with a hash is loaded as `crossorigin="anonymous"`. Leave empty to skip SRI. |
| `CHAT_ADMIN_USERNAME` | unset | Server-only. Single campaign operator username for `/admin`. Never `NEXT_PUBLIC_`. |
| `CHAT_ADMIN_PASSWORD_HASH` | unset | Server-only. scrypt PHC-style password hash (not plaintext). See generation procedure below. |
| `CHAT_ADMIN_SESSION_SECRET` | unset | Server-only. ≥32-byte secret used to HMAC-sign the admin session cookie and CSRF tokens. |
| `CHAT_ADMIN_TRUST_PROXY` | unset | Server-only. Set to `1`/`true` only when the edge proxy overwrites/strips client `X-Forwarded-For` (and optionally sets `X-Real-IP`). When unset, login throttling ignores those headers so spoofed values cannot mint fresh buckets. |
| `CHAT_ADMIN_SHARED_STORE_URL` | unset | Server-only. Optional Upstash-compatible Redis REST URL (`https` only). Required with the token below before running more than one Node instance. |
| `CHAT_ADMIN_SHARED_STORE_TOKEN` | unset | Server-only. Bearer token for the shared Redis REST store. Leave unset for single-process memory state. |

Shared chat is off unless it is explicitly enabled and both URLs are valid. Primewayz Infotech operates the chat service. The public API host remains `https://uk.primewayz.com`; that hostname is the technical endpoint, not the visitor-facing brand. The service owns tenant configuration, conversations, sessions, replies, leads and administration. This page only loads the public widget. It does not proxy chat traffic and it does not ship administrative credentials. The Silver site key is `rentreadbuy-silver` (tenant `rrb-silver-campaign`); do not reuse the general `rrb` or `pw-uk` tenants.

With the flag on, the footer shows the chat privacy notice and links to `https://rentreadbuy.com/privacy-policy`. Choosing **Open chat support**, or opening `?pw_chat=open`, loads the published widget 1.3.0. The query does not start a separate chatbot: the central widget sees `pw_chat=open` and opens itself. Other `pw_chat` values do nothing. Landing UTM parameters stay on the page URL. Only then does the widget request capabilities and availability. Chat session storage is created when the panel opens. A failed script or API response removes or hides the launcher and leaves membership signup working. GTM stays unset for this chat-only release (`NEXT_PUBLIC_GTM_ID` empty).

This page does not set `__PRIMEWAYZ_ANALYTICS_CONSENT__`, so the widget does not forward chat events into analytics. The Silver page has its own cookie banner and footer Cookie settings. Those controls save an analytics and advertising choice for this browser only, and they do not enable chat.

See `.env.example` for a template.

## Silver chat operator login (`/admin`)

Campaign-local operator sign-in for Silver chat administration on this site only. It uses an HMAC-signed httpOnly session cookie (`rrb_silver_chat_admin_session`) with `Path=/` so the same cookie covers both `/admin` pages and `/api/admin/*` auth APIs (a cookie may only declare one path prefix). Sessions expire after 8 hours and are revoked on logout. Logout navigation runs only after the logout API succeeds. State-changing requests require a matching CSRF double-submit token and a same-origin `Origin`/`Referer`. Login attempts are throttled (5 failures / 15 minutes) using a non-spoofable key unless `CHAT_ADMIN_TRUST_PROXY` is enabled behind a stripping edge.

### Deployment requirements for auth state

| Topology | Shared store | Trust proxy |
|---|---|---|
| Single Node process (`next start` / one container) | Optional. Default in-memory revocation + throttle is enough. | Optional. Leave unset unless a reverse proxy overwrites client forwarding headers. |
| Multiple Node instances / serverless replicas | **Required.** Set `CHAT_ADMIN_SHARED_STORE_URL` + `CHAT_ADMIN_SHARED_STORE_TOKEN` to an Upstash-compatible Redis REST endpoint so logout revocation and login throttling are visible on every instance. | Set `CHAT_ADMIN_TRUST_PROXY=1` only when the platform edge overwrites `X-Forwarded-For` (for example nginx `real_ip` / Vercel). |

Do not introduce Redis for a single-process deploy. Without the shared-store env pair, each process keeps its own memory maps and a logout on instance A will not revoke a stolen cookie presented to instance B.

This login never grants Primewayz Host Admin, platform Owner, or cross-tenant authorization. Tenant ids are not accepted from the client as authorization. Integration Bearer tokens stay out of the browser and out of this login flow. Conversation inbox/reply/presence stay unimplemented until a Silver-specific central integration credential and scopes are available. The public widget and membership deep links are unchanged.

### Generate credentials (do not commit real values)

```bash
# Session / CSRF HMAC secret (≥32 bytes). Copy into CHAT_ADMIN_SESSION_SECRET.
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"

# Password hash for CHAT_ADMIN_PASSWORD_HASH. Replace 'your-password' locally; do not log it.
node -e "const {randomBytes,scryptSync}=require('crypto'); const password=process.argv[1]; const n=16384,r=8,p=1,keylen=64; const salt=randomBytes(16); const maxmem=128*r*n*2+64*1024*1024; const hash=scryptSync(password,salt,keylen,{N:n,r,p,maxmem}); console.log('\$scrypt\$n='+n+',r='+r+',p='+p+'$'+salt.toString('base64url')+'$'+hash.toString('base64url'));" "your-password"
```

Set `CHAT_ADMIN_USERNAME` to the operator username, store the hash in `CHAT_ADMIN_PASSWORD_HASH`, and keep plaintext passwords out of env files, tickets, and chat. Rotate `CHAT_ADMIN_SESSION_SECRET` to invalidate outstanding sessions.
