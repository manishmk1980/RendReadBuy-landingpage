import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { publishedFaqs } from "@/config/faqs";
import { runConsentBootstrap } from "@/lib/analytics/consentMode";
import { sharedChatDisclosure } from "@/config/sharedChat";
import { readStoredConsent } from "@/lib/consent";
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
  delete window.dataLayer;
  delete window.gtag;
  delete window.__rrbConsentDefaultSet;
  delete window.__rrbConsentApplied;
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
    expect(screen.queryByText("Cookies on this page")).toBeNull();
    expect(screen.queryByRole("button", { name: "Accept All" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Reject Optional" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Manage Preferences" })).toBeNull();
    expect(screen.getByRole("button", { name: "Cookie settings" })).toBeTruthy();
  });

  it("loads chat automatically, keeps optional tracking denied without a banner, and still works if the script fails", async () => {
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
    runConsentBootstrap();

    expect(screen.queryByText("Cookies on this page")).toBeNull();
    expect(screen.queryByRole("button", { name: "Accept All" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Reject Optional" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Manage Preferences" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Chat Support & Privacy" })).toBeNull();
    expect(readStoredConsent()).toBeNull();
    expect(document.getElementById("gtm")).toBeNull();
    expect(
      (window.dataLayer ?? []).some((entry) => {
        if (!entry || typeof entry !== "object") return false;
        const command = entry as { 0?: unknown; 1?: unknown };
        return command[0] === "consent" && command[1] === "update";
      }),
    ).toBe(false);
    expect((window as { __PRIMEWAYZ_ANALYTICS_CONSENT__?: boolean }).__PRIMEWAYZ_ANALYTICS_CONSENT__).toBeUndefined();

    fireEvent.click(screen.getByRole("button", { name: "Cookie settings" }));
    const dialog = screen.getByRole("dialog", { name: "Cookie settings" });
    expect(within(dialog).getByText(sharedChatDisclosure.processing)).toBeTruthy();
    expect(within(dialog).getByRole("link", { name: "Privacy Policy" }).getAttribute("href")).toContain(
      "/privacy-policy",
    );
    expect(within(dialog).getByRole("switch", { name: /Analytics/ })).toBeTruthy();
    expect(within(dialog).getByRole("switch", { name: /Advertising/ })).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(readStoredConsent()).toBeNull();

    const script = document.querySelector('script[data-rrb-shared-chat="widget"]');
    await act(async () => {
      script!.dispatchEvent(new Event("error"));
    });

    expect(document.querySelector('script[data-rrb-shared-chat]')).toBeNull();
    expect(membershipLinks().map((link) => link.getAttribute("href"))).toEqual(before);
    expect(screen.getByText(publishedFaqs[0].question)).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Chat Support & Privacy" })).toBeNull();
    expect(screen.queryByText("Cookies on this page")).toBeNull();
  });

  it("marks the hero pause control so the chat launcher can avoid it", () => {
    render(<CampaignPage />);
    const pause = screen.getByRole("button", { name: "Pause scenery animation" });
    expect(pause.getAttribute("data-pw-chat-avoid")).toBe("");
    expect(pause.closest("a")).toBeNull();
  });
});
