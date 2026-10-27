// @vitest-environment node
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SharedChat } from "./SharedChat";

describe("SharedChat on the server", () => {
  it("renders no disclosure, widget script or config on the server", () => {
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
    expect(html).toBe("");
    expect(html).not.toContain("Chat Support");
    expect(html).not.toContain("Primewayz");
    expect(html).not.toContain("pw-chat.js");
    expect(html).not.toContain("pwi-chat-config");
  });

  it("renders nothing while chat is disabled", () => {
    expect(renderToString(<SharedChat resolution={{ status: "disabled" }} />)).toBe("");
  });
});
