import { StrictMode } from "react";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { sharedChatDisclosure } from "@/config/sharedChat";
import { links } from "@/config/links";
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

afterEach(() => {
  cleanup();
  document.getElementById("pwi-chat-config")?.remove();
  document.querySelectorAll('script[data-rrb-shared-chat="widget"]').forEach((node) => node.remove());
  delete (window as { __primewayzChatEmbedInstalled?: boolean }).__primewayzChatEmbedInstalled;
  window.history.replaceState({}, "", "/");
});

describe("SharedChat", () => {
  it("stays off for the published Silver configuration", async () => {
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
    expect(screen.queryByRole("heading", { name: sharedChatDisclosure.title })).toBeNull();
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
    expect(screen.queryByRole("button", { name: sharedChatDisclosure.openLabel })).toBeNull();
  });

  it("shows the Primewayz Infotech disclosure and the privacy-policy link without loading chat", async () => {
    const SharedChat = await freshSharedChat();
    render(<SharedChat resolution={ready} />);

    const notice = screen.getByRole("region", { name: sharedChatDisclosure.title });
    expect(notice.textContent).toContain("powered by Primewayz Infotech");
    expect(notice.textContent).not.toMatch(/Primewayz UK/);
    expect(notice.textContent).not.toMatch(/\d+\s+days/);
    for (const paragraph of sharedChatDisclosure.paragraphs) {
      expect(notice.textContent).toContain(paragraph);
    }
    const privacy = screen.getByRole("link", { name: sharedChatDisclosure.privacyLabel });
    expect(privacy.getAttribute("href")).toBe(links.privacy.href);
    expect(privacy.getAttribute("href")).toContain("/privacy-policy");
    expect(widgetScripts()).toHaveLength(0);
    expect(document.getElementById("pwi-chat-config")).toBeNull();
    expect((window as { __PRIMEWAYZ_ANALYTICS_CONSENT__?: boolean }).__PRIMEWAYZ_ANALYTICS_CONSENT__).toBeUndefined();
  });

  it("loads the published widget only after the visitor opens chat", async () => {
    const SharedChat = await freshSharedChat();
    render(<SharedChat resolution={ready} />);
    expect(widgetScripts()).toHaveLength(0);

    const button = screen.getByRole("button", { name: sharedChatDisclosure.openLabel });
    await act(async () => {
      button.click();
      await Promise.resolve();
    });

    const script = widgetScripts()[0] as HTMLScriptElement;
    expect(script.src).toBe(ready.settings.widgetUrl);
    expect(script.integrity).toBe(ready.settings.widgetIntegrity);
    expect(script.crossOrigin).toBe("anonymous");
    expect(widgetScripts()).toHaveLength(1);

    button.click();
    expect(widgetScripts()).toHaveLength(1);

    await act(async () => {
      script.dispatchEvent(new Event("error"));
    });
    expect(screen.getByRole("status").textContent).toBe(sharedChatDisclosure.unavailable);
    expect(document.getElementById("pwi-chat-config")).toBeNull();
  });

  it("loads the central widget for ?pw_chat=open and leaves the landing query in place", async () => {
    window.history.replaceState({}, "", "/?pw_chat=open&utm_source=qa_f2b&utm_medium=test&utm_campaign=silver_launch_qa");
    const SharedChat = await freshSharedChat();
    render(
      <>
        <a href="https://rentreadbuy.com/subscription-plans">Start Silver Membership</a>
        <SharedChat resolution={ready} />
      </>,
    );

    await waitFor(() => expect(widgetScripts()).toHaveLength(1));

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
    expect(screen.getByRole("region", { name: sharedChatDisclosure.title }).textContent).toContain(
      "powered by Primewayz Infotech",
    );
  });

  it("does not load chat for any other pw_chat value", async () => {
    window.history.replaceState({}, "", "/?pw_chat=closed&utm_source=qa_f2b");
    const SharedChat = await freshSharedChat();
    render(<SharedChat resolution={ready} />);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(widgetScripts()).toHaveLength(0);
    expect(window.location.search).toContain("utm_source=qa_f2b");
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
    expect(screen.getByRole("status").textContent).toBe(sharedChatDisclosure.unavailable);
    expect(screen.getByRole("link", { name: "Start Silver Membership" }).getAttribute("href")).toBe(
      "https://rentreadbuy.com/subscription-plans",
    );
    expect(document.getElementById("pwi-chat-config")).toBeNull();
  });

  it("mounts one disclosure under Strict Mode and still waits for a click", async () => {
    const SharedChat = await freshSharedChat();
    render(
      <StrictMode>
        <SharedChat resolution={ready} />
      </StrictMode>,
    );
    expect(screen.getAllByRole("button", { name: sharedChatDisclosure.openLabel })).toHaveLength(1);
    expect(widgetScripts()).toHaveLength(0);
  });
});
