# WS-5 — Unified Tenant Chat Administration

**Status:** Phase 1 audit + Phase 2 architecture proposal (no implementation in this document).  
**Date:** 2026-10-24  
**Reference product:** Primewayz Chat Connect v1.3.5  
**Repositories inspected**

| Role | Repo / path |
|---|---|
| Silver | `manishmk1980/RendReadBuy-landingpage` → this workspace (`membership-campaign`) |
| Central | `AjeetVictor/primewayzLPUK` → `G:/backup-project/primewayz/2026/landingpage-uk/pw-uk` (`feat/pw-chat-presence-ws4-central`) |
| WordPress | `G:/backup-project/primewayz/2026/primewayz-chat-connect/primewayz-integration` (v1.3.5) |

**Naming note:** Central’s presence roadmap also labels a future **WS-5 (Global Option 1 cutover)**. This document is **WS-5 Unified Tenant Admin**. Where presence Option 1 cutover is meant, it is called out explicitly as “Presence WS-5 / Option 1 cutover”.

**Constraints (binding)**

- Prefer existing Central APIs; do not invent unapproved Central endpoints or permission grants.
- Do not introduce cross-tenant permissions.
- Do not grant archive/delete to Silver without Host-approved authorization.
- Preserve credentials, session/CSRF, heartbeat timing, and Central governance.
- Do not change public campaign marketing, membership logic, or unrelated site behaviour.
- Focused feature branches and PRs only; no automatic merge or deploy.

---

## 0. Contract pillars (normative)

This workstream establishes **three binding pillars**. Every adapter (Silver Next.js, WordPress Chat Connect, future surfaces) must satisfy them for the capabilities it claims. Implementation PRs map UI to these pillars; they do not redefine them.

### Pillar A — Technology-independent feature parity

Parity is defined on **capabilities**, not on framework widgets or CMS tabs. For the same subscription and authorised role, Silver and WordPress must expose the same operator outcomes (list conversations, read transcript, reply, resolve/reopen, contribute presence, read diagnostics) when Central grants the same scopes. Differences that remain intentional are marked **X** (out of scope) or **B** (Host-gated) in the matrix — never silent UI omissions of Central fields that the adapter already receives.

Transport, session cookies, nonce/CSRF idioms, and option storage may differ by technology. The **capability catalogue** in §3.4 is the shared vocabulary; adapters implement it against Central ops / presence / local settings layers in §3.2.

### Pillar B — Role-based authorization

Authorization is **role- and scope-bound**, not “anyone who can open an admin URL”:

| Principal | May do | Must not do |
|---|---|---|
| **Operator (Op)** | Scoped conversation ops + presence contribution for the bound tenant | Cross-tenant access; invent scopes; Host Connect lifecycle |
| **Tenant Administrator (TA)** | Op capabilities plus adapter-local Settings when the product grants TA | Platform Host actions; elevate archive/delete without Central scopes |
| **Host / Owner (H)** | Registry, Connect lifecycle, presence policy, scope grants | Impersonate tenant operators via adapter UI |

Silver today implements a **single campaign operator** role (`rrb_silver_campaign_operator`). WordPress today folds TA into `manage_options`. Fine-grained Op vs TA split is **blocked** until an approved Central/governance design (§3.5 rule 7). Until then, adapters must not fake Tenant Admin or grant archive/delete to Silver.

Non-negotiable authz rules (§3.5): tenant identity never from the browser; actor/operatorRef server-derived; no cross-tenant list/read/write; presence contribution ≠ session alone; Connect credentials never in ordinary operator UI.

### Pillar C — Common settings contract

**Settings** are part of the shared product contract (`pw.tenant-chat-admin`), not an optional WordPress-only concept. The contract defines *what* operators configure; **adapters own persistence**:

| Settings capability | Contract meaning | Storage owner |
|---|---|---|
| `settings.widget.visibility` | Live / Preview / Disabled | Adapter-local (WP options today; Silver env → durable store in PR-C) |
| `settings.widget.position` | Launcher offset / collision behaviour | Adapter-local |
| `settings.widget.excluded_paths` | Paths where the widget must not load | Adapter-local |

Central does **not** need a new settings API for Phase 1–4 parity unless Host mandates multi-channel governance. Settings UI is deferred to **PR-C** after storage-model approval; PR-B ships Overview / Conversations / Operator Availability / Diagnostics only, while keeping Settings in the contract IA so parity remains technology-independent.

---

