// @vitest-environment node
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SharedChat } from "./SharedChat";

describe("SharedChat on the server", () => {
  it("renders without touching window, document or storage", () => {
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
  });
});
