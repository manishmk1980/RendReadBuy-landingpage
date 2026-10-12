import { sharedChat, type SharedChatResolution } from "./config";
import { SharedChatLoader } from "./SharedChatLoader";

if (sharedChat.status === "invalid") {
  console.warn(`Shared chat is enabled but misconfigured, so it stays off:\n${sharedChat.problems.join("\n")}`);
}

/**
 * Shared Primewayz visitor chat. Off by default
 * (`NEXT_PUBLIC_SHARED_CHAT_ENABLED`); when off or misconfigured nothing is
 * rendered, so the loader never runs and no widget script is requested.
 */
export function SharedChat({ resolution = sharedChat }: { resolution?: SharedChatResolution }) {
  if (resolution.status !== "ready") return null;
  return <SharedChatLoader settings={resolution.settings} />;
}
