import { describe, expect, it } from "vitest";
import {
  displayActivityAt,
  displayIntent,
  displayOriginatingPage,
  displayVisitorLabel,
  displayVisitorPresence,
  messageActor,
  messageText,
} from "./conversationFields";

describe("conversationFields", () => {
  it("prefers visitorLabel over reference and session id", () => {
    expect(
      displayVisitorLabel({
        visitorLabel: "Alex",
        visitorReference: "ref-1",
        sessionId: "abcdef12-9999",
      }),
    ).toBe("Alex");
    expect(
      displayVisitorLabel({
        visitorReference: "ref-1",
        sessionId: "abcdef12-9999",
      }),
    ).toBe("ref-1");
    expect(displayVisitorLabel({ sessionId: "abcdef12-9999" })).toBe("abcdef12");
  });

  it("surfaces intent, page path, and presence from Central fields", () => {
    expect(displayIntent({ intent: "membership" })).toBe("membership");
    expect(displayIntent({})).toBe("—");
    expect(
      displayOriginatingPage({
        originatingPage: "https://join.rentreadbuy.com/silver?utm=1",
      }),
    ).toBe("/silver?utm=1");
    expect(displayVisitorPresence({ visitorPresence: "browsing" })).toBe(
      "browsing",
    );
  });

  it("normalizes transcript actor/text aliases", () => {
    expect(messageActor({ actor: "operator", role: "agent" })).toBe("operator");
    expect(messageActor({ role: "visitor" })).toBe("visitor");
    expect(messageText({ text: "Hello" })).toBe("Hello");
    expect(messageText({ body: "Hi" })).toBe("Hi");
  });

  it("formats activity timestamps", () => {
    const recent = new Date(Date.now() - 90_000).toISOString();
    expect(displayActivityAt({ lastActivityAt: recent })).toMatch(/m ago/);
    expect(displayActivityAt({})).toBe("—");
  });
});
