# F.2B-1 Core Platform Change Specification

Owner: RentReadBuy core app team. Status: proposed, not approved. No change has been made to the core app.

## Evidence (live bundle `assets/index-CRdg5X2m.js`, 9 Oct 2026)

| Finding | Status |
|---|---|
| `/subscription-plans` reads no `plan`, `term` or `gift` query parameter; extra parameters are ignored | Verified in code |
| `/login` reads `redirect`, falls back to `location.state.from` then `/`, and navigates there after login. Already-signed-in visitors are redirected immediately | Verified in code. Not yet tested with a real account |
| `redirect` is passed to the router without validation | Verified in code (hardening needed) |
| Membership payment: subscribe API, then Paytm (or wallet-only), then `/membership-activated?source=purchase`. No GA4 push on this path | Verified in code |
| Gift payment: `pendingGiftData`, then `TXN_SUCCESS` handler. No GA4 push | Verified in code |
| Book orders push `begin_checkout`, `add_payment_info` and `purchase` (with `transaction_id`) | Verified in code |

## 1. Deep-link parameters

| Parameter | Values | Meaning |
|---|---|---|
| `plan` | `silver` (slug, case-insensitive) | Plan to preselect. Resolved to the plan ID server-side or from the plans API. Never a numeric DB ID |
| `term` | `quarterly` | Billing period to preselect (maps to `selectedPeriod = 3`) |
| `gift` | `1` | Open the existing gift flow for the preselected plan |

Campaign URLs once shipped:

- Silver: `/subscription-plans?plan=silver&term=quarterly`
- Gift: `/subscription-plans?plan=silver&term=quarterly&gift=1`
- Sign in: `/login?redirect=%2Fsubscription-plans` (unchanged, per decision)

Unknown or invalid values are ignored silently, and the page renders exactly as it does today. Because the current app already ignores these parameters, the campaign can link with them before the core change ships.

## 2. Behaviour

| Visitor state | Silver link | Gift link |
|---|---|---|
| Logged out | Plans page loads with Silver and Quarterly selected and scrolled into view. The "Choose" action opens the existing sign-in or registration step. After auth, the visitor returns to the same URL with parameters intact and the selection restored | Existing in-page sign-in box opens. After auth, the gift form opens with Silver and Quarterly preselected |
| Logged in, no paid plan | Silver and Quarterly preselected. One click reaches the existing confirmation step | Gift form opens with Silver and Quarterly preselected |
| Logged in, active Silver | Show the existing current-plan state. Existing renewal and same-duration rules apply | Gift form opens (gifting is unaffected by the visitor's own plan) |
| Logged in, higher plan | Existing downgrade rule and message apply. No preselection override | Gift form opens |

Preselection only highlights and scrolls. It must never start payment, open Paytm, or apply wallet or coupon by itself.

## 3. Payment and security rules (must not change)

- Price, plan ID, discount, wallet debit and coupon are calculated server-side. The URL can only choose which plan is shown.
- Payment still requires an explicit user click, an authenticated session, and the existing Paytm token and checksum verification.
- Gift recipient details are never prefilled from the URL. No personal data goes in query strings.
- Query values are never rendered into HTML unescaped.
- **`redirect` hardening (new):** accept only same-origin relative paths. The value must start with a single `/`, and must not start with `//`, `/\` or contain a scheme. Anything else falls back to `/`. Preserve an encoded query, for example `redirect=%2Fsubscription-plans%3Fplan%3Dsilver`.

## 4. Analytics pushes required on membership paths

Use the existing `at.pushEvent` helper, which clears `ecommerce` before each push.

| Moment | Event | Notes |
|---|---|---|
| Visitor clicks pay or confirm on a plan (own or gift) | `begin_checkout` | Fire once per attempt |
| Backend confirms success (Paytm `TXN_SUCCESS` verified by API, or wallet-only success) | `purchase` | Fire in one place only: `/membership-activated` after the subscription is confirmed from the API, not from the URL `status` alone |

`purchase` payload:

```js
{
  transaction_id: "<backend order ID>",  // Paytm orderId; wallet-only must also return an order ID
  currency: "INR",
  value: 899,                             // amount charged, incl. wallet portion
  coupon: "",
  affiliation: "RentReadBuy Web",
  items: [{
    item_id: "silver_quarterly",
    item_name: "Silver Membership",
    item_category: "Membership",          // "Gift Membership" for gifts
    item_variant: "quarterly",
    price: 899,
    quantity: 1
  }]
}
```

Deduplication rules: see F.2B-2 section 6.

## 5. Acceptance tests

| # | Test | Expected |
|---|---|---|
| 1 | Logged out, open Silver link | Silver and Quarterly selected and visible. No payment started |
| 2 | Test 1, then sign in | Returns to the same URL. Silver still selected |
| 3 | Test 1, then register a new account | Same as test 2 |
| 4 | Logged in (free plan), open Silver link, click once | Existing confirmation step. Price shown is ₹899 for 3 months |
| 5 | Logged in, open Gift link | Gift form opens with Silver and Quarterly preselected. Recipient fields empty |
| 6 | Logged out, open Gift link, then sign in | Gift form opens after auth |
| 7 | Active Silver member, open Silver link | Existing current-plan or renewal rules shown |
| 8 | `?plan=xyz`, `?term=99`, `?gift=yes` | Page identical to today. No error |
| 9 | `/login?redirect=https://evil.example`, `//evil.example`, `/\evil.example` | Lands on `/` |
| 10 | `/login?redirect=%2Fsubscription-plans%3Fplan%3Dsilver%26term%3Dquarterly` | Lands on the plans page with Silver selected |
| 11 | Signed-in visitor opens the Sign In link | Goes straight to `/subscription-plans` |
| 12 | Complete a Silver purchase (Paytm and wallet-only) | Exactly one `purchase` in dataLayer with the backend order ID |
| 13 | Refresh `/membership-activated`, use back and forward, open in a new tab | No second `purchase` |
| 14 | Failed or pending Paytm payment | No `purchase`. Existing messages unchanged |
| 15 | Price tampering: edit the subscribe request `price` in DevTools | Server rejects or recalculates. The client currently sends `price` to the subscribe API. Server-side validation is unverified and must be confirmed by the core team |
