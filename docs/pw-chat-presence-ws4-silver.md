# PW-CHAT-PRESENCE-WS4 — Silver campaign operator presence

**Branch:** `feat/silver-chat-operator-presence-ws4`  
**Companion central:** `feat/pw-chat-presence-ws4-central` (`AjeetVictor/primewayzLPUK`)  
**Site key:** `rentreadbuy-silver`  
**Tenant:** `rrb-silver-campaign` (credential-bound; never from the browser)

---

## Operator authentication (existing)

Campaign-local HMAC session (`rrb_silver_chat_admin_session`) with role `rrb_silver_campaign_operator`.

| Not an operator | Why |
|---|---|
| Ordinary campaign visitor | No admin cookie; `/admin` gated |
| Membership customer | Separate product identity; not this console |
| Browser cookie alone without HMAC verify | Page/API re-verify session on every request |
| Central Host/Owner session | Different cookie/domain; not accepted here |
| Shared browser secret | Forbidden — ops Bearer stays server-side |

## What this PR adds

| Piece | Detail |
|---|---|
| Presence routes | `POST /api/admin/chat/presence/heartbeat` and `/offline` |
| Presence client | Server → central v1 paths with `RRB_SILVER_CHAT_INTEGRATION_TOKEN` |
| Console UI | Go Online / Go Offline, heartbeat while Online; refresh restores via intent + heartbeat (no Offline on pagehide/unmount) |
| Logout | Best-effort Offline before session revoke |
| Multi-tab | Distinct `consoleInstanceId` → distinct `operatorRef` |

Public landing, CTAs, privacy notice, analytics consent, attribution, and shared widget 1.3.0 load path are **unchanged**.

## Production configuration (names only)

Already required for conversation ops:

- `CHAT_INTEGRATION_API_BASE_URL`
- `RRB_SILVER_CHAT_INTEGRATION_TOKEN`
- `CHAT_ADMIN_USERNAME` / `CHAT_ADMIN_PASSWORD_HASH` / `CHAT_ADMIN_SESSION_SECRET`
- `CHAT_ADMIN_PUBLIC_ORIGIN=https://join.rentreadbuy.com` (required behind Apache HTTPS termination)

Multi-instance:

- `CHAT_ADMIN_SHARED_STORE_URL` + `CHAT_ADMIN_SHARED_STORE_TOKEN`
- `CHAT_ADMIN_TRUST_PROXY=1` only behind a stripping edge

Central must grant `chat:presence:write` on `rrb-silver-campaign-next` (companion PR). Do **not** set Option 1 for Silver in this release.

## Deployment / rollback

1. Deploy central WS-4 first (scope grant).  
2. Deploy this Silver build.  
3. Smoke: login → Go Online → Host presence reporting for `rrb-silver-campaign` → Go Offline / logout.  
4. Rollback: redeploy previous Silver build; TTL clears Online within five minutes. Optionally revoke the ops token.

## Production verification checklist

- [ ] Unauthenticated `/api/admin/chat/presence/*` → 401  
- [ ] Customer / visitor cannot access `/admin`  
- [ ] Logout revokes session; subsequent heartbeat → 401  
- [ ] Heartbeat while Online; explicit Offline clears this tab  
- [ ] Two tabs = two operatorRefs; closing one leaves the other  
- [ ] Two operators = independent refs  
- [ ] Stale Offline does not wipe a newer heartbeat (central contract)  
- [ ] No ops token / admin password in client bundles  
- [ ] Widget still loads after privacy notice; CTAs/attribution unchanged  
- [ ] UK / Infotech presence unchanged (central regression)

## Remaining risks

- Option 1 off: visitors may still see forced Online under legacy policy until Host activates `heartbeat_required_online` for Silver.  
- Unexpected tab/browser closure relies on the 5-minute heartbeat TTL (no Offline beacon on refresh).  
- Multi-instance without shared store: logout on instance A may not revoke cookie on instance B.
