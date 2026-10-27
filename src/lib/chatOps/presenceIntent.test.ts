// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  readPresenceOnlineIntent,
  writePresenceOnlineIntent,
} from "./presenceIntent";

afterEach(() => {
  window.sessionStorage.clear();
});

describe("presenceIntent", () => {
  it("defaults to offline and round-trips Online intent in sessionStorage", () => {
    expect(readPresenceOnlineIntent()).toBe(false);
    writePresenceOnlineIntent(true);
    expect(readPresenceOnlineIntent()).toBe(true);
    expect(window.sessionStorage.getItem("rrb_silver_chat_presence_intent")).toBe(
      "online",
    );
    writePresenceOnlineIntent(false);
    expect(readPresenceOnlineIntent()).toBe(false);
    expect(window.sessionStorage.getItem("rrb_silver_chat_presence_intent")).toBeNull();
  });
});
