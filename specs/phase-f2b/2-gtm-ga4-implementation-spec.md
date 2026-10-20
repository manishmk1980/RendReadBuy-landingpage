# F.2B-2 GTM and GA4 Implementation Specification

Container `GTM-MRLNJ7Q` (live version 17). GA4 `G-B1M9ZH4TJL`. Meta Pixel `476924240672930`.
Status: proposed. Nothing has been published in GTM.

Evidence: the public `gtm.js` for version 17, the live app bundle and the live HTML, all read on 9 Oct 2026. GA4 Admin settings (enhanced measurement, unwanted referrals, key events) were not visible and are marked "check".

## 1. Inventory of existing tracking paths

The only tag loader is GTM, injected by the app (`GTM_CONTAINER_ID`). There is no hard-coded gtag, no Consent Mode and no consent banner.

**GTM tags (version 17)**

| Tag | Trigger | Effect |
|---|---|---|
| Google tag `G-B1M9ZH4TJL`, `send_page_view=true`, `host` param | `gtm.js` (every load) | GA4 `page_view` on load |
| GA4 event `page_view` | `gtm.historyChange` (pushState or replaceState) | GA4 `page_view` on every client route change |
| GA4 event `search` | dataLayer `search` | Works |
| GA4 event `add_to_cart` | dataLayer `add_to_cart` | Reaches GA4, but **"Send ecommerce data" is off**, so no items or value |
| Meta base + `fbq('track', mapped)` + CAPI param builder | `gtm.dom` | Meta `PageView` on load |
| Meta catch-all `fbq('track', {{event mapped}})` | **any** dataLayer event not starting with `gtm.` | See section 2 |

**App dataLayer pushes (class `at`)**

`page_view` (deduped by path and title), `view_item`, `add_to_cart`, `remove_from_cart`, `view_cart`, `begin_checkout`, `add_payment_info`, `purchase` (book orders only, `transaction_id` = backend order ID), `login`, `sign_up`, `search`.

**What actually reaches GA4 today:** `page_view`, `search`, and `add_to_cart` without ecommerce data. Everything else the app pushes is **not sent to GA4**, including book `purchase`. Membership and gift purchases are not pushed at all (F.2B-1 section 4).

## 2. Duplicate or misrouted tags

| # | Issue | Status | Required change |
|---|---|---|---|
| D1 | The Meta catch-all fires on campaign events, sending `fbq('track','silver_cta_click')` and other non-standard names via `track` | Verified (trigger is regex `.+` minus `gtm.`) | Restrict the trigger to mapped standard events: `^(view_item\|add_to_cart\|begin_checkout\|add_payment_info\|purchase\|search\|sign_up)$` |
| D2 | Double Meta `PageView`: `gtm.dom` fires one, and the app's `page_view` push fires a second through the catch-all | Verified by config | Remove `page_view` from the catch-all (D1 fix covers it). Send SPA route-change PageViews from one source only |
| D3 | The Meta catch-all reads `eventModel.value`, `eventModel.currency` etc., but the app pushes `ecommerce.*`, so Meta `Purchase` and `AddToCart` arrive with no value or currency | Verified by config | Point the variables at `ecommerce.value`, `ecommerce.currency`, `ecommerce.transaction_id` and `ecommerce.items` |
| D4 | Meta `eventID` is the GTM unique event ID, so it cannot dedupe against CAPI server events | Verified by config | For `Purchase`, use `eventID = ecommerce.transaction_id` |
| D5 | Possible double GA4 `page_view` on route change: the history-change tag fires, and enhanced measurement "page changes based on browser history" may fire too | Check in GA4 Admin and Preview | Keep one source. Recommended: trigger the GA4 `page_view` tag on the app's own `page_view` dataLayer event (already deduped), set the Google tag `send_page_view=false`, remove the history-change trigger, and disable enhanced-measurement history events |
| D6 | **Campaign page:** Next.js calls `history.replaceState` during hydration, which can fire the history-change `page_view`, giving 2 page views per visit | Likely. Verify in Preview | The D5 fix resolves it. Interim option: add the condition `Page Hostname equals rentreadbuy.com` to the history tag |
| D7 | Ecommerce events pushed but no GA4 tags | Verified | Add tags (section 3) |

## 3. Event mapping

**App ecommerce (new GA4 event tags, "Send ecommerce data: dataLayer" on):**
`view_item`, `add_to_cart` (turn ecommerce on), `remove_from_cart`, `view_cart`, `begin_checkout`, `add_payment_info`, `purchase`, plus `login` and `sign_up` (param `method`).

