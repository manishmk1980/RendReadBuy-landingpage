import { sharedChat, type SharedChatResolution } from "./config";
import { ChatPrivacyNotice } from "./ChatPrivacyNotice";

if (sharedChat.status === "invalid") {
  console.warn(`Shared chat is enabled but misconfigured, so it stays off:\n${sharedChat.problems.join("\n")}`);
}

/**
 * Shared Primewayz Infotech visitor chat. Off by default
 * (`NEXT_PUBLIC_SHARED_CHAT_ENABLED`). When off or misconfigured nothing is
 * rendered, so no disclosure, widget script or chat request is produced.
 * When ready, the notice is visible and the widget loads only after the
 * visitor opens chat.
 */
export function SharedChat({ resolution = sharedChat }: { resolution?: SharedChatResolution }) {
  if (resolution.status !== "ready") return null;
  return <ChatPrivacyNotice settings={resolution.settings} />;
}