## 1. Executive verdict

Silver today is a **single-role operator console** that proxies a **scoped subset** of the WordPress-compatible Central ops contract plus WS-4 presence. WordPress Chat Connect v1.3.5 is a **fuller tenant admin** (Overview / Chat / Settings / Diagnostics) with richer conversation context and site-local widget settings, gated only by `manage_options`.

Functional parity for **equivalent subscriptions and authorised roles** is incomplete:

| Area | WP v1.3.5 | Silver | Central |
|---|---|---|---|
| Conversation ops (read/reply/resolve/reopen) | Yes | Yes | Yes (same ops path) |
| Archive / restore / delete | Yes (scope-gated) | Intentionally forbidden | Yes for Infotech scopes only |
| Operator presence heartbeat | Yes (WS-3) | Yes (WS-4) | Yes (`/api/v1/operator-presence/*`) |
| Widget Live / Preview / Disabled | Yes (WP options) | Env-only / no admin UI | Not a Central ops action |
| Visitor / intent / page context in inbox | Yes (uses Central fields) | Thin UI (ignores most fields) | Already returns fields |
| Tenant Admin vs Operator roles | No (single `manage_options`) | No (single campaign operator) | Host/Owner separate |
| Unified five-surface IA | Partial (4 tabs) | Missing (one page) | N/A (adapters) |

**Key insight for Phase 2:** Most “Silver gaps” in conversation richness are **adapter/UI gaps**, not missing Central APIs. Widget settings are **technology-adapter local**. Archive/delete remain **governance-gated**, not missing endpoints.

---

## 2. Phase 1 — Capability matrix

### Legend

| Code | Meaning |
|---|---|
| **I** | Implemented end-to-end for that surface |
| **P** | Partial (API without UI, thin UI, or policy not activated) |
| **M** | Missing on that surface |
| **B** | Blocked / requires Host or Central approval before adapter work |
| **X** | Intentionally out of scope for that subscription / role |

### Roles

| Role | WordPress today | Silver today | Central |
|---|---|---|---|
| **Operator (Op)** | No distinct role — folded into `manage_options` | `rrb_silver_campaign_operator` (only role) | Acts via integration Bearer + scopes |
| **Tenant Administrator (TA)** | Effectively every WP admin with `manage_options` | Not implemented | Entitlement / Connect install owner on tenant |
| **Host / Owner (H)** | Outside plugin | Outside Silver app | Platform admin; registry, policy, Connect lifecycle |

### Capability matrix

