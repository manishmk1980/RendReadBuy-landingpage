# Widget 1.3.3 operator-status screenshots

Captured from the local harness (`tmp-widget-artifacts/status-harness.html`) against stubbed `GET /api/chat/availability`. RentReadBuy branding and intents are preserved; only `status` changes.

| File | Stubbed `status` | Expected UI |
|---|---|---|
| `online.png` | `online` | Green dot · “Team available” · launcher remains |
| `offline.png` | `offline` | Grey dot · “Team offline” · messaging unavailable · launcher remains |
| `automated.png` | `assistant` | Blue/neutral dot · “Automated guidance available” · launcher remains |

These screenshots do **not** activate Central Option 1. Green Online still means Central emitted `status: "online"`; Host approval is required before treating that as verified-human-only (`heartbeat_required_online`).
