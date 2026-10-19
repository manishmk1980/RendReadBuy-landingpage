// @vitest-environment node
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { sharedChatDisclosure } from "@/config/sharedChat";
import { links } from "@/config/links";
import { SharedChat } from "./SharedChat";

describe("SharedChat on the server", () => {
  it("renders the disclosure without a widget script, window or storage", () => {
    expect(typeof window).toBe("undefined");
    const html = renderToString(
      <SharedChat
        resolution={{
          status: "ready",
          settings: {
            apiBaseUrl: "https://chat.example.test",
            widgetUrl: "https://chat.example.test/embed/pw-chat.js",
            widgetIntegrity: null,
          },
        }}
      />,
    );
    expect(html).toContain("Chat Support &amp; Privacy");
    expect(html).toContain("Primewayz Infotech");
    expect(html).not.toContain("Primewayz UK");
    expect(html).toContain(links.privacy.href);
    expect(html).toContain(sharedChatDisclosure.openLabel);
    expect(html).not.toContain("pw-chat.js");
    expect(html).not.toContain("pwi-chat-config");
  });

  it("renders nothing while chat is disabled", () => {
    expect(renderToString(<SharedChat resolution={{ status: "disabled" }} />)).toBe("");
  });
});
