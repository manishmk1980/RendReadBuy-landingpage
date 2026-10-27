import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { publishedFaqs } from "@/config/faqs";
import { SharedChat } from "@/lib/sharedChat/SharedChat";
import CampaignPage from "./page";

class InertObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

beforeEach(() => {
  vi.stubGlobal("IntersectionObserver", InertObserver);
  vi.stubGlobal("ResizeObserver", InertObserver);
  vi.stubGlobal(
    "matchMedia",
    (query: string) =>
      ({
        matches: false,
        media: query,
        addEventListener() {},
        removeEventListener() {},
        addListener() {},
        removeListener() {},
      }) as unknown as MediaQueryList,
  );
});

afterEach(() => {
  cleanup();
  document.getElementById("pwi-chat-config")?.remove();
  document.querySelectorAll('script[data-rrb-shared-chat="widget"]').forEach((node) => node.remove());
  delete (window as { __primewayzChatEmbedInstalled?: boolean }).__primewayzChatEmbedInstalled;
  vi.useRealTimers();
});

function membershipLinks() {
  return screen
    .getAllByRole("link")
    .filter((link) => link.getAttribute("href")?.startsWith("https://rentreadbuy.com/subscription-plans"));
}

describe("campaign landing page", () => {
  it("renders the membership CTAs and FAQs without a footer chat disclosure", () => {
    render(<CampaignPage />);
    expect(screen.getAllByRole("link", { name: /Start Silver Membership/ }).length).toBeGreaterThan(0);
    expect(membershipLinks().length).toBeGreaterThan(0);
    const faqRegion = document.getElementById("faqs")!;
    for (const faq of publishedFaqs) {
      expect(within(faqRegion).getByText(faq.question)).toBeTruthy();
    }
    expect(document.querySelector('script[data-rrb-shared-chat]')).toBeNull();
    expect(screen.queryByRole("heading", { name: "Chat Support & Privacy" })).toBeNull();
    expect(document.querySelector("footer")?.textContent).not.toMatch(/Primewayz Infotech/);
  });

  it("keeps signup and FAQs working when the auto-loaded chat script fails", async () => {
    render(
      <>
        <CampaignPage />
        <SharedChat
          resolution={{
            status: "ready",
            settings: {
              apiBaseUrl: "https://chat.example.test",
              widgetUrl: "https://chat.example.test/embed/pw-chat.js",
              widgetIntegrity: null,
            },
          }}
        />
      </>,
    );
    const before = membershipLinks().map((link) => link.getAttribute("href"));

    await waitFor(() => {
      expect(document.querySelector('script[data-rrb-shared-chat="widget"]')).not.toBeNull();
    });
    const script = document.querySelector('script[data-rrb-shared-chat="widget"]');
    await act(async () => {
      script!.dispatchEvent(new Event("error"));
    });

    expect(document.querySelector('script[data-rrb-shared-chat]')).toBeNull();
    expect(membershipLinks().map((link) => link.getAttribute("href"))).toEqual(before);
    expect(screen.getByText(publishedFaqs[0].question)).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Chat Support & Privacy" })).toBeNull();
  });

  it("marks the hero pause control so the chat launcher can avoid it", () => {
    render(<CampaignPage />);
    const pause = screen.getByRole("button", { name: "Pause scenery animation" });
    expect(pause.getAttribute("data-pw-chat-avoid")).toBe("");
    expect(pause.closest("a")).toBeNull();
  });
});