| Capability | WP v1.3.5 | Silver | Central API | Op | TA | H | Notes |
|---|---|---|---|---|---|---|---|
| **Overview / operational status** | **I** — Overview tab: widget mode, team presence, Connect health | **P** — single page title + readiness panel; no tabbed Overview | Diagnostics + dashboard `team` | Op | TA≡WP | H observes | Silver needs IA split, not new Central action |
| **Recent / active conversations** | **I** — Active inbox tab | **P** — loads active only; thin columns | `action: dashboard` `inbox=active` | Op | TA | H (own admin) | Central returns `visitorLabel`, `intent`, `originatingPage`, `visitorPresence`, `needsAttention`, etc. |
| **Archived conversations** | **I** — Archived inbox tab | **P** — API `?inbox=archived` exists; **no UI** | `action: dashboard` `inbox=archived` | Op (read) | TA | — | Archive **write** is separate (see below) |
| **Visitor details / interests / presence / page context** | **I** — inbox + conversation drawer | **M** — shows `visitorReference` / status / preview only | Dashboard + conversation payloads already include label, intent, page, presence | Op | TA | — | Silver UI under-consumes Central data |
| **Transcripts** | **I** | **I** | `action: conversation` | Op | TA | — | Silver maps `role`/`text`; WP uses `actor` |
| **Replies** | **I** | **I** | `action: reply` + `chat:reply` | Op | TA | — | |
| **Resolve / reopen** | **I** | **I** | `action: resolve\|reopen` | Op | TA | — | |
| **Archive / restore** | **I** when `canArchive` | **X** — local forbid + scopes omitted | `action: archive\|restore` + `chat:archive` | **X** Silver | TA (WP if scoped) | Approves scopes | Do not grant Silver without Host approval |
| **Delete** | **I** when `canDelete` | **X** | `action: delete` + `chat:delete` | **X** Silver | TA (WP if scoped) | Approves | Same governance |
| **Operator availability + heartbeat** | **I** — console-open heartbeat / Offline (WS-3) | **I** — Go Online / Go Offline + 60s heartbeat (WS-4) | `POST /api/v1/operator-presence/{heartbeat\|offline}` | Op | TA≡WP | Policy | Competing dual buttons → replace with one state-aware control in Phase 3 |
| **Verified visitor “Team available” (Option 1)** | **P** — heartbeats record; policy not forced | **P** — same | Host `presencePolicy` | — | — | **B** H | Presence WS-5 / Option 1 cutover — out of this admin UX PR set until Host activates |
| **Widget visibility Live / Preview / Disabled** | **I** — Settings `chat_mode` | **M** — `NEXT_PUBLIC_SHARED_CHAT_ENABLED` only | Not Central ops | — | **TA** | — | Adapter-local settings; contract defines capability, adapter owns storage |
| **Widget positioning** | **I** — `launcher_offset_override` | **M** — hardcoded collision selectors | Not Central ops | — | **TA** | — | |
| **Excluded paths** | **I** — `excluded_paths` | **M** | Not Central ops | — | **TA** | — | |
| **Settings persistence** | **I** — WP options | **M** | Connect/entitlement elsewhere | — | **TA** | H secrets | Silver needs adapter settings store (env today) |
| **Connection diagnostics** | **I** — Diagnostics tab | **P** — readiness UI; `GET …/diagnostics` unwired | `action: diagnostics` | Op | TA | H | Move technical detail into Diagnostics surface |
| **Authentication** | WP session + `manage_options` + nonce | Cookie session + CSRF + Origin | Integration Bearer | Op | TA | H | Preserve; no cross-tenant |
| **Authorization (fine roles)** | **M** — no Op vs TA split | **M** — single Op | Scopes + Host admin | **B** if new roles | **B** | H | Do not invent roles without approved Central/governance design |
| **Auditability** | Via Central ops audit + WP actor | Actor from session `sub` → Central | Ops + presence ingestion | Op/TA actions | — | H read | Prefer existing audit; extend only with Host approval |
| **Chat Connect activate / install heartbeat** | **I** — Host credential + cron | **X** — Host-only | `/api/integrations/chat-connect/*` | — | — | **H** | Must stay Host lifecycle |

### Evidence anchors

| Surface | Primary evidence |
|---|---|
| Silver console | `src/app/admin/(protected)/chat/OperatorConsole.tsx` |
| Silver ops contract | `specs/pw-chat-silver-connect-02/api-contract.md`, `src/lib/chatOps/constants.ts` |
| Silver presence | `docs/pw-chat-presence-ws4-silver.md` |
| WP admin / settings | `class-pwi-chat-admin.php`, `class-pwi-settings.php`, `class-pwi-chat-loader.php` |
| WP presence | `class-pwi-chat-operator-presence.php` |
| Central ops | `wordpressChatIntegration.ts`, `operationalChatService.ts` |
| Central registry | `integrationRegistry.ts` (`primewayz-wordpress` vs `rrb-silver-campaign-next`) |

---

## 3. Phase 2 — Shared product contract (proposed)

### 3.1 Versioning

| Field | Value |
|---|---|
| Contract id | `pw.tenant-chat-admin` |
| Version | `1.0.0-draft` |
| Compatibility rule | Adapters may omit **X**-scoped capabilities; they must not invent cross-tenant or elevated scopes |
| Transport | Technology-independent capability set; adapters map to Central ops / presence / local settings |

### 3.2 Layering

```
┌─────────────────────────────────────────────────────────┐
│  Tenant Admin UX (contract surfaces)                    │
│  Overview · Conversations · Operator Availability ·     │
│  Settings · Diagnostics                                 │
└───────────────────────────┬─────────────────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
┌───────▼────────┐                    ┌─────────▼─────────┐
│ Central         │                    │ Adapter-local     │
│ (governance)    │                    │ (embedding)       │
│ ops actions     │                    │ widget mode       │
│ presence v1     │                    │ excluded paths    │
│ scopes / audit  │                    │ launcher offset   │
│ Connect lifecycle│                   │ install credentials│
└────────────────┘                    └───────────────────┘
```

**Central owns:** business capabilities, tenant authorization, conversation lifecycle, presence truth, audit.  
**Adapters own:** embedding, installation UX, site-specific settings persistence, session/CSRF idioms of the host technology.

### 3.3 Surfaces (IA)

