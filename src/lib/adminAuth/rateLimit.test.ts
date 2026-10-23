// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import {
  clearLoginFailures,
  clearLoginThrottleForTests,
  isLoginThrottled,
  recordLoginFailure,
} from "./rateLimit";

afterEach(() => {
  clearLoginThrottleForTests();
});

describe("login throttle", () => {
  it("allows attempts until the failure threshold", () => {
    const ip = "203.0.113.10";
    const now = 1_000_000;
    for (let i = 0; i < 5; i += 1) {
      expect(isLoginThrottled(ip, now)).toBe(false);
      recordLoginFailure(ip, now);
    }
    expect(isLoginThrottled(ip, now)).toBe(true);
  });

  it("clears on successful login path", () => {
    const ip = "203.0.113.11";
    const now = 1_000_000;
    recordLoginFailure(ip, now);
    recordLoginFailure(ip, now);
    clearLoginFailures(ip);
    expect(isLoginThrottled(ip, now)).toBe(false);
  });
});
