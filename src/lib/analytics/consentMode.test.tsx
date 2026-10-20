/**
 * Consent bootstrap for a future GTM load. GTM stays unloaded: NEXT_PUBLIC_GTM_ID
 * is empty, and these tests never request Google or Meta.
 */
import { readFileSync } from "node:fs";
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TagManager, gtmLoaderSource, loadGtmContainer } from "@/lib/analytics/TagManager";
import { ConsentModeSync } from "@/lib/analytics/ConsentModeSync";
import {
  CONSENT_SIGNALS,
  CONSENT_WAIT_FOR_UPDATE_MS,
  DENIED_GOOGLE_CONSENT,
  applyOpenPageConsent,
  consentBootstrapSource,
  consentSignal,
  googleConsentFromPreferences,
  runConsentBootstrap,
} from "@/lib/analytics/consentMode";
import { track } from "@/lib/analytics/track";
import { isCampaignEvent } from "@/lib/analytics/events";
import {
  CONSENT_COOKIE_NAME,
  CONSENT_COOKIE_VERSION,
  CONSENT_RETENTION,
  parseConsentValue,
  writeStoredConsent,
  type ConsentChoice,
  type ConsentPreferences,
} from "@/lib/consent";

const NOW = 1_760_515_200_000;

function payload(analytics: ConsentChoice, advertising: ConsentChoice, chosenAt = NOW) {
  return `v${CONSENT_COOKIE_VERSION}.analytics.${analytics}.advertising.${advertising}.t.${chosenAt}`;
}

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
  return {
    set(name: string, value: string) {
      jar.set(name, value);
    },
  };
}

function resetRuntime() {
  delete window.dataLayer;
  delete window.gtag;
  delete window.__rrbConsentDefaultSet;
  delete window.__rrbConsentApplied;
  delete window.__rrbGtmLoaded;
}

function command(entry: unknown) {
  if (!entry || typeof entry !== "object") return null;
  const item = entry as { 0?: unknown; 1?: unknown; 2?: unknown };
  if (item[0] !== "consent" || (item[1] !== "default" && item[1] !== "update")) return null;
  if (!item[2] || typeof item[2] !== "object") return null;
  return { action: item[1], state: item[2] as Record<string, unknown> };
}

function commands() {
  return (window.dataLayer ?? []).map(command).filter((entry) => entry !== null);
}

function signals() {
  return (window.dataLayer ?? []).filter(
    (entry): entry is Record<string, unknown> =>
      !!entry &&
      typeof entry === "object" &&
      !Array.isArray(entry) &&
      CONSENT_SIGNALS.analytics in entry,
  );
}

function campaignEntries(name?: string) {
  return (window.dataLayer ?? []).filter((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return false;
    const event = (entry as { event?: unknown }).event;
    if (!isCampaignEvent(event)) return false;
    return name ? event === name : true;
  });
}

/** Sequential read: a campaign event is released only when analytics consent is already granted. */
function releasedCampaignEvents() {
  let analytics: ConsentChoice = "denied";
  const released: unknown[] = [];
  for (const entry of window.dataLayer ?? []) {
    const consent = command(entry);
    if (consent) {
      const next = consent.state.analytics_storage;
      if (next === "granted" || next === "denied") analytics = next;
      continue;
    }
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const event = (entry as { event?: unknown }).event;
    if (isCampaignEvent(event) && analytics === "granted") released.push(entry);
  }
  return released;
}

beforeEach(() => {
  resetRuntime();
  installCookieJar();
  vi.spyOn(Date, "now").mockReturnValue(NOW);
});

