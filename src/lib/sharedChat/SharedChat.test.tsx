import { StrictMode } from "react";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SharedChatResolution } from "./config";

const ready: SharedChatResolution = {
  status: "ready",
  settings: {
    apiBaseUrl: "https://chat.example.test",
    widgetUrl: "https://chat.example.test/embed/pw-chat.js",
    widgetIntegrity: "sha384-NoTM6nKvWU6U4TPvQ2rbNTuxv6aP4fj8BWZBSG5XIDPPuz9IhKp1EjwJ3BNOo4XO",
  },
};

const widgetScripts = () => document.querySelectorAll('script[data-rrb-shared-chat="widget"]');

async function freshSharedChat() {
  vi.resetModules();
  return (await import("./SharedChat")).SharedChat;
}

const nativeAppendChild = Document.prototype.appendChild;

afterEach(() => {
  cleanup();
  Object.defineProperty(document.body, "appendChild", {
    configurable: true,
    writable: true,
    value: nativeAppendChild.bind(document.body),
  });
  document.getElementById("pwi-chat-config")?.remove();
  document.getElementById("pw-chat-root")?.remove();
  document.querySelectorAll('script[data-rrb-shared-chat="widget"]').forEach((node) => node.remove());
  delete (window as { __primewayzChatEmbedInstalled?: boolean }).__primewayzChatEmbedInstalled;
  delete (window as { PrimewayzChat?: { open: () => void } }).PrimewayzChat;
  window.history.replaceState({}, "", "/");
});

