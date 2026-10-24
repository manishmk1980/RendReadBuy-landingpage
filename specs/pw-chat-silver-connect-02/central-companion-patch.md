# Central companion patch (do not apply into dirty pw-uk)

Target repo: `pw-uk` on a **clean** Host-controlled branch.  
Preserve existing WordPress Infotech behaviour and `/api/integrations/wordpress/chat`.

## 1. Registry row — `src/lib/integrations/integrationRegistry.ts`

Add:

```ts
{
  integrationId: 'rrb-silver-campaign-next',
  tenantId: 'rrb-silver-campaign',
  scopes: [
    'chat:dashboard',
    'chat:read',
    'chat:diagnostics',
    'chat:reply',
    'chat:resolve',
    'chat:reopen',
  ],
  tokenEnv: 'RRB_SILVER_CHAT_INTEGRATION_TOKEN',
  previousTokenEnv: 'RRB_SILVER_CHAT_INTEGRATION_TOKEN_PREVIOUS',
},
```

Keep the existing `primewayz-wordpress` row unchanged (including archive/delete scopes).

## 2. Provider-neutral alias (optional, recommended)

Mount the **same** ops handler at:

- `/api/integrations/chat/ops` (new alias)
- `/api/integrations/wordpress/chat` (unchanged)

Silver Next.js currently calls the WordPress-named path for compatibility; the alias avoids WordPress branding for non-WP connectors without breaking PHP.

## 3. Audit source

Prefer deriving `OPERATOR_ACTION_SOURCE` from `integrationId` (e.g. `rrb-silver-campaign-next`) instead of hard-coding `wordpress_integration` for every principal. Infotech WordPress behaviour may keep the legacy source string for continuity.

## 4. Env documentation — `.env.example`

Document `RRB_SILVER_CHAT_INTEGRATION_TOKEN` and `_PREVIOUS` (Host secrets only; never Git).

## 5. Central tests to add

Extend `wordpressChatIntegration.test.ts` (or equivalent) with a Silver registry fixture:

- Missing/wrong token → `401 integration_unauthorized`
- Cleared/revoked env → fail closed
- Suspended entitlement → writes denied; diagnostics still coherent
- Cross-tenant session id → opaque `404` identical to Infotech isolation
- Body tenant override → `400 tenant_override_rejected`
- Silver scopes cannot call archive/delete (`403 integration_forbidden`)

## 6. Runtime gates (Host, not this patch)

- `RRB_SILVER_CAMPAIGN_ENABLED=true`
- `RRB_SILVER_CAMPAIGN_ALLOWED_ORIGINS` includes `https://join.rentreadbuy.com`
- Chat Connect installation: `integrationTechnology: 'custom'`, `tenantId: 'rrb-silver-campaign'`
- Entitlement `entitled` when commercial gate requires it

**Do not** generate live credentials or mutate production DB from the Silver campaign workstream.