| Surface | Purpose | Operator language | Technical detail |
|---|---|---|---|
| **Overview** | Am I ready to help visitors? | Service status, attention count, own Online state, widget visibility summary | Link to Diagnostics |
| **Conversations** | Handle enquiries | Active / Archived tabs (Archived **read** always; Archive **write** only if scoped), transcript, reply, resolve/reopen | Request ids in Diagnostics only |
| **Operator Availability** | Am I contributing Online? | Single state-aware control: **Go online** / **Go offline** | Heartbeat TTL, policy flag → Diagnostics |
| **Settings** | How does the site deliver chat? | Live / Preview / Disabled; position; excluded paths | Credential presence only as “configured / missing” |
| **Diagnostics** | Why is something failing? | Readiness, scopes, Connect health, presence policy, last errors | Full technical payloads |

### 3.4 Capability catalogue (v1)

| Capability id | Central preference | Adapter notes | Default Silver | Default Infotech WP |
|---|---|---|---|---|
| `overview.read` | diagnostics + dashboard summary | Compose Overview | Op | TA |
| `conversations.list.active` | `dashboard` active | Required | Op | TA |
| `conversations.list.archived` | `dashboard` archived | Required (read) | Op | TA |
| `conversations.read` | `conversation` | Required | Op | TA |
| `conversations.reply` | `reply` | Required | Op | TA |
| `conversations.resolve` | `resolve` | Required | Op | TA |
| `conversations.reopen` | `reopen` | Required | Op | TA |
| `conversations.archive` | `archive` / `restore` | **Only if** `chat:archive` | **X** | TA if scoped |
| `conversations.delete` | `delete` | **Only if** `chat:delete` | **X** | TA if scoped |
| `presence.contribute` | v1 heartbeat/offline | Required; 60s; TTL 5m | Op | TA |
| `settings.widget.visibility` | — | Adapter-local | **TA** (future) | TA |
| `settings.widget.position` | — | Adapter-local | **TA** (future) | TA |
| `settings.widget.excluded_paths` | — | Adapter-local | **TA** (future) | TA |
| `diagnostics.read` | `diagnostics` | Required | Op | TA |
| `connect.lifecycle` | chat-connect activate/heartbeat | Host only | **X** | Host secrets + cron |

### 3.5 Authorization rules (non-negotiable)

1. Tenant identity never from the browser (`tenant_override_rejected`).
2. Operator identity server-derived (`operatorRef` / actor); client cannot spoof.
3. Archive/delete remain scope-gated; Silver keeps local forbid until Host approval.
4. No cross-tenant list/read/write.
5. Presence contribution ≠ authenticated session alone.
6. Connect lifecycle credentials never exposed to ordinary operator UI.
7. New roles (true Op vs TA) require an approved governance design before Central or adapter changes.

### 3.6 UX contract highlights

- Replace competing Online/Offline **pair** with **one** control that reflects current state and next action.
- Explicit button states: idle / busy / disabled with reason; actionable errors.
- WCAG 2.2 AA acceptance for admin surfaces (keyboard, labels, focus, contrast, status roles).
- Safe loading: empty, loading, error, and recovery affordances on every surface.
- Operator-facing copy on Overview / Conversations / Availability / Settings; technical jargon confined to Diagnostics.

### 3.7 Data fields adapters must surface (already on Central)

From `OperationalConversationSummary` / dashboard enrichment:

- `visitorLabel`, `intent`, `originatingPage`
- `visitorPresence`, `lastSeenAt`
- `lastMessagePreview`, `lastActor`, `lastActivityAt`
- `status`, `needsAttention`, `lifecycle`

Silver’s thin inbox is a **presentation debt**, not an API blocker.

---

## 4. Architecture proposal

### 4.1 Target shape (Silver)

```
/admin
  Overview          ← readiness + attention + presence summary + widget mode summary
  Conversations     ← active | archived (read) + detail + reply/resolve/reopen
  Availability      ← single Online control + TTL (operator language)
  Settings          ← Live|Preview|Disabled, position, excluded paths (adapter store)
  Diagnostics       ← full diagnostics + presence policy + productionReady gates
```

Keep existing proxy routes; extend UI consumption; add Settings persistence only in the Silver adapter (env → durable config store still Host-approved design).

### 4.2 WordPress alignment

Keep four tabs; map Chat → Conversations; fold presence into Availability section with the same single control pattern; keep Settings/Diagnostics semantics aligned to the contract vocabulary.

### 4.3 Central

