# F.2B-3 Launch Readiness Checklist

Legend: [x] done or verified · [ ] open. Launch requires every box ticked, or a written waiver.

## 1. Destination URLs (`src/config/links.ts`)

- [x] Terms `/terms-of-use`, Privacy `/privacy-policy`, Returns `/refund-cancellation` and Contact `/contact-us` confirmed (F.2A)
- [x] Rent and Buy: `/products` accepted for both (decision)
- [x] Sign In: `/login?redirect=/subscription-plans` accepted. The app reads `redirect` (verified in code)
- [ ] Sign In redirect tested with a real account, both logged out and already logged in
- [ ] Silver: switch to `/subscription-plans?plan=silver&term=quarterly`. This is safe before the core change, because the parameters are ignored today
- [ ] Gift: switch to `/subscription-plans?plan=silver&term=quarterly&gift=1`
- [ ] Mark the Silver, Gift, Sign In, Rent and Buy links `confirmed: true` once the tests above pass
- [ ] Home `/` checked and confirmed

## 2. Production hostname and environment

- [ ] Hostname approved: a subdomain of `rentreadbuy.com`, required for the shared `_ga` cookie
- [ ] DNS and TLS issued. HTTP redirects to HTTPS
- [ ] `NEXT_PUBLIC_SITE_URL=https://<approved-host>`
- [ ] `NEXT_PUBLIC_RRB_BASE_URL=https://rentreadbuy.com`
- [ ] `NEXT_PUBLIC_ATTRIBUTION_PASSTHROUGH=off` (shared GA4 property)
- [ ] `NEXT_PUBLIC_GTM_ID` remains unset through Phase 1. Set `GTM-MRLNJ7Q` only after the Phase 2 container controls are approved and section 4.6 tests G1–G6 pass, and only for consent states those tests allow (F.2B-2 section 4.5)
- [ ] Rebuild after env changes (values are inlined at build). Canonical, `og:url`, sitemap and JSON-LD show the approved host
- [ ] Featured Book and Reading Essentials still disabled in the production build

## 3. Consent and privacy disclosures

Phase 1 is the campaign banner only. It does not change rentreadbuy.com or publish a GTM version (F.2B-2 section 4).

- [ ] First-party banner on the campaign host, with analytics and advertising denied until a choice is saved
- [ ] Accept All, Reject Optional, and Manage Preferences, with analytics and advertising stored independently
- [ ] Footer Cookie settings reopens the saved preferences
- [ ] Host-only consent cookie. Provisional lifetime 180 days, still subject to the privacy-policy and retention confirmation below
- [ ] `NEXT_PUBLIC_GTM_ID` unset. Phase 1 tests P1–P11 pass
- [ ] No new GTM version. rentreadbuy.com tag behaviour unchanged (test P10)
- [ ] Privacy policy corrected and legally reviewed before the 180-day lifetime is treated as final:
  - [ ] "www.website.com" boilerplate removed. Primewayz Esolutions India Pvt Ltd named as the responsible entity
  - [ ] Covers the campaign subdomain
  - [ ] Lists GA4, GTM, Meta Pixel and Conversions API, Paytm, and the cookies with their purposes
  - [ ] Explains how to withdraw consent, retention periods, and the grievance or contact officer
- [ ] Footer "Privacy" link remains, and Cookie settings is present on the campaign page
- [ ] Phase 2 Meta Custom HTML consent controls approved separately before the container is loaded (tests G1–G6)

## 4. Login and payment tests (core app, staging first)

- [ ] F.2B-1 acceptance tests 1–15 pass
- [ ] One real low-value Silver purchase (Paytm) and one wallet-only purchase on production, refunded afterwards, with written approval before running
- [ ] One gift purchase end to end
- [ ] Failed and pending Paytm paths show the existing messages and do not push `purchase`
- [ ] Server-side price validation on the subscribe API confirmed

## 5. Purchase attribution

- [ ] GTM changes D1–D7 published (F.2B-2 section 2)
- [ ] GA4 tags for app ecommerce and campaign events published (F.2B-2 section 3)
- [ ] Membership and gift `purchase` pushes live in the core app
- [ ] Unwanted referrals in GA4: campaign host and Paytm domains
- [ ] Custom dimensions `placement`, `cta` and `link_type` registered. `purchase` is a key event
- [ ] Attribution test (F.2B-2 section 5) shows the test UTM on the `purchase` event
- [ ] Each test `transaction_id` appears exactly once in GA4 and in Meta Events Manager
- [ ] Exactly one GA4 `page_view` per campaign page load (D6)

## 6. Mobile physical-device smoke test

On a real Android phone (Chrome) and a real iPhone (Safari), over mobile data:

- [ ] Page loads. Hero, parallax and reduced-motion behave correctly. No horizontal scroll
- [ ] Consent banner usable. Accept All, Reject Optional, Manage Preferences, and Cookie settings work. The choice persists on the campaign host only
- [ ] Start Silver, Gift, Sign In, Rent and Buy each land correctly, both logged in and logged out
- [ ] Paytm checkout opens and returns to `/membership-activated` (UPI app handoff included)
- [ ] GA4 DebugView shows the device session with the correct UTM

## 7. Deployment and rollback readiness

- [ ] Campaign build passes lint, TypeScript and build on the release commit, and the commit is tagged
- [ ] Hosting rollback tested: redeploy the previous build, or take the host offline with a temporary redirect to `https://rentreadbuy.com/subscription-plans`
- [ ] GTM: any publish is a separate approval from the Phase 1 banner, in a named workspace and version. Preview on rentreadbuy.com matches live version 17 except for a hostname-scoped campaign condition. Rollback = republish version 17 (current live)
- [ ] Core app: deep-link parameters are additive and fail-safe. Rollback = revert the release with no data migration
- [ ] Launch-day owners named for the campaign host, GTM, the core app and Paytm, with a contact channel
- [ ] Post-launch check at +1 h and +24 h: GA4 Realtime, purchase count versus backend orders, error logs
