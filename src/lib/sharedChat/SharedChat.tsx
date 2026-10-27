import { sharedChat, type SharedChatResolution } from "./config";
import { SharedChatLoader } from "./SharedChatLoader";

if (sharedChat.status === "invalid") {
  console.warn(`Shared chat is enabled but misconfigured, so it stays off:\n${sharedChat.problems.join("\n")}`);
}

/**
 * Shared Primewayz Infotech visitor chat. Off by default
 * (`NEXT_PUBLIC_SHARED_CHAT_ENABLED`). When off or misconfigured nothing is
 * rendered and no widget script is loaded. When ready, a client loader
 * mounts once and loads the floating launcher automatically; the panel stays
 * closed unless `?pw_chat=open` is on the URL.
 */
export function SharedChat({ resolution = sharedChat }: { resolution?: SharedChatResolution }) {
  if (resolution.status !== "ready") return null;
  return <SharedChatLoader settings={resolution.settings} />;
}