**No new ops actions required for Phase 3–4 Silver UX parity** on conversations, diagnostics, or presence.

Host-approval gates (do not implement in Silver PRs):

| Gate | Why |
|---|---|
| Silver `chat:archive` / `chat:delete` | Explicitly excluded today |
| Fine-grained Op vs TA principals | Neither WP nor Silver has this yet |
| Option 1 `heartbeat_required_online` for Silver | Presence policy / Presence WS-5 |
| New Central “settings” API for widget mode | Prefer adapter-local unless multi-channel settings must be Host-owned |

Optional (already drafted): prefer `/api/integrations/chat/ops` alias in docs once Host ships it; Silver may keep WordPress-named path for compatibility.

---

## 5. Implementation sequence

| Step | Work | Repo | Depends on | Approval needed? |
|---|---|---|---|---|
| **0** | Ratify this matrix + contract `1.0.0-draft` | Docs (Silver + Central copy) | — | Product / Host |
| **1** | Silver IA shell: five surfaces, responsive layout, a11y baseline | Silver | Step 0 | No Central API change |
| **2** | Conversations parity UI: consume Central fields; Active/Archived **read**; resolve/reopen/reply polish | Silver | Step 1 | No |
| **3** | Single Online control + Diagnostics relocation of technical presence copy | Silver | Step 1 | No |
| **4** | Wire Diagnostics surface to existing `/api/admin/chat/diagnostics` | Silver | Step 1 | No |
| **5** | Settings adapter design (Live/Preview/Disabled, paths, position) + persistence proposal | Silver | Step 0 | Host if secrets/config model changes |
| **6** | WP UI alignment pass (single Online control, shared labels, a11y) | WP plugin | Step 0 | Plugin release process |
| **7** | Contract/parity automated tests (Silver + optional WP fixtures) | Silver (± Central) | Steps 2–4 | No new scopes |
| **8** | *Only if approved:* archive/restore for Silver | Central registry + Silver | Explicit Host authz | **Yes** |
| **9** | *Only if approved:* Op vs TA role split | Central + adapters | Governance design | **Yes** |
| **10** | Presence Option 1 for Silver | Central Host | Presence WS-2–4 soak | **Yes** (separate stream) |

Do **not** combine steps 8–10 into adapter UX PRs.

---

## 6. Dependency / risk register

| ID | Risk / dependency | Impact | Mitigation |
|---|---|---|---|
| R1 | Naming collision with Presence WS-5 (Option 1 cutover) | Confusion in PRs | Use “Unified Tenant Admin” in titles; link both docs |
| R2 | Central WS-4 branch not deployed → `chat:presence:write` fails | Online control errors | Fail closed; Diagnostics explains; no fake Online |
| R3 | Option 1 not activated → visitors may still see legacy Online | Trust / product accuracy | Keep operator note in Diagnostics only; Host owns flip |
| R4 | Granting archive/delete to Silver without approval | Governance breach | Keep `FORBIDDEN_OPERATOR_ACTIONS`; strip `canArchive`/`canDelete` |
| R5 | Inventing Op vs TA without Central design | Authz drift vs WP | Stay single-role until approved |
| R6 | Multi-instance Silver auth (`productionReady: false`) | Session revoke/throttle gaps | Require `CHAT_ADMIN_SHARED_STORE_*` before production claim |
| R7 | Settings persistence design (env vs DB vs Host) | Wrong layer ownership | Default adapter-local; escalate only if Host must govern |
| R8 | WP still `manage_options` only | “Role parity” incomplete | Document as known asymmetry; don’t fake Tenant Admin |
| R9 | Diagnostics rate limits (~30/min) | Overview spam | Cache/throttle readiness; don’t poll aggressively |
| R10 | Scope creep into campaign marketing / membership | Unrelated regressions | Hard exclude; PR checklist |
| R11 | Dual Online/Offline buttons confuse operators | UX defect | Step 3 single control |
| R12 | Field-name drift (`role` vs `actor`, `visitorReference` vs `visitorLabel`) | Thin UI / bugs | Normalize in adapter mappers; contract tests |

---

## 7. Initial scoped PR plan

### PR-A — Docs: WS-5 audit + contract draft (this document)

- **Branch:** `docs/pw-chat-admin-ws5-unified-tenant-admin`
- **Repo:** Silver
- **Includes:** this file; optional README pointer
- **Excludes:** code behaviour changes
- **Reviewers:** Host + Silver owners

### PR-B — Silver admin IA + Conversations field parity (no Settings yet)