describe("SharedChat", () => {
  it("stays off when the published Silver URLs are present but enablement is off", async () => {
    vi.stubEnv("NEXT_PUBLIC_SHARED_CHAT_ENABLED", "off");
    vi.stubEnv("NEXT_PUBLIC_SHARED_CHAT_API_BASE_URL", "https://uk.primewayz.com");
    vi.stubEnv("NEXT_PUBLIC_SHARED_CHAT_WIDGET_URL", "https://uk.primewayz.com/embed/chat/1.3.0/pw-chat.js");
    vi.stubEnv(
      "NEXT_PUBLIC_SHARED_CHAT_WIDGET_INTEGRITY",
      "sha384-eViGVIdK7TNI/WYYpjF31NYjvzJEZ0sTcioyRIASbNuex4DHyjl0yRBYzCRfrEv4",
    );
    const SharedChat = await freshSharedChat();

    const { container } = render(<SharedChat />);

    expect(container.innerHTML).toBe("");
    expect(widgetScripts()).toHaveLength(0);
    expect(document.getElementById("pwi-chat-config")).toBeNull();
    expect(screen.queryByRole("heading", { name: "Chat Support & Privacy" })).toBeNull();
  });

  it("is off by default: renders nothing and loads no script", async () => {
    vi.stubEnv("NEXT_PUBLIC_SHARED_CHAT_ENABLED", undefined);
    vi.stubEnv("NEXT_PUBLIC_SHARED_CHAT_API_BASE_URL", "https://chat.example.test");
    vi.stubEnv("NEXT_PUBLIC_SHARED_CHAT_WIDGET_URL", "https://chat.example.test/embed/pw-chat.js");
    const SharedChat = await freshSharedChat();

    const { container } = render(<SharedChat />);

    expect(container.innerHTML).toBe("");
    expect(widgetScripts()).toHaveLength(0);
    expect(document.getElementById("pwi-chat-config")).toBeNull();
  });

  it("stays off when enabled with an insecure URL", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const SharedChat = await freshSharedChat();
    render(<SharedChat resolution={{ status: "invalid", problems: ["insecure"] }} />);
    expect(widgetScripts()).toHaveLength(0);
  });

  it("loads the published widget automatically on mount without a page button", async () => {
    const SharedChat = await freshSharedChat();
    render(<SharedChat resolution={ready} />);

    await waitFor(() => expect(widgetScripts()).toHaveLength(1));

    const script = widgetScripts()[0] as HTMLScriptElement;
    expect(script.src).toBe(ready.settings.widgetUrl);
    expect(script.integrity).toBe(ready.settings.widgetIntegrity);
    expect(script.crossOrigin).toBe("anonymous");
    expect(screen.queryByRole("heading", { name: "Chat Support & Privacy" })).toBeNull();
    expect(screen.queryByRole("button", { name: /open chat/i })).toBeNull();
    expect((window as { __PRIMEWAYZ_ANALYTICS_CONSENT__?: boolean }).__PRIMEWAYZ_ANALYTICS_CONSENT__).toBeUndefined();
  });

  it("does not call PrimewayzChat.open on a normal load", async () => {
    const open = vi.fn();
    (window as { PrimewayzChat?: { open: () => void } }).PrimewayzChat = { open };
    const SharedChat = await freshSharedChat();
    render(<SharedChat resolution={ready} />);

    await waitFor(() => expect(widgetScripts()).toHaveLength(1));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(open).not.toHaveBeenCalled();
    delete (window as { PrimewayzChat?: { open: () => void } }).PrimewayzChat;
  });

  it("loads the central widget for ?pw_chat=open and leaves the landing query in place", async () => {
    window.history.replaceState({}, "", "/?pw_chat=open&utm_source=qa_f2b&utm_medium=test&utm_campaign=silver_launch_qa");
    const open = vi.fn();
    Object.defineProperty(document.body, "appendChild", {
      configurable: true,
      value: new Proxy(document.body.appendChild.bind(document.body), {
        apply(target, thisArg, args: [Node]) {
          const node = args[0];
          const result = Reflect.apply(target, thisArg, args) as Node;
          if (node instanceof HTMLScriptElement && node.dataset.rrbSharedChat === "widget") {
            const root = document.createElement("div");
            root.id = "pw-chat-root";
            document.body.appendChild(root);
            (window as { PrimewayzChat?: { open: () => void } }).PrimewayzChat = { open };
            queueMicrotask(() => node.dispatchEvent(new Event("load")));
          }
          return result;
        },
      }),
    });

    const SharedChat = await freshSharedChat();
    render(
      <>
        <a href="https://rentreadbuy.com/subscription-plans">Start Silver Membership</a>
        <SharedChat resolution={ready} />
      </>,
    );

    await waitFor(() => expect(widgetScripts()).toHaveLength(1));
    await waitFor(() => expect(open).toHaveBeenCalled());

    const script = widgetScripts()[0] as HTMLScriptElement;
    expect(script.src).toBe(ready.settings.widgetUrl);
    expect(widgetScripts()).toHaveLength(1);
    expect(window.location.search).toContain("utm_source=qa_f2b");
    expect(window.location.search).toContain("utm_campaign=silver_launch_qa");
    expect(window.location.search).toContain("pw_chat=open");
    const embed = JSON.parse(document.getElementById("pwi-chat-config")!.textContent!);
    expect(embed.pageUrl).toBe(`${window.location.origin}/`);
    expect(embed.pageUrl).not.toContain("utm_");
    expect(screen.getByRole("link", { name: "Start Silver Membership" }).getAttribute("href")).toBe(
      "https://rentreadbuy.com/subscription-plans",
    );
    delete (window as { PrimewayzChat?: { open: () => void } }).PrimewayzChat;
  });

  it("does not open chat for any other pw_chat value", async () => {
    window.history.replaceState({}, "", "/?pw_chat=closed&utm_source=qa_f2b");
    const open = vi.fn();
    (window as { PrimewayzChat?: { open: () => void } }).PrimewayzChat = { open };
    const SharedChat = await freshSharedChat();
    render(<SharedChat resolution={ready} />);
    await waitFor(() => expect(widgetScripts()).toHaveLength(1));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(open).not.toHaveBeenCalled();
    expect(window.location.search).toContain("utm_source=qa_f2b");
    delete (window as { PrimewayzChat?: { open: () => void } }).PrimewayzChat;
  });

  it("keeps the membership link when the widget script fails", async () => {
    window.history.replaceState({}, "", "/?pw_chat=open");
    const SharedChat = await freshSharedChat();
    render(
      <>
        <a href="https://rentreadbuy.com/subscription-plans">Start Silver Membership</a>
        <SharedChat resolution={ready} />
      </>,
    );
    await waitFor(() => expect(widgetScripts()).toHaveLength(1));
    const script = widgetScripts()[0] as HTMLScriptElement;
    await act(async () => {
      script.dispatchEvent(new Event("error"));
    });
    expect(screen.getByRole("link", { name: "Start Silver Membership" }).getAttribute("href")).toBe(
      "https://rentreadbuy.com/subscription-plans",
    );
    expect(document.getElementById("pwi-chat-config")).toBeNull();
  });

  it("mounts one initializer under Strict Mode and loads the widget once", async () => {
    const SharedChat = await freshSharedChat();
    render(
      <StrictMode>
        <SharedChat resolution={ready} />
      </StrictMode>,
    );
    await waitFor(() => expect(widgetScripts()).toHaveLength(1));
    expect(screen.queryByRole("heading", { name: "Chat Support & Privacy" })).toBeNull();
  });
});
