import { afterEach, describe, expect, it } from "vitest";
import {
  CONSENT_COOKIE_NAME,
  CONSENT_COOKIE_VERSION,
  CONSENT_RETENTION,
  DENIED_PREFERENCES,
  PRESELECTED_EDITOR_PREFERENCES,
  parseConsentValue,
  preferencesForEditor,
  readConsentFromCookieString,
  readStoredConsent,
  serializeConsentCookie,
  writeStoredConsent,
  type StoredConsent,
} from "./consentCookie";

const NOW = 1_760_515_200_000;

function stored(overrides: Partial<StoredConsent> = {}): StoredConsent {
  return {
    version: CONSENT_COOKIE_VERSION,
    analytics: "granted",
    advertising: "denied",
    chosenAt: NOW,
    ...overrides,
  };
}

function installCookieJar() {
  const jar = new Map<string, string>();
  const writes: string[] = [];
  Object.defineProperty(document, "cookie", {
    configurable: true,
    get() {
      return [...jar.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
    },
    set(input: string) {
      writes.push(input);
      const [pair, ...attrs] = input.split(";").map((part) => part.trim());
      const separator = pair.indexOf("=");
      const name = pair.slice(0, separator);
      const rawValue = pair.slice(separator + 1);
      const maxAge = attrs.find((attr) => attr.toLowerCase().startsWith("max-age="));
      if (maxAge && Number(maxAge.split("=")[1]) <= 0) {
        jar.delete(name);
        return;
      }
      let value = rawValue;
      try {
        value = decodeURIComponent(rawValue);
      } catch {
        value = rawValue;
      }
      jar.set(name, value);
    },
  });

  return {
    writes,
    set(name: string, value: string) {
      jar.set(name, value);
    },
    get(name: string) {
      return jar.get(name);
    },
  };
}

afterEach(() => {
  Reflect.deleteProperty(document, "cookie");
});

describe("consent cookie", () => {
  it("records 180 days as provisional and still requiring legal confirmation", () => {
    expect(CONSENT_RETENTION).toMatchObject({
      maxAgeSeconds: 15_552_000,
      approximateDays: 180,
      status: "provisional",
      legalConfirmationRequired: true,
    });
    expect(CONSENT_RETENTION.note).toMatch(/provisional/i);
    expect(CONSENT_RETENTION.note).toMatch(/180 days/);
    expect(CONSENT_RETENTION.note).toMatch(/legal confirmation/);
    expect(15_552_000).toBe(180 * 24 * 60 * 60);
  });

  it("writes a host-only cookie and leaves every other cookie unchanged", () => {
    const jar = installCookieJar();
    jar.set("_ga", "GA1.1.111");
    jar.set("_fbp", "fb.1.222");
    jar.set("rrb_session", "rentreadbuy-app");
    jar.set("other", "keep");

    const saved = writeStoredConsent({ analytics: "granted", advertising: "granted" }, NOW);

    expect(saved).toEqual(stored({ analytics: "granted", advertising: "granted" }));
    expect(jar.writes).toEqual([serializeConsentCookie(saved)]);
    const attributes = jar.writes[0].split(";").slice(1).map((part) => part.trim());
    expect(attributes).toEqual(["Path=/", "Secure", "SameSite=Lax", "Max-Age=15552000"]);
    expect(jar.writes[0]).not.toMatch(/domain\s*=/i);
    expect(jar.get("_ga")).toBe("GA1.1.111");
    expect(jar.get("_fbp")).toBe("fb.1.222");
    expect(jar.get("rrb_session")).toBe("rentreadbuy-app");
    expect(jar.get("other")).toBe("keep");
    expect(readStoredConsent(NOW)).toEqual(saved);
  });

  it("preselects the editor when no valid choice is saved and keeps saved choices exact", () => {
    expect(DENIED_PREFERENCES).toEqual({ analytics: "denied", advertising: "denied" });
    expect(PRESELECTED_EDITOR_PREFERENCES).toEqual({ analytics: "granted", advertising: "granted" });

    const suggested = preferencesForEditor(null);
    expect(suggested).toEqual(PRESELECTED_EDITOR_PREFERENCES);
    expect(suggested).not.toBe(PRESELECTED_EDITOR_PREFERENCES);
    suggested.analytics = "denied";
    expect(preferencesForEditor(null)).toEqual(PRESELECTED_EDITOR_PREFERENCES);

    expect(preferencesForEditor(stored({ analytics: "denied", advertising: "granted" }))).toEqual({
      analytics: "denied",
      advertising: "granted",
    });
    expect(preferencesForEditor(stored({ analytics: "denied", advertising: "denied" }))).toEqual(DENIED_PREFERENCES);
    expect(preferencesForEditor(stored({ analytics: "granted", advertising: "granted" }))).toEqual({
      analytics: "granted",
      advertising: "granted",
    });

    const header = [
      "_ga=GA1.1.111",
      `${CONSENT_COOKIE_NAME}=v1.analytics.granted.advertising.denied.t.${NOW}`,
      "theme=paper",
    ].join("; ");
    expect(readConsentFromCookieString(header, NOW)).toEqual(
      stored({ analytics: "granted", advertising: "denied" }),
    );

    expect(parseConsentValue("not-a-choice", NOW)).toBeNull();
    expect(parseConsentValue(`v2.analytics.granted.advertising.granted.t.${NOW}`, NOW)).toBeNull();
    expect(parseConsentValue(`v1.analytics.yes.advertising.granted.t.${NOW}`, NOW)).toBeNull();
    expect(parseConsentValue("%E0%A4%A", NOW)).toBeNull();

    const expiredAt = NOW - (CONSENT_RETENTION.maxAgeSeconds * 1000 + 1);
    const expiredValue = `v1.analytics.granted.advertising.granted.t.${expiredAt}`;
    expect(parseConsentValue(expiredValue, NOW)).toBeNull();
    expect(preferencesForEditor(parseConsentValue("not-a-choice", NOW))).toEqual(PRESELECTED_EDITOR_PREFERENCES);
    expect(preferencesForEditor(parseConsentValue(expiredValue, NOW))).toEqual(PRESELECTED_EDITOR_PREFERENCES);
    expect(preferencesForEditor(parseConsentValue("not-a-choice", NOW))).not.toEqual(DENIED_PREFERENCES);

    const jar = installCookieJar();
    jar.set(CONSENT_COOKIE_NAME, "not-a-choice");
    jar.set("_ga", "GA1.1.111");
    expect(readStoredConsent(NOW)).toBeNull();
    expect(jar.get(CONSENT_COOKIE_NAME)).toBe("not-a-choice");
    expect(jar.get("_ga")).toBe("GA1.1.111");
    expect(jar.writes).toEqual([]);
  });
});