afterEach(() => {
  cleanup();
  resetRuntime();
  Reflect.deleteProperty(document, "cookie");
  document.querySelectorAll('script[src*="googletagmanager"]').forEach((node) => node.remove());
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("consent bootstrap ordering", () => {
  it("sets every consent type to denied and does not request gtm.js until both grants exist", () => {
    runConsentBootstrap();

    expect(window.__rrbConsentDefaultSet).toBe(true);
    expect(commands()[0]).toEqual({
      action: "default",
      state: { ...DENIED_GOOGLE_CONSENT, wait_for_update: CONSENT_WAIT_FOR_UPDATE_MS },
    });
    expect(signals().at(-1)).toEqual(consentSignal(DENIED_GOOGLE_CONSENT));
    expect(signals().at(-1)).not.toHaveProperty("event");

    const loader = gtmLoaderSource("GTM-TEST1");
    expect(loader).toContain("if(!w.__rrbConsentDefaultSet||w.__rrbGtmLoaded)return");
    expect(loader).toContain('__rrbConsentApplied!=="granted|granted|granted|granted"');
    new Function(loader)();
    expect(document.querySelector('script[src*="googletagmanager"]')).toBeNull();
    expect(window.__rrbGtmLoaded).toBeUndefined();

    for (const preferences of [
      { analytics: "granted", advertising: "denied" },
      { analytics: "denied", advertising: "granted" },
      { analytics: "denied", advertising: "denied" },
    ] as const) {
      applyOpenPageConsent(preferences);
      new Function(loader)();
      expect(document.querySelector('script[src*="googletagmanager"]')).toBeNull();
    }

    applyOpenPageConsent({ analytics: "granted", advertising: "granted" });
    new Function(loader)();
    new Function(loader)();
    const gtmStart = (window.dataLayer ?? []).findIndex(
      (entry) => !!entry && typeof entry === "object" && (entry as { event?: unknown }).event === "gtm.js",
    );
    expect(gtmStart).toBeGreaterThan(0);
    expect(commands()[0]?.action).toBe("default");
    expect(document.querySelectorAll('script[src*="googletagmanager.com/gtm.js?id=GTM-TEST1"]')).toHaveLength(1);
  });

  it("does not inject gtm.js when the consent default has not run", () => {
    window.__rrbConsentApplied = "granted|granted|granted|granted";
    new Function(gtmLoaderSource("GTM-TEST1"))();
    loadGtmContainer("not-a-container");
    expect(document.querySelector('script[src*="googletagmanager"]')).toBeNull();
    expect(window.dataLayer ?? []).toEqual([]);
  });

  it("keeps the GTM component unloaded and does not load a second default", () => {
    expect(process.env.NEXT_PUBLIC_GTM_ID ?? "").toBe("");
    render(<TagManager />);
    expect(document.getElementById("gtm")).toBeNull();

    const source = consentBootstrapSource();
    expect(source).toContain(`wait_for_update:${CONSENT_WAIT_FOR_UPDATE_MS}`);
    expect(source).not.toMatch(/googletagmanager|google-analytics|fbq\s*\(|fbevents|GTM-/);

    const layout = readFileSync("src/app/layout.tsx", "utf8");
    const bootstrapAt = layout.indexOf('id="rrb-consent-bootstrap"');
    expect(bootstrapAt).toBeGreaterThan(-1);
    expect(layout.slice(bootstrapAt, layout.indexOf("<TagManager />"))).toContain('strategy="beforeInteractive"');
    expect(bootstrapAt).toBeLessThan(layout.indexOf("<TagManager />"));

    runConsentBootstrap();
    runConsentBootstrap();
    expect(commands().filter((entry) => entry?.action === "default")).toHaveLength(1);
  });

  it("loads the configured container only after both categories are granted, including a later change", async () => {
    vi.stubEnv("NEXT_PUBLIC_GTM_ID", "GTM-MRLNJ7Q");
    vi.resetModules();
    const { TagManager } = await import("./TagManager");
    const { ConsentModeSync } = await import("./ConsentModeSync");
    const { writeStoredConsent: writeChoice } = await import("@/lib/consent");
    render(
      <>
        <ConsentModeSync />
        <TagManager />
      </>,
    );
    await waitFor(() => expect(window.__rrbConsentDefaultSet).toBe(true));
    expect(document.querySelector('script[src*="googletagmanager"]')).toBeNull();

    writeChoice({ analytics: "granted", advertising: "denied" }, NOW);
    writeChoice({ analytics: "denied", advertising: "granted" }, NOW + 1);
    expect(document.querySelector('script[src*="googletagmanager"]')).toBeNull();

    writeChoice({ analytics: "granted", advertising: "granted" }, NOW + 2);
    await waitFor(() =>
      expect(document.querySelector('script[src*="googletagmanager.com/gtm.js?id=GTM-MRLNJ7Q"]')).not.toBeNull(),
    );
    expect(document.querySelectorAll('script[src*="googletagmanager"]')).toHaveLength(1);

    writeChoice({ analytics: "denied", advertising: "denied" }, NOW + 3);
    expect(document.querySelectorAll('script[src*="googletagmanager"]')).toHaveLength(1);
    expect(commands().at(-1)?.state).toEqual(DENIED_GOOGLE_CONSENT);
  });

  it("loads a saved accept-all choice without waiting for another click", async () => {
    installCookieJar().set(CONSENT_COOKIE_NAME, payload("granted", "granted"));
    vi.stubEnv("NEXT_PUBLIC_GTM_ID", "GTM-MRLNJ7Q");
    vi.resetModules();
    const { TagManager } = await import("./TagManager");
    const { ConsentModeSync } = await import("./ConsentModeSync");
    render(
      <>
        <ConsentModeSync />
        <TagManager />
      </>,
    );
    await waitFor(() =>
      expect(document.querySelector('script[src*="googletagmanager.com/gtm.js?id=GTM-MRLNJ7Q"]')).not.toBeNull(),
    );
    expect(commands()[0]?.action).toBe("default");
    expect(commands().some((entry) => entry?.action === "update")).toBe(true);
  });
});

describe("saved consent preferences", () => {
  it("applies a valid cookie after the denied default and ignores an unusable cookie", () => {
    const cases: Array<{ raw: string | null; preferences: ConsentPreferences | null }> = [
      { raw: null, preferences: null },
      { raw: payload("granted", "denied"), preferences: { analytics: "granted", advertising: "denied" } },
      { raw: payload("denied", "granted"), preferences: { analytics: "denied", advertising: "granted" } },
      { raw: payload("granted", "granted"), preferences: { analytics: "granted", advertising: "granted" } },
      { raw: payload("denied", "denied"), preferences: { analytics: "denied", advertising: "denied" } },
      { raw: payload("granted", "denied").replace("granted", "grant%65d"), preferences: { analytics: "granted", advertising: "denied" } },
      { raw: payload("granted", "denied", NOW + 5_000), preferences: { analytics: "granted", advertising: "denied" } },
      { raw: payload("granted", "granted", NOW - CONSENT_RETENTION.maxAgeSeconds * 1000 - 1), preferences: null },
      { raw: `v${CONSENT_COOKIE_VERSION + 1}.analytics.granted.advertising.granted.t.${NOW}`, preferences: null },
      { raw: "not-a-consent-cookie", preferences: null },
    ];

    for (const sample of cases) {
      resetRuntime();
      const jar = installCookieJar();
      jar.set("_ga", "GA1.2.other");
      if (sample.raw) jar.set(CONSENT_COOKIE_NAME, sample.raw);

      const parsed = sample.raw ? parseConsentValue(sample.raw, NOW) : null;
      runConsentBootstrap();

      expect(commands()[0]?.state).toMatchObject(DENIED_GOOGLE_CONSENT);
      if (!parsed || !sample.preferences) {
        expect(commands().some((entry) => entry?.action === "update")).toBe(false);
        expect(signals().at(-1)).toEqual(consentSignal(DENIED_GOOGLE_CONSENT));
      } else {
        const expected = googleConsentFromPreferences(sample.preferences);
        expect(parsed).toMatchObject(sample.preferences);
        expect(commands()[1]).toEqual({ action: "update", state: expected });
        expect(commands()[1]?.state).not.toHaveProperty("wait_for_update");
        expect(signals().at(-1)).toEqual(consentSignal(expected));
      }
    }
  });

  it("updates the open page when the visitor changes a saved choice", async () => {
    render(<ConsentModeSync />);
    await waitFor(() => expect(window.__rrbConsentDefaultSet).toBe(true));

    writeStoredConsent({ analytics: "granted", advertising: "denied" }, NOW);
    expect(commands().filter((entry) => entry?.action === "update")).toEqual([
      { action: "update", state: googleConsentFromPreferences({ analytics: "granted", advertising: "denied" }) },
    ]);
    expect(signals().at(-1)).toEqual(
      consentSignal(googleConsentFromPreferences({ analytics: "granted", advertising: "denied" })),
    );

    writeStoredConsent({ analytics: "granted", advertising: "denied" }, NOW + 1);
    expect(commands().filter((entry) => entry?.action === "update")).toHaveLength(1);
  });
});

describe("consent withdrawal and campaign events", () => {
  it("does not replay earlier campaign events when consent is granted", () => {
    runConsentBootstrap();
    track("silver_cta_click", { placement: "hero" });
    track("faq_open", { placement: "faq", faq: "shipping" });

    applyOpenPageConsent({ analytics: "granted", advertising: "granted" });

    expect(campaignEntries("silver_cta_click")).toEqual([{ event: "silver_cta_click", placement: "hero" }]);
    expect(campaignEntries("faq_open")).toHaveLength(1);
    expect(releasedCampaignEvents()).toEqual([]);
    expect(commands().at(-1)).toEqual({
      action: "update",
      state: googleConsentFromPreferences({ analytics: "granted", advertising: "granted" }),
    });

    track("gift_membership_click", { placement: "gift" });
    expect(releasedCampaignEvents()).toEqual([{ event: "gift_membership_click", placement: "gift" }]);
  });

  it("drops campaign events that a listener appends during the consent update", () => {
    runConsentBootstrap();
    track("silver_cta_click", { placement: "hero" });
    const layer = window.dataLayer!;
    const original = layer.push.bind(layer);
    layer.push = ((...args: unknown[]) => {
      const result = original(...args);
      const first = args[0] as { 0?: unknown } | undefined;
      if (first?.[0] === "consent") original({ event: "silver_cta_click", placement: "replayed" });
      return result;
    }) as typeof layer.push;

    applyOpenPageConsent({ analytics: "granted", advertising: "denied" });

    expect(campaignEntries("silver_cta_click")).toEqual([{ event: "silver_cta_click", placement: "hero" }]);
    expect(releasedCampaignEvents()).toEqual([]);
  });

  it("withdraws consent on the open page without pushing earlier events again", async () => {
    installCookieJar().set(CONSENT_COOKIE_NAME, payload("granted", "granted"));
    render(<ConsentModeSync />);
    await waitFor(() => expect(commands().some((entry) => entry?.action === "update")).toBe(true));

    track("rent_exit_click", { placement: "footer" });
    expect(releasedCampaignEvents()).toEqual([{ event: "rent_exit_click", placement: "footer" }]);

    writeStoredConsent({ analytics: "denied", advertising: "denied" }, NOW + 2);

    expect(campaignEntries("rent_exit_click")).toEqual([{ event: "rent_exit_click", placement: "footer" }]);
    expect(commands().at(-1)?.state).toEqual(DENIED_GOOGLE_CONSENT);
    expect(signals().at(-1)).toEqual(consentSignal(DENIED_GOOGLE_CONSENT));

    track("buy_exit_click", { placement: "footer" });
    expect(releasedCampaignEvents()).toEqual([{ event: "rent_exit_click", placement: "footer" }]);
    expect(campaignEntries()).toHaveLength(2);
  });
});
