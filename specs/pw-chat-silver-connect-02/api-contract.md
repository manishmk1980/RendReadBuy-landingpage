# Silver Next.js backend — API contract

Base: same origin as the campaign site (`https://join.rentreadbuy.com`).  
Auth: campaign operator session cookie `rrb_silver_chat_admin_session`.  
Mutations: CSRF header/cookie `x-csrf-token` / `rrb_silver_chat_admin_csrf` + same-origin `Origin`/`Referer`.  
All responses: `Cache-Control: no-store`.  
Never accept `tenantId` / `tenant` / `sourceSite` / `sourceOrigin` / `sourceChannel` / `market` from the client.

Central upstream (server-only):  
`POST {CHAT_INTEGRATION_API_BASE_URL}/api/integrations/wordpress/chat`  
`Authorization: Bearer {RRB_SILVER_CHAT_INTEGRATION_TOKEN}`

## Session probe

`GET /api/admin/auth/session`

```json
{
  "username": "…",
  "role": "rrb_silver_campaign_operator",
  "expiresAt": 0,
  "conversationOps": "not_configured|ready|unavailable|unauthorized",
  "conversationOpsDetail": "…",
  "connectCredentialConfigured": false,
  "productionReady": false
}
```

`ready` only after tenant-validated central diagnostics.

## Readiness

`GET /api/admin/chat/readiness`

```json
{
  "ok": true,
  "conversationOps": "ready",
  "ready": true,
  "productionReady": false,
  "config": {
    "opsConfigured": true,
    "connectCredentialConfigured": false
  },
  "detail": null,
  "requestId": "…"
}
```

## Diagnostics (read-only)

`GET /api/admin/chat/diagnostics` → proxies central `action: "diagnostics"`.  
Response includes `tenant: { key: "rrb-silver-campaign", … }` after local verification.

## Dashboard (list)

`GET /api/admin/chat/dashboard?inbox=active|archived`  
Central body: `{ "action": "dashboard", "inbox": "active" }`.

## Conversation (detail)

`GET /api/admin/chat/conversation?sessionId=…`  
Central body: `{ "action": "conversation", "sessionId": "…" }`.

## Reply

`POST /api/admin/chat/reply`

```json
{
  "sessionId": "…",
  "text": "…",
  "clientActionId": "optional-36-to-64-id",
  "csrfToken": "…"
}
```

Actor is derived from the operator session (`externalUserId` = username).  
Central: `{ action, sessionId, clientActionId, actor, text }`.

## Resolve / reopen

`POST /api/admin/chat/resolve`  
`POST /api/admin/chat/reopen`

```json
{ "sessionId": "…", "clientActionId": "optional", "csrfToken": "…" }
```

## Explicitly not offered

| Surface | Reason |
|---|---|
| archive / restore / delete | Out of Silver scope |
| presence / availability via ops `action` path | Rejected locally; use WS-4 session-gated `/api/admin/chat/presence/*` |
| `/api/admin/chat/connect/activate\|heartbeat` | Host lifecycle only; not ordinary operator routes |
| Browser-supplied tenant identity | Rejected (`tenant_override_rejected`) |

## WS-4 operator presence (session-gated)

| Method | Path | Notes |
|---|---|---|
| POST | `/api/admin/chat/presence/heartbeat` | CSRF + session; body `{ consoleInstanceId, csrfToken }`; server derives `operatorRef` |
| POST | `/api/admin/chat/presence/offline` | Same; optional `notAfterMs`; best-effort on explicit Offline / logout (not on refresh) |

Upstream: `POST /api/v1/operator-presence/{heartbeat\|offline}` with server-only `RRB_SILVER_CHAT_INTEGRATION_TOKEN`. Tenant comes only from the credential. Option 1 / `heartbeat_required_online` is **not** activated by this campaign.

## Error envelope

```json
{ "ok": false, "error": { "code": "unauthorized|forbidden|not_configured|…", "message": "…" } }
```

Codes never include raw secrets or cross-tenant identifiers beyond opaque not-found.