**Campaign events.** New GA4 tags fire only when `Page Hostname` equals the campaign host.

| dataLayer event | GA4 event | Parameters |
|---|---|---|
| `silver_cta_click` | `select_promotion` | `promotion_id=rrb_silver_campaign`, `promotion_name=Silver Membership`, `creative_slot={{placement}}`, `cta=silver` |
| `gift_membership_click` | `select_promotion` | same, with `cta=gift` |
| `sign_in_click` | `campaign_sign_in_click` | `placement` (`login` is reserved for the app's real login) |
| `rent_exit_click`, `buy_exit_click`, `rentreadbuy_exit_click`, `social_profile_click` | `campaign_exit_click` | `link_type` = original event name, `placement` |
| `faq_open` | `faq_open` | `placement`, question ID if present |
| `featured_book_click`, `affiliate_product_click` | none | Sections disabled in production |

- Register custom dimensions for `placement`, `cta` and `link_type`.
- Key events: `purchase` only. Optionally add `select_promotion` as a secondary key event.
- Meta: campaign clicks are not sent, which D1 enforces.

## 4. Consent management

Revised 15 Oct 2026. Status: proposal for approval. This revision does not change campaign code, environment variables, the GTM container, or production.

Phase 1 covers the Silver Membership campaign only. Approving it does not approve a publish to container `GTM-MRLNJ7Q`, and it does not change rentreadbuy.com or any other site that loads that container.

The container stays the existing RentReadBuy container `GTM-MRLNJ7Q` (live version 17), with the existing GA4 property `G-B1M9ZH4TJL` and Meta Pixel `476924240672930`. Phase 1 does not load it. `NEXT_PUBLIC_GTM_ID` stays unset for the whole of Phase 1.

### 4.1 What the campaign can enforce on its own

| Item | Phase 1 behaviour |
|---|---|
| Banner | First-party banner on the campaign host only |
| Defaults | Analytics denied and advertising denied, before any choice is saved |
| Actions | Accept All, Reject Optional, and Manage Preferences |
| Storage | Analytics and advertising stored as separate values |
| Re-open | Footer control labelled Cookie settings |
| Tags | Container not loaded, so GA4 and Meta do not run |
| Cookie scope | Host-only cookie on the campaign origin |

The main RentReadBuy app loads this same container itself. Phase 1 does not ship code, cookies, or tag changes to that site.

### 4.2 What requires a change to the shared container

These items stay outside Phase 1. Each one edits `GTM-MRLNJ7Q`, so each one needs its own approval, a named workspace, and proof that other hostnames still match live version 17.

- Consent settings on the existing Meta Custom HTML tags: the base pixel, the mapped event tag, the catch-all, and the CAPI parameter builder.
- Consent Mode configuration inside the container.
- Loading the container on the campaign, including the case where advertising is granted and analytics is denied.
- The duplicate-tag fixes D1–D7 and the new GA4 event tags in sections 2 and 3.

GA4 tags can follow Google's built-in consent checks once Consent Mode is active. The Meta tags are Custom HTML. They call Meta directly, so they do not inherit those checks. Their consent gate has to be set on the tags in GTM. That work is Phase 2 in section 4.5.

### 4.3 Phase 1 constraints

- GA4 and Meta stay unloaded because the campaign does not load the container and does not add a Meta snippet. The page leaves `fetch`, `XMLHttpRequest`, `sendBeacon`, image loading, and DOM insertion on their browser implementations.
- Saving or changing a choice writes the cookie and updates the open page in place. Reloading the page is not how a choice is applied.
- The preference lifetime is 180 days, and that figure is provisional until the privacy policy and the retention requirements confirm it. Banner copy does not present 180 days as a settled retention period.
- Advertising-only consent does not load GTM. No consent combination loads GTM during Phase 1.
- The preference cookie is host-only. It is not written for `.rentreadbuy.com`.

### 4.4 Phase 1 implementation scope

1. Add a first-party consent banner to the campaign page.
2. Until a choice is saved, keep analytics denied and advertising denied.
3. Accept All sets both to granted. Reject Optional sets both to denied. Manage Preferences changes the two values independently, then saves. Both optional categories start off in that panel when there is no saved choice.
4. Store the two values in a host-only first-party cookie:
   - Name: `rrb_silver_consent`
   - Attributes: `Path=/`, `Secure`, `SameSite=Lax`, and no `Domain` attribute
   - Provisional `Max-Age=15552000` (180 days)
   - Value carries a version plus `analytics` and `advertising`, each `granted` or `denied`, and the time of the choice
   - A missing, expired, or unreadable cookie means no choice: show the banner and keep both categories denied
5. Add Cookie settings to the campaign footer. It reopens Manage Preferences on the saved values. Save writes the cookie in place. Closing without saving leaves the stored choice as it was.
6. Leave `NEXT_PUBLIC_GTM_ID` unset in every Phase 1 environment, including production. Do not add `gtag.js`, `gtm.js`, the Meta pixel, or a call to `fbq`.
7. Campaign `dataLayer` pushes may continue. With the container unloaded, those pushes are not forwarded to GA4 or Meta.
8. Keep the banner and Cookie settings on the campaign origin only.

### 4.5 Phase 2 dependencies

Phase 2 is a separate, approval-controlled change to the shared container. Implementing or approving Phase 1 does not start it.

Controls required in GTM before any publish:

1. On each existing Meta Custom HTML tag, require advertising consent before the tag runs (`ad_storage`, plus `ad_user_data` and `ad_personalization` where that tag uses them).
2. Apply that new condition only when the page hostname is the campaign host. A publish must leave tag firing on rentreadbuy.com, and on every other hostname, identical to live version 17. If a control cannot be limited to the campaign hostname, it is outside this campaign and needs its own decision for every site on `GTM-MRLNJ7Q`.
3. Keep GA4 tied to `analytics_storage`. A grant for advertising does not satisfy the GA4 check.
4. Do not load the container for advertising-only consent until a reviewed workspace has passed the Phase 2 tests in section 4.6. Until those tests pass, `NEXT_PUBLIC_GTM_ID` stays unset for that state. Phase 1 keeps it unset for every state, including Accept All.
5. If a later approval loads the container, set Consent Mode defaults before `gtm.js`: `analytics_storage`, `ad_storage`, `ad_user_data`, and `ad_personalization` all `denied`, with `wait_for_update: 500`. Then apply the stored cookie with a consent update. A later change uses a consent update on the open page.
6. Choose basic or advanced Consent Mode only in that later approval. Phase 1 does not send a cookieless Google ping.
7. Confirm the 180-day lifetime against the privacy policy and the retention requirements before treating it as final. If the confirmed lifetime or the cookie version changes, ask for the choice again.
8. Sections 2, 3, 5, and 6 stay blocked on that same container approval. They are not published as part of the consent banner.

### 4.6 Test acceptance criteria

**Phase 1.** These pass before the banner is approved for production. GTM Preview is not involved, because the container is not loaded.

| # | Setup | Expected |
|---|---|---|
| P1 | First visit, no consent cookie, production build | Banner offers Accept All, Reject Optional, and Manage Preferences. Analytics and advertising are denied. The HTML contains no GTM, gtag, or Meta snippet. No request to `googletagmanager.com`, `google-analytics.com`, `analytics.google.com`, `connect.facebook.net`, or `facebook.com/tr`. No `_ga` or `_fbp` |
| P2 | Accept All | Cookie stores analytics granted and advertising granted. Banner closes on the same document, without a reload. Still no GTM, GA4, or Meta request |
| P3 | Reject Optional | Cookie stores both denied. Banner closes without a reload. No GTM, GA4, or Meta request |
| P4 | Manage Preferences, grant analytics only, then save | Cookie stores analytics granted and advertising denied. No reload. No tags |
| P5 | Manage Preferences, grant advertising only, then save | Cookie stores advertising granted and analytics denied. GTM stays unloaded. No GA4 request and no Meta request |
| P6 | Cookie settings | Opens preferences on the saved values. Save updates the cookie in place. Dismissing without save leaves the previous cookie unchanged |
| P7 | Reload, and a new tab on the campaign host | Banner stays closed. Both stored values match the last save. The cookie has no `Domain=.rentreadbuy.com` |
| P8 | Cookie lifetime | `Max-Age` is 180 days, and the implementation records that figure as provisional |
| P9 | Runtime inspection of the campaign page | `fetch`, `XMLHttpRequest`, `sendBeacon`, image construction, and DOM insertion are the browser's own implementations |
| P10 | After any campaign choice, open rentreadbuy.com in the same browser | The campaign cookie is not sent with that request. rentreadbuy.com has no new banner and no tag change from this work. No new GTM version is published |
| P11 | Phase 1 build environment | `NEXT_PUBLIC_GTM_ID` is unset |

**Phase 2.** These pass before any later approval loads `GTM-MRLNJ7Q` on the campaign. They are not part of Phase 1.

| # | Setup | Expected |
|---|---|---|
| G1 | Preview on the campaign host with advertising denied | The Meta Custom HTML tags do not fire. No `fbevents.js`, no `facebook.com/tr`, and no `_fbp` |
| G2 | Preview on the campaign host with analytics denied and advertising granted | GA4 sends no hit and does not set `_ga`. This state stays off in production until G1–G5 pass |
| G3 | Preview on the campaign host with analytics granted and advertising denied | GA4 may fire under `analytics_storage`. The Meta Custom HTML tags do not fire |
| G4 | Preview on the campaign host, then change the saved choice | Later hits follow the new choice on the open page, without a reload |
| G5 | Preview of the candidate version on rentreadbuy.com, compared with live version 17 | GA4 and Meta firing on that hostname is unchanged |
| G6 | Container diff | The new Meta consent conditions apply only on the campaign hostname. D1–D7 are either absent from this publish or covered by the same hostname proof |

### 4.7 Confirmation still outside this implementation

- Privacy-policy text, the named entity, coverage of the campaign subdomain, the tool list, how to withdraw, and retention, including whether 180 days remains the lifetime (checklist section 3).
- Basic versus advanced Consent Mode, and only if a later phase loads Google tags.

## 5. Campaign-to-checkout attribution verification

This section is not Phase 1. It runs only after a separate approval loads the container and the Phase 2 tests in section 4.6 pass.

Prerequisites:

- `NEXT_PUBLIC_ATTRIBUTION_PASSTHROUGH=off`.
- Campaign host is a subdomain of `rentreadbuy.com`, so the `_ga` cookie is shared with cookie domain `auto`.
- GA4 unwanted referrals include the campaign host, `secure.paytmpayments.com` and any other Paytm return domains seen in the test.

Steps:

1. Open `https://<campaign-host>/?utm_source=qa_f2b&utm_medium=test&utm_campaign=silver_launch_qa` in a clean profile and accept consent.
2. Confirm the `_ga` value is identical on the campaign host and on rentreadbuy.com after clicking Start Silver.
3. In GA4 DebugView: one `session_start`, then `select_promotion`, then `page_view` (rentreadbuy.com) with no new session and no referral from the campaign host.
4. Complete a test membership purchase. Return from Paytm must not start a new session.
5. After 24–48 h in GA4 Explore (Free form, event = `purchase`), filter `transaction_id` = test order. Session source/medium must be `qa_f2b / test` and campaign `silver_launch_qa`.

## 6. Purchase deduplication

- `transaction_id` is the backend order ID (book: `orderDto.id`; membership: subscribe API `orderId`, required for wallet-only too). Never generate it client-side.
- Push `purchase` only after backend confirmation, never from URL `status` alone. Today `trackPurchaseFromStoredCheckout` trusts `?status=TXN_SUCCESS` if checkout data is stored. Tighten this to an API check.
- Client guard: the current key `ga4_purchase_<id>` lives in `sessionStorage` (per tab). Move it to `localStorage` with a ~30-day expiry so a new tab or a revisit cannot resend.
- Meta `Purchase` uses `eventID = transaction_id` (D4).
- QA: GA4 Explore, count of `purchase` by `transaction_id` must equal 1 for every test order.

## 7. Verified versus required

| Item | Verified existing | Required change |
|---|---|---|
| GA4 base `page_view` via GTM | Yes | Consolidate to one source (D5, D6) |
| `search` to GA4 | Yes | None |
| `add_to_cart` to GA4 | Yes, without items | Turn on ecommerce data |
| App ecommerce pushes (book) | Yes | GA4 tags (section 3) |
| Book `purchase` with `transaction_id` and dedupe | Yes (session-scoped) | GA4 tag, localStorage guard, API confirmation |
| Membership and gift `purchase` | **No** | Core app push (F.2B-1 section 4) and GA4 tag |
| Campaign events to GA4 | No | Tags in section 3 |
| Meta catch-all | Misrouting | D1–D4 |
| Consent | **None** | Phase 1 campaign banner only (section 4.4). Shared-container consent controls are Phase 2 and are not approved with Phase 1 |
| Unwanted referrals | Unknown | Add (section 5) |
