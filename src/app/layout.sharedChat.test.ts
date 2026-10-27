// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guards the visitor-chat mount point so a future release cannot drop
 * SharedChat from the root layout (or swap it for a non-loading notice)
 * without failing CI.
 */
describe("root layout SharedChat mount", () => {
  const layoutSource = readFileSync(path.join("src", "app", "layout.tsx"), "utf8");
  const sharedChatSource = readFileSync(path.join("src", "lib", "sharedChat", "SharedChat.tsx"), "utf8");
  const footerSource = readFileSync(
    path.join("src", "components", "campaign", "CampaignFooter", "CampaignFooter.tsx"),
    "utf8",
  );

  it("imports and mounts SharedChat in the root layout", () => {
    expect(layoutSource).toContain('import { SharedChat } from "@/lib/sharedChat/SharedChat"');
    expect(layoutSource).toMatch(/<SharedChat\s*\/>/);
  });

  it("uses SharedChatLoader as the ready-state entry point", () => {
    expect(sharedChatSource).toContain('import { SharedChatLoader } from "./SharedChatLoader"');
    expect(sharedChatSource).toContain("<SharedChatLoader settings={resolution.settings} />");
    expect(sharedChatSource).not.toContain("ChatPrivacyNotice");
  });

  it("does not remount SharedChat from the campaign footer", () => {
    expect(footerSource).not.toContain("SharedChat");
  });
});
