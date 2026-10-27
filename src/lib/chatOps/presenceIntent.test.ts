// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  clearPresenceIntent,
  readPresenceOnlineIntent,
  writePresenceOnlineIntent,
} from "./presenceIntent";

afterEach(() => {
  window.sessionStorage.clear();
});

describe("presenceIntent", () => {
  it("defaults to absent Online confirmation", () => {
    expect(readPresenceOnlineIntent()).toBe(false);
  });

  it("round-trips Online confirmation in sessionStorage", () => {
    writePresenceOnlineIntent(true);
    expect(readPresenceOnlineIntent()).toBe(true);
    expect(window.sessionStorage.getItem("rrb_silver_chat_presence_intent")).toBe(
      "online",
    );
  });

  it("ignores legacy offline preference values and clears them", () => {
    window.sessionStorage.setItem("rrb_silver_chat_presence_intent", "offline");
    expect(readPresenceOnlineIntent()).toBe(false);

    clearPresenceIntent();
    expect(window.sessionStorage.getItem("rrb_silver_chat_presence_intent")).toBeNull();
  });

  it("clears Online confirmation for logout and failed heartbeat", () => {
    writePresenceOnlineIntent(true);
    writePresenceOnlineIntent(false);
    expect(readPresenceOnlineIntent()).toBe(false);
    expect(window.sessionStorage.getItem("rrb_silver_chat_presence_intent")).toBeNull();
  });
});
