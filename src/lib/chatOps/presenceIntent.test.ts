// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  clearPresenceIntent,
  readPresenceIntent,
  readPresenceOnlineIntent,
  shouldEstablishPresenceOnMount,
  writePresenceIntent,
  writePresenceOnlineIntent,
} from "./presenceIntent";

afterEach(() => {
  window.sessionStorage.clear();
});

describe("presenceIntent", () => {
  it("defaults to absent intent and prefers auto-establish Online", () => {
    expect(readPresenceIntent()).toBeNull();
    expect(readPresenceOnlineIntent()).toBe(false);
    expect(shouldEstablishPresenceOnMount()).toBe(true);
  });

  it("round-trips Online intent in sessionStorage", () => {
    writePresenceOnlineIntent(true);
    expect(readPresenceIntent()).toBe("online");
    expect(readPresenceOnlineIntent()).toBe(true);
    expect(shouldEstablishPresenceOnMount()).toBe(true);
    expect(window.sessionStorage.getItem("rrb_silver_chat_presence_intent")).toBe(
      "online",
    );
  });

  it("persists explicit Offline so remount does not auto-establish", () => {
    writePresenceIntent("offline");
    expect(readPresenceIntent()).toBe("offline");
    expect(readPresenceOnlineIntent()).toBe(false);
    expect(shouldEstablishPresenceOnMount()).toBe(false);
    expect(window.sessionStorage.getItem("rrb_silver_chat_presence_intent")).toBe(
      "offline",
    );
  });

  it("clears intent for new login and failed Online confirmation", () => {
    writePresenceIntent("offline");
    clearPresenceIntent();
    expect(readPresenceIntent()).toBeNull();
    expect(shouldEstablishPresenceOnMount()).toBe(true);

    writePresenceOnlineIntent(true);
    writePresenceOnlineIntent(false);
    expect(readPresenceIntent()).toBeNull();
    expect(window.sessionStorage.getItem("rrb_silver_chat_presence_intent")).toBeNull();
  });
});
