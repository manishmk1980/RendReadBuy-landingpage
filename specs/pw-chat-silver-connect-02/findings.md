# PW-CHAT-SILVER-CONNECT-02 — Implementation findings

## WordPress Chat Connect architecture (inspected)

Central codebase: `G:/backup-project/primewayz/2026/landingpage-uk/pw-uk` (dirty branch `fix/pw-chat-connect-default-01` at inspection time — **not modified**).

| Layer | Path | Credential | Purpose |
|---|---|---|---|
| Chat Connect lifecycle | `POST /api/integrations/chat-connect/activate\|heartbeat` | Installation `cck_*.ccs_*` | Register health; Host/Owner suspend/reactivate/revoke/rotate |
| Operational chat | `POST /api/integrations/wordpress/chat` | Env Bearer via `INTEGRATION_REGISTRY` | Dashboard, conversation, diagnostics, delegated writes |
| Visitor chat | `/api/chat/*` + widget | Origin → tenant | Public widget only |

Infotech WordPress uses **both** credentials. Ops registry currently has a single row (`primewayz-wordpress` → `pw-infotech`). Tenant `rrb-silver-campaign` / site `rentreadbuy-silver` / origin `https://join.rentreadbuy.com` already support visitor chat; ops registry row was missing.

## Two credentials — independent purposes

1. **`RRB_SILVER_CHAT_INTEGRATION_TOKEN` (ops Bearer)**  
   Required for conversation operations. Mapped centrally to `rrb-silver-campaign` and fixed scopes. Used by this Next.js server when calling the ops contract. Never browser-exposed.

2. **`RRB_SILVER_CHAT_CONNECT_CREDENTIAL` (installation `cck_*.ccs_*`)**  
   Required for Chat Connect lifecycle (activate/heartbeat). Host/Owner provisioning only. **Not** used by ordinary `/api/admin/chat/*` operator routes in this campaign app. May be stored only in Host secrets.

Either credential alone is insufficient for a complete Connect installation. Conversation readiness on this app depends only on the ops Bearer + a tenant-validated central response.

## What this campaign repo implements

- Server-only connector (`src/lib/chatOps/`) reusing the WordPress-compatible ops path.
- Operator routes: readiness, diagnostics, dashboard, conversation, reply, resolve, reopen.
- Local campaign-admin session + CSRF/Origin on mutations.
- Tenant identity never accepted from the browser; central response `tenant.key` must equal `rrb-silver-campaign`.
- Destructive actions and presence mutation rejected locally.
- Thin admin console with explicit `productionReady: false`.

## What remains Host-controlled (companion patch)

See `central-companion-patch.md`. Do not apply into the dirty `pw-uk` working tree from this workstream.

## Unresolved risks

- Campaign admin auth still uses in-process session revocation and login throttle — unsafe across multiple instances. Console must not be classified production-ready until resolved.
- Central companion patch must land before ops Bearer can authenticate against production.
- Session readiness probe calls central diagnostics; Host rate limits apply (`diagnostics` ~30/min per integration).
- WordPress Infotech path and scopes remain unchanged; Silver scopes intentionally omit archive/delete.
