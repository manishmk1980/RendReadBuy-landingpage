/**
 * Normalize Central conversation summary fields for Silver UI.
 * Central may send richer names; older thin payloads still work.
 */

export type DashboardConversation = {
  sessionId?: string;
  status?: string;
  visitorReference?: string;
  visitorLabel?: string;
  intent?: string;
  originatingPage?: string;
  visitorPresence?: string;
  lastSeenAt?: string;
  lastMessagePreview?: string;
  lastActor?: string;
  lastActivityAt?: string;
  updatedAt?: string;
  needsAttention?: boolean;
  lifecycle?: string;
};

export type TranscriptMessage = {
  id?: string;
  role?: string;
  actor?: string;
  text?: string;
  body?: string;
  createdAt?: string;
};

export type ConversationData = {
  sessionId?: string;
  status?: string;
  visitorLabel?: string;
  visitorReference?: string;
  intent?: string;
  originatingPage?: string;
  visitorPresence?: string;
  lastSeenAt?: string;
  lifecycle?: string;
  messages?: TranscriptMessage[];
};

export function displayVisitorLabel(
  item: Pick<
    DashboardConversation,
    "visitorLabel" | "visitorReference" | "sessionId"
  >,
): string {
  const label = item.visitorLabel?.trim();
  if (label) return label;
  const ref = item.visitorReference?.trim();
  if (ref) return ref;
  if (item.sessionId) return item.sessionId.slice(0, 8);
  return "Visitor";
}

export function displayIntent(item: Pick<DashboardConversation, "intent">): string {
  const intent = item.intent?.trim();
  return intent || "—";
}

export function displayOriginatingPage(
  item: Pick<DashboardConversation, "originatingPage">,
): string {
  const page = item.originatingPage?.trim();
  if (!page) return "—";
  try {
    const url = new URL(page, "https://example.invalid");
    return url.pathname + url.search || page;
  } catch {
    return page;
  }
}

export function displayVisitorPresence(
  item: Pick<DashboardConversation, "visitorPresence" | "lastSeenAt">,
): string {
  const presence = item.visitorPresence?.trim();
  if (presence) return presence;
  if (item.lastSeenAt) return `last seen ${formatRelativeTime(item.lastSeenAt)}`;
  return "—";
}

export function displayActivityAt(
  item: Pick<DashboardConversation, "lastActivityAt" | "updatedAt">,
): string {
  const raw = item.lastActivityAt ?? item.updatedAt;
  if (!raw) return "—";
  return formatRelativeTime(raw);
}

export function messageActor(message: TranscriptMessage): string {
  const actor = message.actor?.trim() || message.role?.trim();
  return actor || "message";
}

export function messageText(message: TranscriptMessage): string {
  return message.text ?? message.body ?? "";
}

export function formatRelativeTime(iso: string): string {
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return iso;
  const deltaSec = Math.round((Date.now() - ts) / 1000);
  if (deltaSec < 60) return "just now";
  if (deltaSec < 3600) return `${Math.floor(deltaSec / 60)}m ago`;
  if (deltaSec < 86400) return `${Math.floor(deltaSec / 3600)}h ago`;
  return new Date(ts).toLocaleString();
}
