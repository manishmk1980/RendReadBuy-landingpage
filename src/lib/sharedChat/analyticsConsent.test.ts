import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { writeStoredConsent } from "@/lib/consent";
import {
  subscribeSharedChatAnalyticsConsent,
  syncSharedChatAnalyticsConsent,
} from "./analyticsConsent";

const NOW = 1_760_515_200_000;

function installCookieJar() {
  const jar = new Map<string, string>();
  Object.defineProperty(document, "cookie", {
    configurable: true,
    get() {
      return [...jar.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
    },
    set(input: string) {
      const [pair, ...attrs] = input.split(";").map((part) => part.trim());
      const separator = pair.indexOf("=");
      const name = pair.slice(0, separator);
      const rawValue = pair.slice(separator + 1);
      const maxAge = attrs.find((attr) => attr.toLowerCase().startsWith("max-age="));
      if (maxAge && Number(maxAge.split("=")[1]) <= 0) {
        jar.delete(name);
        return;
      }
      try {
        jar.set(name, decodeURIComponent(rawValue));
      } catch {
        jar.set(name, rawValue);
      }
    },
  });
}

beforeEach(() => {
  installCookieJar();
  vi.spyOn(Date, "now").mockReturnValue(NOW);
  delete window.__PRIMEWAYZ_ANALYTICS_CONSENT__;
});

afterEach(() => {
  Reflect.deleteProperty(document, "cookie");
  delete window.__PRIMEWAYZ_ANALYTICS_CONSENT__;
  vi.restoreAllMocks();
});

describe("shared chat analytics consent bridge", () => {
  it("denies widget analytics when no consent cookie exists", () => {
    expect(syncSharedChatAnalyticsConsent()).toBe(false);
    expect(window.__PRIMEWAYZ_ANALYTICS_CONSENT__).toBe(false);
  });

  it("denies widget analytics when analytics is denied even if advertising is granted", () => {
    writeStoredConsent({ analytics: "denied", advertising: "granted" });
    expect(syncSharedChatAnalyticsConsent()).toBe(false);
    expect(window.__PRIMEWAYZ_ANALYTICS_CONSENT__).toBe(false);
  });

  it("grants widget analytics only after an analytics grant", () => {
    writeStoredConsent({ analytics: "granted", advertising: "denied" });
    expect(syncSharedChatAnalyticsConsent()).toBe(true);
    expect(window.__PRIMEWAYZ_ANALYTICS_CONSENT__).toBe(true);
  });

  it("updates the widget flag when cookie settings change", () => {
    const stop = subscribeSharedChatAnalyticsConsent();
    expect(window.__PRIMEWAYZ_ANALYTICS_CONSENT__).toBe(false);

    writeStoredConsent({ analytics: "granted", advertising: "granted" });
    expect(window.__PRIMEWAYZ_ANALYTICS_CONSENT__).toBe(true);

    writeStoredConsent({ analytics: "denied", advertising: "denied" });
    expect(window.__PRIMEWAYZ_ANALYTICS_CONSENT__).toBe(false);
    stop();
  });
});
