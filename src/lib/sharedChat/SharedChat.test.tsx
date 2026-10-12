import { StrictMode } from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SharedChatResolution } from "./config";

const ready: SharedChatResolution = {
  status: "ready",
  settings: {
    apiBaseUrl: "https://chat.example.test",
    widgetUrl: "https://chat.example.test/embed/pw-chat.js",
    widgetIntegrity: null,
  },
};

const widgetScripts = () => document.querySelectorAll('script[data-rrb-shared-chat="widget"]');

async function freshSharedChat() {
  vi.resetModules();
  return (await import("./SharedChat")).SharedChat;
}

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = "";
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("SharedChat", () => {
  it("is off by default: renders nothing and loads no script", async () => {
    vi.stubEnv("NEXT_PUBLIC_SHARED_CHAT_ENABLED", undefined);
    vi.stubEnv("NEXT_PUBLIC_SHARED_CHAT_API_BASE_URL", "https://chat.example.test");
    vi.stubEnv("NEXT_PUBLIC_SHARED_CHAT_WIDGET_URL", "https://chat.example.test/embed/pw-chat.js");
    const SharedChat = await freshSharedChat();

    const { container } = render(<SharedChat />);
    await act(() => vi.runAllTimersAsync());

    expect(container.innerHTML).toBe("");
    expect(widgetScripts()).toHaveLength(0);
    expect(document.getElementById("pwi-chat-config")).toBeNull();
  });

  it("stays off when enabled with an insecure URL", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const SharedChat = await freshSharedChat();
    render(<SharedChat resolution={{ status: "invalid", problems: ["insecure"] }} />);
    await act(() => vi.runAllTimersAsync());
    expect(widgetScripts()).toHaveLength(0);
  });

  it("defers loading until the browser is idle", async () => {
    const SharedChat = await freshSharedChat();
    render(<SharedChat resolution={ready} />);
    expect(widgetScripts()).toHaveLength(0);
    await act(() => vi.runAllTimersAsync());
    expect(widgetScripts()).toHaveLength(1);
  });

  it("mounts the widget once under Strict Mode double effects and remounts", async () => {
    const SharedChat = await freshSharedChat();
    const view = render(
      <StrictMode>
        <SharedChat resolution={ready} />
      </StrictMode>,
    );
    await act(() => vi.runAllTimersAsync());
    view.unmount();
    render(
      <StrictMode>
        <SharedChat resolution={ready} />
      </StrictMode>,
    );
    await act(() => vi.runAllTimersAsync());

    expect(widgetScripts()).toHaveLength(1);
    expect(document.querySelectorAll("#pwi-chat-config")).toHaveLength(1);
  });

  it("does not start if unmounted before the idle callback fires", async () => {
    const SharedChat = await freshSharedChat();
    const view = render(<SharedChat resolution={ready} />);
    view.unmount();
    await act(() => vi.runAllTimersAsync());
    expect(widgetScripts()).toHaveLength(0);
  });
});