- **Branch:** `feat/pw-chat-admin-ws5-silver-ia`
- **Repo:** Silver
- **Includes:** five-surface navigation; Active/Archived **read**; visitor/intent/page/presence columns; a11y/responsive shell; single Online control; Diagnostics wiring
- **Excludes:** archive/restore/delete writes; Connect lifecycle; campaign pages; Central registry; Option 1 activation
- **Tests:** contract mapping tests; console regression (keyboard, loading/error); existing ops/presence unit tests green

### PR-C — Silver Settings adapter (after PR-B + design approval)

- **Branch:** `feat/pw-chat-admin-ws5-silver-settings`
- **Repo:** Silver
- **Includes:** Live/Preview/Disabled, excluded paths, launcher offset; persistence per approved design
- **Excludes:** Central settings API unless Host mandates
- **Gate:** explicit approval of storage model

### PR-D — WordPress admin UX alignment (parallel after PR-A)

- **Branch:** `feat/pw-chat-admin-ws5-wp-ux` (plugin repo)
- **Includes:** single Online control; shared surface labels; WCAG pass on Chat/Settings/Diagnostics
- **Excludes:** new capabilities; archive policy changes; Central

### PR-E — Central (only if Host approves later)

- Separate PRs per concern: Silver archive scopes **or** role model **or** Option 1 — never combined with Silver UX PRs.

### Out of scope for first implementation wave

- Automatic merge/deploy
- Cross-tenant tools
- Public widget redesign beyond Settings-driven visibility
- Membership / marketing / Paytm / consent changes
- Presence Option 1 global cutover (Presence WS-5)

---

## 8. Validation plan (Phase 5 — after implementation PRs)

| Area | Method |
|---|---|
| Contract/parity | Automated tests: Silver routes ↔ Central actions; forbidden actions rejected; field mapping |
| UI regression | Component/integration tests for surfaces; desktop + mobile layout checks |
| a11y | Keyboard paths, `aria-*` on tabs/controls, status `role="alert"` / live regions |
| Session | Expiry → routes 401; logout → best-effort Offline |
| Presence | Heartbeat interval, TTL, offline clear, multi-tab `consoleInstanceId` |
| Conversations | List/filter inbox, transcript, reply, resolve, reopen; archived read |
| Settings | Persist/reload; Live/Preview/Disabled behaviour on public site |
| Isolation | Tenant override rejected; wrong session opaque; archive still 403 for Silver |
| Failure | Central down, unauthorized token, CSRF failure, recovery CTAs |
| Quality gates | `typecheck`, lint, tests, production build on touched repos |

---

## 9. Recommended next action

1. Review and approve **this matrix + contract draft** (PR-A).  
2. Authorise **PR-B** only (Silver IA + Conversations/Diagnostics/Availability UX) — no Central permission changes.  
3. Hold Settings (PR-C), WP alignment (PR-D), and any archive/role/Option 1 work until separately approved.

---

## Appendix A — Central endpoints reused by the contract

| Method | Path | Used for |
|---|---|---|
| `POST` | `/api/integrations/wordpress/chat` (alias `/api/integrations/chat/ops` if present) | dashboard, conversation, diagnostics, reply, resolve, reopen (, archive/restore/delete if scoped) |
| `POST` | `/api/v1/operator-presence/heartbeat` | Online contribution |
| `POST` | `/api/v1/operator-presence/offline` | Clear contribution |
| `POST` | `/api/integrations/chat-connect/activate\|heartbeat` | Host lifecycle only |

## Appendix B — Silver routes today (keep; extend UI)

| Method | Path |
|---|---|
| `GET` | `/api/admin/chat/readiness` |
| `GET` | `/api/admin/chat/diagnostics` |
| `GET` | `/api/admin/chat/dashboard?inbox=` |
| `GET` | `/api/admin/chat/conversation?sessionId=` |
| `POST` | `/api/admin/chat/reply\|resolve\|reopen` |
| `POST` | `/api/admin/chat/presence/heartbeat\|offline` |

## Appendix C — Related docs

- `docs/pw-chat-presence-ws4-silver.md`
- `specs/pw-chat-silver-connect-02/api-contract.md`
- `specs/pw-chat-silver-connect-02/findings.md`
- `specs/pw-chat-silver-connect-02/central-companion-patch.md`
- Central: `docs/pw-chat-presence-ws{1..4}.md`, `docs/pw-chat-tenant-presence-requirement.md`
