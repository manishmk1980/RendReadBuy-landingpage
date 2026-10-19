import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReadingEssentialsSection } from "@/components/campaign/ReadingEssentialsSection";
import { FeaturedBookSection } from "./FeaturedBookSection";

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
});

describe("featured book section", () => {
  it("links rent, buy and view to the Palace of Illusions inventory page", () => {
    render(<FeaturedBookSection />);

    expect(screen.queryByRole("img", { name: /blank cream book/i })).toBeNull();
    expect(screen.queryByRole("img")).toBeNull();
    expect(document.querySelector("[style*='featured-bok-the-palace-of-illusions-backdrop.jpg']")).toBeTruthy();

    expect(screen.getByRole("heading", { level: 2, name: /Timeless stories/ })).toBeTruthy();
    expect(screen.getByText(/Mahabharata to life/)).toBeTruthy();

    const panel = screen.getByRole("article", { name: "The Palace of Illusions" });
    expect(panel.getAttribute("data-development-status")).toBeNull();
    expect(within(panel).getByRole("heading", { level: 3, name: "The Palace of Illusions" })).toBeTruthy();
    expect(within(panel).getByText("Chitra Banerjee Divakaruni")).toBeTruthy();
    expect(within(panel).getByText(/Draupadi's eyes/)).toBeTruthy();
    expect(within(panel).queryByText(/Destination not yet verified/)).toBeNull();

    const inventory = "https://rentreadbuy.com/book/the-palace-of-illusions-5053";
    const actions = [
      ["Rent ₹160", "rent"],
      ["Buy ₹399", "buy"],
      ["View Book", "view"],
    ] as const;

    for (const [name, action] of actions) {
      const control = within(panel).getByRole("link", { name });
      expect(control.getAttribute("href")).toBe(inventory);
      expect(control.getAttribute("data-track-event")).toBe("featured_book_click");
      expect(control.getAttribute("data-track-params")).toContain("the-palace-of-illusions");
      expect(control.getAttribute("data-track-params")).toContain(action);
    }
  });
});

describe("reading essentials disclosure", () => {
  it("does not render the commission statement", () => {
    render(<ReadingEssentialsSection />);

    expect(screen.queryByText(/commission/i)).toBeNull();
    expect(screen.queryByText(/qualifying purchases/i)).toBeNull();
    const links = screen.getAllByRole("link", { name: /View on Amazon/ });
    expect(links).toHaveLength(4);
    for (const link of links) {
      expect(link.getAttribute("rel")).toBe("noopener noreferrer sponsored");
    }
  });
});
