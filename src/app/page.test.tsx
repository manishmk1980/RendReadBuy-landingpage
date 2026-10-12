import { act, cleanup, render, screen, within } from "@testing-library/react";
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
  vi.useRealTimers();
});

function membershipLinks() {
  return screen
    .getAllByRole("link")
    .filter((link) => link.getAttribute("href")?.startsWith("https://rentreadbuy.com/subscription-plans"));
}

describe("campaign landing page", () => {
  it("renders the membership CTAs and FAQs without chat", () => {
    render(<CampaignPage />);
    expect(screen.getAllByRole("link", { name: /Start Silver Membership/ }).length).toBeGreaterThan(0);
    expect(membershipLinks().length).toBeGreaterThan(0);
    const faqRegion = document.getElementById("faqs")!;
    for (const faq of publishedFaqs) {
      expect(within(faqRegion).getByText(faq.question)).toBeTruthy();
    }
    expect(document.querySelector('script[data-rrb-shared-chat]')).toBeNull();
  });

  it("keeps signup and FAQs working when the chat script fails to load", async () => {
    vi.useFakeTimers();
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
    await act(() => vi.runAllTimersAsync());
    vi.useRealTimers();

    const script = document.querySelector('script[data-rrb-shared-chat="widget"]');
    expect(script).not.toBeNull();
    await act(async () => {
      script!.dispatchEvent(new Event("error"));
    });

    expect(document.querySelector('script[data-rrb-shared-chat]')).toBeNull();
    expect(membershipLinks().map((link) => link.getAttribute("href"))).toEqual(before);
    expect(screen.getByText(publishedFaqs[0].question)).toBeTruthy();
  });

  it("marks the hero pause control so the chat launcher can avoid it", () => {
    render(<CampaignPage />);
    const pause = screen.getByRole("button", { name: "Pause scenery animation" });
    expect(pause.getAttribute("data-pw-chat-avoid")).toBe("");
    expect(pause.closest("a")).toBeNull();
  });
});
