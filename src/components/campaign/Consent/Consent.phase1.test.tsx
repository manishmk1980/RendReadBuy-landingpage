/**
 * Phase 1 acceptance from F.2B-2 section 4.6 (P1–P11).
 *
 * Automated in this file: banner actions, independent choices, host-only
 * cookie attributes, same-document updates, rendered markup, browser API
 * identity, and an unset NEXT_PUBLIC_GTM_ID.
 *
 * Still outside this file: a production browser's network log, a second
 * browser tab, a live request to rentreadbuy.com, and proof that container
 * GTM-MRLNJ7Q was not published.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CampaignPage from "@/app/page";
import { campaignCopy } from "@/config/campaign";
import { AnalyticsListener } from "@/lib/analytics/AnalyticsListener";
import { TagManager } from "@/lib/analytics/TagManager";
import {
  CONSENT_COOKIE_NAME,
  CONSENT_RETENTION,
  readConsentFromCookieString,
  readStoredConsent,
} from "@/lib/consent";

const natives = vi.hoisted(() => ({
  fetch: globalThis.fetch,
  XMLHttpRequest: globalThis.XMLHttpRequest,
  xhrOpen: globalThis.XMLHttpRequest?.prototype.open,
  xhrSend: globalThis.XMLHttpRequest?.prototype.send,
  sendBeacon: globalThis.navigator?.sendBeacon,
  Image: globalThis.Image,
  appendChild: globalThis.Node?.prototype.appendChild,
  insertBefore: globalThis.Node?.prototype.insertBefore,
  insertAdjacentHTML: globalThis.Element?.prototype.insertAdjacentHTML,
  documentWrite: globalThis.Document?.prototype.write,
}));

const BLOCKED_REQUEST = /googletagmanager\.com|google-analytics\.com|analytics\.google\.com|connect\.facebook\.net|facebook\.com\/tr/;

class InertObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

let writes: string[] = [];
let restoreNetwork: (() => void) | undefined;
const requests: string[] = [];

function installCookieJar() {
  const jar = new Map<string, string>();
  writes = [];
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
    get(name: string) {
      return jar.get(name);
    },
  };
}

let jar: ReturnType<typeof installCookieJar>;

function watchNetwork() {
  requests.length = 0;
  const originalFetch = window.fetch;
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalBeacon = navigator.sendBeacon?.bind(navigator);

  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    requests.push(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    return originalFetch.call(window, input, init);
  }) as typeof window.fetch;

  XMLHttpRequest.prototype.open = function open(this: XMLHttpRequest, ...args: unknown[]) {
    requests.push(String(args[1]));
    return originalOpen.apply(this, args as Parameters<XMLHttpRequest["open"]>);
  } as typeof XMLHttpRequest.prototype.open;

  if (originalBeacon) {
    navigator.sendBeacon = ((url: string | URL, data?: BodyInit | null) => {
      requests.push(String(url));
      return originalBeacon(url, data);
    }) as typeof navigator.sendBeacon;
  }

  restoreNetwork = () => {
    window.fetch = originalFetch;
    XMLHttpRequest.prototype.open = originalOpen;
    if (originalBeacon) navigator.sendBeacon = originalBeacon;
  };
}

function listSources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return listSources(full);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [full] : [];
  });
}

function consentSources() {
  return [
    ...listSources(path.join("src", "lib", "consent")),
    ...listSources(path.join("src", "components", "campaign", "Consent")),
  ];
}

async function renderCampaign() {
  render(
    <>
      <CampaignPage />
      <TagManager />
      <AnalyticsListener />
    </>,
  );
  await waitFor(() => {
    const mode = document.querySelector("[data-consent-mode]")?.getAttribute("data-consent-mode");
    expect(mode === "banner" || mode === "hidden" || mode === "preferences").toBe(true);
  });
}

function mode() {
  return document.querySelector("[data-consent-mode]")?.getAttribute("data-consent-mode");
}

function switches() {
  return {
    analytics: screen.getByRole("switch", { name: /Analytics/ }) as HTMLInputElement,
    advertising: screen.getByRole("switch", { name: /Advertising/ }) as HTMLInputElement,
  };
}

function assertHostOnlyWrites() {
  expect(writes.length).toBeGreaterThan(0);
  for (const write of writes) {
    expect(write.startsWith(`${CONSENT_COOKIE_NAME}=`)).toBe(true);
    expect(write.split(";").slice(1).map((part) => part.trim())).toEqual([
      "Path=/",
      "Secure",
      "SameSite=Lax",
      `Max-Age=${CONSENT_RETENTION.maxAgeSeconds}`,
    ]);
    expect(write).not.toMatch(/domain\s*=/i);
  }
}

function assertNoTagMarkup() {
  const html = document.documentElement.innerHTML;
  expect(html).not.toMatch(BLOCKED_REQUEST);
  expect(html).not.toMatch(/gtag\s*\(/);
  expect(html).not.toContain("fbq(");
  expect(html).not.toContain("GTM-MRLNJ7Q");
  expect(document.querySelector('script[src*="googletagmanager"]')).toBeNull();
  expect(document.getElementById("gtm")).toBeNull();
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
  jar = installCookieJar();
  delete window.dataLayer;
});

afterEach(() => {
  restoreNetwork?.();
  restoreNetwork = undefined;
  cleanup();
  Reflect.deleteProperty(document, "cookie");
  delete window.dataLayer;
  document.body.style.overflow = "";
});

describe("Phase 1 consent", () => {
  it("P1 shows the banner with both categories denied and no tag markup", async () => {
    watchNetwork();
    const href = window.location.href;
    await renderCampaign();

    expect(mode()).toBe("banner");
    expect(screen.getByRole("button", { name: "Accept All" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reject Optional" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Manage Preferences" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cookie settings" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Privacy" }).getAttribute("href")).toContain("/privacy-policy");
    expect(readStoredConsent()).toBeNull();
    expect(jar.get("_ga")).toBeUndefined();
    expect(jar.get("_fbp")).toBeUndefined();
    expect(writes).toEqual([]);
    assertNoTagMarkup();
    expect(requests.join("\n")).not.toMatch(BLOCKED_REQUEST);
    expect(window.location.href).toBe(href);

    const banner = screen.getByText(campaignCopy.consent.bannerTitle).closest("section");
    expect(banner?.textContent).not.toMatch(/180/);
    expect(JSON.stringify(campaignCopy.consent)).not.toMatch(/180/);
    for (const button of screen.getAllByRole("button")) {
      if (!/Accept All|Reject Optional|Manage Preferences|Cookie settings/.test(button.textContent ?? "")) continue;
      expect(button.getAttribute("data-track-event")).toBeNull();
    }
  });

  it("P2 stores Accept All on the same document and still loads no tags", async () => {
    watchNetwork();
    const href = window.location.href;
    const tracked = window.dataLayer?.length ?? 0;
    await renderCampaign();
    const links = screen.getAllByRole("link").map((link) => link.getAttribute("href"));
    const rendered = requests.length;

    fireEvent.click(screen.getByRole("button", { name: "Accept All" }));

    expect(readStoredConsent()).toMatchObject({ analytics: "granted", advertising: "granted" });
    expect(mode()).toBe("hidden");
    expect(screen.queryByRole("button", { name: "Accept All" })).toBeNull();
    expect(window.location.href).toBe(href);
    expect(screen.getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual(links);
    expect(window.dataLayer?.length ?? 0).toBe(tracked);
    expect(requests.slice(rendered)).toEqual([]);
    assertHostOnlyWrites();
    assertNoTagMarkup();
  });

  it("P3 stores Reject Optional without a reload or a tag request", async () => {
    watchNetwork();
    const href = window.location.href;
    await renderCampaign();
    const rendered = requests.length;

    fireEvent.click(screen.getByRole("button", { name: "Reject Optional" }));

    expect(readStoredConsent()).toMatchObject({ analytics: "denied", advertising: "denied" });
    expect(mode()).toBe("hidden");
    expect(window.location.href).toBe(href);
    expect(requests.slice(rendered)).toEqual([]);
    assertNoTagMarkup();
  });

  it("P4 saves analytics only", async () => {
    watchNetwork();
    const href = window.location.href;
    await renderCampaign();
    fireEvent.click(screen.getByRole("button", { name: "Manage Preferences" }));

    const controls = switches();
    expect(controls.analytics.checked).toBe(false);
    expect(controls.advertising.checked).toBe(false);
    const rendered = requests.length;
    fireEvent.click(controls.analytics);
    fireEvent.click(screen.getByRole("button", { name: "Save preferences" }));

    expect(readStoredConsent()).toMatchObject({ analytics: "granted", advertising: "denied" });
    expect(mode()).toBe("hidden");
    expect(window.location.href).toBe(href);
    expect(requests.slice(rendered)).toEqual([]);
    assertNoTagMarkup();
  });

  it("P5 saves advertising only and still does not load GTM, GA4, or Meta", async () => {
    watchNetwork();
    const href = window.location.href;
    await renderCampaign();
    fireEvent.click(screen.getByRole("button", { name: "Manage Preferences" }));
    const rendered = requests.length;
    fireEvent.click(switches().advertising);
    fireEvent.click(screen.getByRole("button", { name: "Save preferences" }));

    expect(readStoredConsent()).toMatchObject({ analytics: "denied", advertising: "granted" });
    expect(mode()).toBe("hidden");
    expect(window.location.href).toBe(href);
    expect(requests.slice(rendered)).toEqual([]);
    expect(document.getElementById("gtm")).toBeNull();
    assertNoTagMarkup();
  });

  it("P6 reopens Cookie settings on the saved values and ignores a dismiss", async () => {
    await renderCampaign();
    fireEvent.click(screen.getByRole("button", { name: "Manage Preferences" }));
    fireEvent.click(switches().analytics);
    fireEvent.click(screen.getByRole("button", { name: "Save preferences" }));
    const saved = readStoredConsent();
    const writesAfterSave = writes.length;

    fireEvent.click(screen.getByRole("button", { name: "Cookie settings" }));
    expect(screen.getByRole("dialog", { name: "Cookie settings" })).toBeTruthy();
    expect(switches().analytics.checked).toBe(true);
    expect(switches().advertising.checked).toBe(false);
    expect(writes).toHaveLength(writesAfterSave);

    fireEvent.click(switches().advertising);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(readStoredConsent()).toEqual(saved);
    expect(writes).toHaveLength(writesAfterSave);
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Cookie settings" }));
    expect(switches().analytics.checked).toBe(true);
    expect(switches().advertising.checked).toBe(false);
    fireEvent.click(switches().advertising);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(readStoredConsent()).toEqual(saved);

    fireEvent.click(screen.getByRole("button", { name: "Cookie settings" }));
    fireEvent.click(switches().advertising);
    fireEvent.click(screen.getByRole("dialog").parentElement!);
    expect(readStoredConsent()).toEqual(saved);

    fireEvent.click(screen.getByRole("button", { name: "Cookie settings" }));
    fireEvent.click(switches().advertising);
    fireEvent.click(screen.getByRole("button", { name: "Save preferences" }));
    expect(readStoredConsent()).toMatchObject({ analytics: "granted", advertising: "granted" });
    expect(mode()).toBe("hidden");
  });

  it("P6 uses denied defaults only when Cookie settings has no valid saved choice", async () => {
    jar.set(CONSENT_COOKIE_NAME, "not-a-choice");
    jar.set("_ga", "GA1.2.keep");
    await renderCampaign();

    expect(mode()).toBe("banner");
    fireEvent.click(screen.getByRole("button", { name: "Cookie settings" }));
    expect(switches().analytics.checked).toBe(false);
    expect(switches().advertising.checked).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(jar.get(CONSENT_COOKIE_NAME)).toBe("not-a-choice");
    expect(jar.get("_ga")).toBe("GA1.2.keep");
    expect(writes).toEqual([]);
    expect(mode()).toBe("banner");
  });

  it("P7 keeps the last save across a remount and does not set a parent domain", async () => {
    const view = render(
      <>
        <CampaignPage />
        <TagManager />
      </>,
    );
    await waitFor(() => expect(mode()).toBe("banner"));
    fireEvent.click(screen.getByRole("button", { name: "Reject Optional" }));
    fireEvent.click(screen.getByRole("button", { name: "Cookie settings" }));
    fireEvent.click(switches().analytics);
    fireEvent.click(screen.getByRole("button", { name: "Save preferences" }));
    const saved = readStoredConsent();
    const cookieHeader = document.cookie;
    view.unmount();

    render(
      <>
        <CampaignPage />
        <TagManager />
      </>,
    );
    await waitFor(() => expect(mode()).toBe("hidden"));

    expect(screen.queryByRole("button", { name: "Accept All" })).toBeNull();
    expect(readStoredConsent()).toEqual(saved);
    expect(readConsentFromCookieString(cookieHeader)).toEqual(saved);
    assertHostOnlyWrites();
    expect(screen.getByRole("button", { name: "Cookie settings" })).toBeTruthy();
  });

  it("P8 writes the provisional 180-day lifetime and does not present it as final", async () => {
    expect(CONSENT_RETENTION.legalConfirmationRequired).toBe(true);
    expect(CONSENT_RETENTION.status).toBe("provisional");
    expect(CONSENT_RETENTION.maxAgeSeconds).toBe(15_552_000);
    expect(CONSENT_RETENTION.note).toMatch(/legal confirmation/);

    await renderCampaign();
    fireEvent.click(screen.getByRole("button", { name: "Accept All" }));
    expect(writes.some((write) => write.includes("Max-Age=15552000"))).toBe(true);
    expect(document.body.textContent).not.toContain(CONSENT_RETENTION.note);
    expect(document.body.textContent).not.toContain("180 days");
  });

  it("P9 leaves fetch, XHR, sendBeacon, image construction, and DOM insertion untouched", async () => {
    await renderCampaign();
    fireEvent.click(screen.getByRole("button", { name: "Manage Preferences" }));
    fireEvent.click(switches().analytics);
    fireEvent.click(screen.getByRole("button", { name: "Save preferences" }));
    fireEvent.click(screen.getByRole("button", { name: "Cookie settings" }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(window.fetch).toBe(natives.fetch);
    expect(window.XMLHttpRequest).toBe(natives.XMLHttpRequest);
    expect(XMLHttpRequest.prototype.open).toBe(natives.xhrOpen);
    expect(XMLHttpRequest.prototype.send).toBe(natives.xhrSend);
    expect(navigator.sendBeacon).toBe(natives.sendBeacon);
    expect(window.Image).toBe(natives.Image);
    expect(Node.prototype.appendChild).toBe(natives.appendChild);
    expect(Node.prototype.insertBefore).toBe(natives.insertBefore);
    expect(Element.prototype.insertAdjacentHTML).toBe(natives.insertAdjacentHTML);
    expect(Document.prototype.write).toBe(natives.documentWrite);

    const forbidden = /googletagmanager|google-analytics|gtag\s*\(|fbq\s*\(|GTM-|location\.reload|location\.assign|location\.replace|sendBeacon|XMLHttpRequest/;
    for (const file of consentSources()) {
      const code = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
      expect(code, path.relative(process.cwd(), file)).not.toMatch(forbidden);
    }
    const cookieSource = readFileSync(path.join("src", "lib", "consent", "consentCookie.ts"), "utf8");
    expect(cookieSource.match(/document\.cookie\s*=/g)).toHaveLength(1);
  });

  it("P10 does not attach the choice to a parent domain or rewrite other cookies", async () => {
    jar.set("_ga", "GA1.2.rentreadbuy");
    jar.set("_fbp", "fb.1.rentreadbuy");
    jar.set("rrb_session", "main-site");
    await renderCampaign();

    fireEvent.click(screen.getByRole("button", { name: "Accept All" }));
    fireEvent.click(screen.getByRole("button", { name: "Cookie settings" }));
    fireEvent.click(switches().advertising);
    fireEvent.click(screen.getByRole("button", { name: "Save preferences" }));

    expect(jar.get("_ga")).toBe("GA1.2.rentreadbuy");
    expect(jar.get("_fbp")).toBe("fb.1.rentreadbuy");
    expect(jar.get("rrb_session")).toBe("main-site");
    assertHostOnlyWrites();
    expect(readStoredConsent()).toMatchObject({ analytics: "granted", advertising: "denied" });
    expect(within(screen.getByRole("contentinfo")).getByRole("link", { name: "Privacy" })).toBeTruthy();
  });

  it("P11 keeps NEXT_PUBLIC_GTM_ID unset and does not render a container", async () => {
    expect(process.env.NEXT_PUBLIC_GTM_ID ?? "").toBe("");
    const example = readFileSync(".env.example", "utf8");
    const exampleLine = example.split(/\r?\n/).find((line) => line.startsWith("NEXT_PUBLIC_GTM_ID="));
    expect(exampleLine).toBe("NEXT_PUBLIC_GTM_ID=");

    const envOffenders = readdirSync(".")
      .filter((name) => name.startsWith(".env"))
      .flatMap((name) => {
        const line = readFileSync(name, "utf8")
          .split(/\r?\n/)
          .find((entry) => /^\s*NEXT_PUBLIC_GTM_ID\s*=/.test(entry));
        if (!line || line.trim() === "NEXT_PUBLIC_GTM_ID=") return [];
        return [`${name}: ${line.trim()}`];
      });
    expect(envOffenders, "Phase 1 requires NEXT_PUBLIC_GTM_ID to stay unset").toEqual([]);

    await renderCampaign();
    expect(document.getElementById("gtm")).toBeNull();
    expect(document.documentElement.innerHTML).not.toContain("GTM-MRLNJ7Q");
    expect(document.documentElement.innerHTML).not.toContain("googletagmanager.com");
  });
});
