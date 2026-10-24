// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import {
  clearLoginFailures,
  clearLoginThrottleForTests,
  clientIpFromHeaders,
  isLoginThrottled,
  recordLoginFailure,
} from "./rateLimit";

afterEach(async () => {
  await clearLoginThrottleForTests();
});

describe("login throttle", () => {
  it("allows attempts until the failure threshold", async () => {
    const ip = "203.0.113.10";
    const now = 1_000_000;
    for (let i = 0; i < 5; i += 1) {
      expect(await isLoginThrottled(ip, now)).toBe(false);
      await recordLoginFailure(ip, now);
    }
    expect(await isLoginThrottled(ip, now)).toBe(true);
  });

  it("clears on successful login path", async () => {
    const ip = "203.0.113.11";
    const now = 1_000_000;
    await recordLoginFailure(ip, now);
    await recordLoginFailure(ip, now);
    await clearLoginFailures(ip);
    expect(await isLoginThrottled(ip, now)).toBe(false);
  });
});

describe("clientIpFromHeaders trust boundary", () => {
  it("ignores spoofed X-Forwarded-For when trust proxy is off", () => {
    const headers = new Headers({
      "x-forwarded-for": "198.51.100.20",
      "x-real-ip": "203.0.113.50",
    });
    expect(clientIpFromHeaders(headers, {})).toBe("untrusted");
    expect(clientIpFromHeaders(headers, { CHAT_ADMIN_TRUST_PROXY: "0" })).toBe("untrusted");
  });

  it("uses the leftmost forwarded IP only when trust proxy is enabled", () => {
    const headers = new Headers({
      "x-forwarded-for": "198.51.100.20, 203.0.113.10",
    });
    expect(clientIpFromHeaders(headers, { CHAT_ADMIN_TRUST_PROXY: "1" })).toBe("198.51.100.20");
  });
});
