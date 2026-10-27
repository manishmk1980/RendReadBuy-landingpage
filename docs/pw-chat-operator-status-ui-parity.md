# Chat Connect operator-status UI parity (Silver ↔ WordPress)

**Branch intent:** Pin Silver visitor chat to shared widget **1.3.3** (same embed WordPress Chat Connect ships).  
**Date:** 2026-10-27  
**Does not change:** Central presence policy, branding, intents, auth, ops tokens, or visitor sessions.

---

## Comparison (WordPress = authority)

Visitor Online/Offline chrome is owned by shared `pw-chat.js`, not by WordPress PHP or this Next.js app.

| Aspect | WordPress Chat Connect | Silver before | Silver after |
|---|---|---|---|
| Widget | Bundled **1.3.3** | Published **1.3.0** | Published **1.3.3** |
| Confirmed human Online | Green `#16A34A`, label “Team available” | “Team online” | “Team available” |
| No human / offline | Grey `#94A3B8` (`.pw-chat-tone-offline`) | No dedicated offline tone | Grey offline tone |
| Automated guidance | Neutral blue `#0284C7` | Accent-coloured | Neutral blue |
| Service unavailable | Red `#DC2626` | Theme error var | Red |
| Live update | `GET /api/chat/availability` on load + refresh while panel open | Same (widget) | Same |
| Floating launcher | Remains available regardless of status | Same | Same |

Silver still injects only `pwi-chat-config` + the script ([`SharedChatLoader`](../src/lib/sharedChat/SharedChatLoader.tsx)). Status dots and copy stay in the shared widget.

---

## Central capability — verified human Online

Public `GET /api/chat/availability` already exposes:

| Field | Role |
|---|---|
| `status` | What the widget paints (`online` / `assistant` / `away` / `offline`) |
| `hasActiveAdmin` | Fresh operator heartbeat within TTL |
| `presencePolicy` | `legacy_forced_online` \| `heartbeat_required_online` |

The visitor widget **only** uses `status` for UI. It must **never** treat `legacy_forced_online` (or `presencePolicy` alone) as “human Online.”

**Required Host capability for truthful green Online:** set tenant `rrb-silver-campaign` to `presencePolicy=heartbeat_required_online` (Option 1), so `status: "online"` is emitted only when a server-confirmed human heartbeat is present. Under Option 1, forced/online mode without a heartbeat falls back to automated guidance (`assistant`), not green.

**This campaign PR does not flip that policy.** Request separate Host approval before activating Option 1 for Silver. See also [`pw-chat-presence-ws4-silver.md`](./pw-chat-presence-ws4-silver.md).

### Live probe (2026-10-27)

With `Origin: https://join.rentreadbuy.com`:

- `tenantId`: `rrb-silver-campaign`
- `presencePolicy`: `legacy_forced_online`
- `hasActiveAdmin`: `false`
- `status`: `assistant` (mode `auto`)

So visitors currently see automated guidance when no human is present; green still requires either a fresh heartbeat under auto mode or Host Option 1 to block forced Online without a human.

---

## Impact

| Surface | Change |
|---|---|
| WordPress | None (already on 1.3.3) |
| Silver Next.js | Published widget URL + SRI pin only |
| Other 1.3.0 embeds | Unchanged until they bump; 1.3.0 remains on CDN |
| Central | No API or policy change in this PR |

---

## SSH deploy checklist (no auto-merge / no production merge)

Host/path are **not** stored in this repo. After the PR is reviewed:

1. Build on the deploy host from this branch (or a reviewed artifact).
2. Ensure env pin matches published 1.3.3 URL + SRI (or leave blank to use code defaults).
3. Restart the Node/Apache process that serves `join.rentreadbuy.com` (or the agreed staging host).
4. Smoke: launcher visible; open panel; status matches Central `status`; membership CTAs still work.
5. Do **not** merge to `main` automatically; do **not** change Central `presencePolicy` from this deploy.

Provide `user@host`, remote app path, and restart command when ready to run SSH from this workstream.
