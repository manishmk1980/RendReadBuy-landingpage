# Manual activation sequence (Host-controlled)

Do not run against production from this workstream. Placeholders only.

## A. Central platform

1. Land companion patch on a clean `pw-uk` branch; review; deploy via Host process.
2. Generate ops Bearer offline (≥32 chars). Store only in Host secret manager as `RRB_SILVER_CHAT_INTEGRATION_TOKEN`. Never commit, never paste into tickets/chat logs.
3. Confirm tenant gate: `RRB_SILVER_CAMPAIGN_ENABLED=true`, origins include `https://join.rentreadbuy.com`.
4. Host/Owner: register Chat Connect installation (`custom`, `rrb-silver-campaign`). Capture issued `cck_*.ccs_*` once into Host secret store as the installation credential.
5. Host/Owner: activate installation and establish heartbeat from the Host-controlled connector process (not from ordinary Silver operator UI).
6. Set entitlement to `entitled` if required. Suspension/revocation remain Host/Owner only.

## B. Silver campaign host

1. Set `CHAT_ADMIN_*` (operator login) via secret store.
2. Set `CHAT_INTEGRATION_API_BASE_URL=https://uk.primewayz.com`.
3. Set `RRB_SILVER_CHAT_INTEGRATION_TOKEN` from Host secret store.
4. Optionally omit `RRB_SILVER_CHAT_CONNECT_CREDENTIAL` on the campaign host when Host keeps lifecycle secrets elsewhere.
5. Rebuild/redeploy campaign (no `NEXT_PUBLIC_` for secrets).
6. Smoke: `/admin` login → readiness `ready` → diagnostics → dashboard. Reply/resolve/reopen on a Silver test session only.

## C. Negative checks

1. Wrong ops token → readiness `unauthorized`.
2. Revoked/cleared token env → fail closed.
3. Suspended tenant/entitlement → writes fail; status not `ready` for write paths.
4. Infotech (or other tenant) session id → opaque not-found.
5. Browser request with `tenantId` body field → `tenant_override_rejected`.
6. Confirm no secrets in browser Network payloads or static JS.

## D. Rollback

1. Host: revoke installation credential and/or clear `RRB_SILVER_CHAT_INTEGRATION_TOKEN`.
2. Campaign: remove ops env → conversation ops `not_configured`; public widget unaffected.
