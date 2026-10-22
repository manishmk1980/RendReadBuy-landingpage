/**
 * Runs the verified shared widget 1.3.0 (`pw-chat.js`) against a stubbed fetch,
 * so no request leaves the machine. Point SHARED_CHAT_WIDGET_ARTIFACT at
 * `embed-releases/chat/1.3.0/pw-chat.js`; otherwise this file is skipped.
 */
import { existsSync, readFileSync } from "node:fs";
import { createElement } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SharedChatSettings } from "./config";

const artifactPath = process.env.SHARED_CHAT_WIDGET_ARTIFACT;
const artifact = artifactPath && existsSync(artifactPath) ? readFileSync(artifactPath, "utf8") : null;

const API = "https://chat.example.test";
const settings: SharedChatSettings = {
  apiBaseUrl: API,
  widgetUrl: `${API}/embed/pw-chat.js`,
  widgetIntegrity: null,
};
const SERVER_OWNED_IDENTITY_KEYS = ["tenantId", "market", "sourceSite", "sourceOrigin", "sourceChannel"];

/** Server `chatWidget` payload for this campaign. Identity stays on the server. */
const RENTREADBUY_CHAT_WIDGET = {
  publicSiteKey: "rentreadbuy-silver",
  panelTitle: "RentReadBuy Reading Assistant",
  assistantName: "RentReadBuy Reading Assistant",
  teamName: "RentReadBuy team",
  greeting: "Questions about Silver Membership?",
  supportingText: "Ask about Silver: ₹899 for 3 months, with up to 2 physical books at a time.",
  leadPrompt: "Leave your details so the RentReadBuy team can follow up.",
  theme: {
    launcherBackground: "#037b80",
    headerBackground: "#02666a",
    accent: "#f08a6c",
  },
  launcher: {
    collisionSelectors: [
      'button[aria-label="Pause scenery animation"]',
      'button[aria-label="Play scenery animation"]',
    ],
  },
  intents: [
    { key: "silver_how_it_works", label: "How does Silver Membership work?" },
    { key: "silver_price_inclusions", label: "What is included in ₹899?" },
    { key: "silver_book_limits", label: "How many books can I read?" },
    { key: "silver_returns", label: "How do returns and my next book work?" },
    { key: "silver_gifting", label: "Can I gift Silver Membership?" },
    { key: "silver_joining", label: "How do I join?" },
  ],
};

interface Call {
  method: string;
  path: string;
  body: Record<string, unknown> | null;
  credentials?: RequestCredentials;
}

type Responder = (method: string, path: string) => { status: number; body: unknown };

const healthy: Responder = (method, path) => {
  if (path === "/api/platform/capabilities") {
    return { status: 200, body: { capabilities: { chat: true }, chatWidget: RENTREADBUY_CHAT_WIDGET } };
  }
  if (path === "/api/chat/availability") {
    return { status: 200, body: { status: "online", canAcceptMessages: true, responseExpectation: "" } };
  }
  if (method === "POST" && path === "/api/chat/respond") {
    return {
      status: 200,
      body: { userMessage: { id: "m1", text: "x", sender: "user", timestamp: new Date().toISOString() } },
    };
  }
  if (method === "GET" && path.startsWith("/api/chat/")) return { status: 200, body: [] };
  return { status: 200, body: { ok: true } };
};

let calls: Call[] = [];
let shadowRoots: ShadowRoot[] = [];

function stubFetch(responder: Responder) {
  const fetchStub = vi.fn(async (input: string, init: RequestInit = {}) => {
    const url = new URL(input);
    const method = init.method ?? "GET";
    calls.push({
      method,
      path: url.pathname,
      body: typeof init.body === "string" ? JSON.parse(init.body) : null,
      credentials: init.credentials,
    });
    const { status, body } = responder(method, url.pathname);
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  });
  vi.stubGlobal("fetch", fetchStub);
  window.fetch = fetchStub as unknown as typeof window.fetch;
}

/** Executes pw-chat.js the way a browser would when the script element loads. */
function executeWidgetOnInsert() {
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node instanceof HTMLScriptElement && node.dataset.rrbSharedChat === "widget") {
          window.eval(artifact!);
          node.dispatchEvent(new Event("load"));
        }
      }
    }
  });
  observer.observe(document.body, { childList: true });
  return observer;
}

async function waitFor(check: () => boolean, label: string) {
  for (let i = 0; i < 200; i += 1) {
    if (check()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`Timed out waiting for ${label}`);
}

async function loadCampaignWidget() {
  vi.resetModules();
  const { loadSharedChatWidget } = await import("./loadWidget");
  const observer = executeWidgetOnInsert();
  const result = await loadSharedChatWidget(window, settings);
  observer.disconnect();
  return result;
}

const widgetHost = () => document.getElementById("pw-chat-root");

function setViewport(width: number, height: number) {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: height });
}

function placeAt(el: HTMLElement, rect: { top: number; bottom: number; left: number; right: number }) {
  el.getBoundingClientRect = () =>
    ({
      ...rect,
      width: rect.right - rect.left,
      height: rect.bottom - rect.top,
      x: rect.left,
      y: rect.top,
      toJSON: () => ({}),
    }) as DOMRect;
}

function visitorFacingText(shadow: ShadowRoot) {
  const parts = [shadow.textContent ?? ""];
  for (const node of shadow.querySelectorAll("*")) {
    for (const name of ["aria-label", "placeholder", "title"]) {
      const value = node.getAttribute(name);
      if (value) parts.push(value);
    }
  }
  return parts.join(" | ");
}

const chatApi = () => (window as unknown as { PrimewayzChat: { open: () => void; close: () => void; version: string } }).PrimewayzChat;

const pendingTimers: unknown[] = [];
const nativeSetTimeout = window.setTimeout.bind(window);

beforeEach(() => {
  calls = [];
  shadowRoots = [];
  document.body.innerHTML = "<main><a href='https://rentreadbuy.com/subscription-plans'>Start Silver Membership</a></main>";
  setViewport(1280, 800);
  window.scrollTo = () => {};
  window.history.replaceState(null, "", `${window.location.origin}/`);
  vi.spyOn(window, "setTimeout").mockImplementation((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
    const id = nativeSetTimeout(handler, timeout, ...args);
    pendingTimers.push(id);
    return id as unknown as ReturnType<typeof setTimeout>;
  });
  localStorage.clear();
  sessionStorage.clear();
  delete (window as { __primewayzChatEmbedInstalled?: boolean }).__primewayzChatEmbedInstalled;
  delete (window as { PrimewayzChat?: unknown }).PrimewayzChat;
  const attachShadow = HTMLElement.prototype.attachShadow;
  vi.spyOn(HTMLElement.prototype, "attachShadow").mockImplementation(function (this: HTMLElement, init) {
    const root = attachShadow.call(this, { ...init, mode: "open" });
    shadowRoots.push(root);
    return root;
  });
});

afterEach(() => {
  cleanup();
  for (const id of pendingTimers) clearTimeout(id as ReturnType<typeof setTimeout>);
  pendingTimers.length = 0;
  vi.restoreAllMocks();
  document.body.innerHTML = "";
  window.history.replaceState(null, "", `${window.location.origin}/`);
});

describe.skipIf(!artifact)("real shared widget artifact", () => {
  it("loads the widget automatically on mount and only writes session storage after open", async () => {
    stubFetch(healthy);
    vi.resetModules();
    const { SharedChat } = await import("./SharedChat");
    const observer = executeWidgetOnInsert();
    render(createElement(SharedChat, { resolution: { status: "ready", settings } }));

    await waitFor(() => Boolean(widgetHost()), "widget host");
    expect(localStorage.getItem("rrb_silver_chat_session_id")).toBeNull();
    expect(sessionStorage.getItem("rrb_silver_chat_panel_open")).toBeNull();
    expect(sessionStorage.getItem("rrb_silver_chat_first_landing")).toBeNull();
    expect(calls.slice(0, 2).map((call) => call.path)).toEqual([
      "/api/platform/capabilities",
      "/api/chat/availability",
    ]);
    expect(document.querySelectorAll("#pw-chat-root")).toHaveLength(1);
    expect(screen.queryByRole("heading", { name: "Chat Support & Privacy" })).toBeNull();

    chatApi().open();
    await waitFor(() => Boolean(localStorage.getItem("rrb_silver_chat_session_id")), "session id");
    observer.disconnect();

    expect(localStorage.getItem("rrb_silver_chat_session_id")).toMatch(/^[0-9a-f-]{36}$/);
    expect(localStorage.getItem("primewayz_chat_session_id")).toBeNull();
    expect(visitorFacingText(shadowRoots[0])).not.toMatch(/primewayz uk/i);
    expect((window as { __PRIMEWAYZ_ANALYTICS_CONSENT__?: boolean }).__PRIMEWAYZ_ANALYTICS_CONSENT__).toBeUndefined();
  });

  it("boots from the campaign config with tenant-specific storage and no server-owned identity", async () => {
    stubFetch(healthy);
    await expect(loadCampaignWidget()).resolves.toBe("loaded");
    await waitFor(() => Boolean(widgetHost()), "widget host");

    expect(calls.slice(0, 2).map((c) => c.path)).toEqual([
      "/api/platform/capabilities",
      "/api/chat/availability",
    ]);
    expect(calls.every((c) => c.credentials === "omit")).toBe(true);

    const shadow = shadowRoots[0];
    const intentLabels = [...shadow.querySelectorAll(".pw-chat-intent")].map((b) => b.textContent);
    expect(intentLabels).toEqual([
      "How does Silver Membership work?",
      "What is included in ₹899?",
      "How many books can I read?",
      "How do returns and my next book work?",
      "Can I gift Silver Membership?",
      "How do I join?",
      "Something else",
    ]);
    expect(shadow.textContent).toContain("Questions about Silver Membership?");
    expect(widgetHost()?.getAttribute("data-pw-chat-version")).toBe("1.3.0");
    expect(chatApi().version).toBe("1.3.0");
    expect(shadow.querySelector(".pw-chat-title")?.textContent).toBe("RentReadBuy Reading Assistant");
    const root = shadow.querySelector(".pw-chat-root") as HTMLElement;
    expect(root.style.getPropertyValue("--pw-chat-launcher-bg")).toBe("#037b80");
    expect(root.style.getPropertyValue("--pw-chat-header-bg")).toBe("#02666a");
    expect(root.style.getPropertyValue("--pw-chat-accent")).toBe("#f08a6c");
    expect(visitorFacingText(shadow)).not.toMatch(/primewayz/i);
    const embed = JSON.parse(document.getElementById("pwi-chat-config")!.textContent!);
    expect(embed.launcher.collisionSelectors).toHaveLength(2);
    expect(embed).not.toHaveProperty("tenantId");

    chatApi().open();
    (shadow.querySelector(".pw-chat-intent") as HTMLButtonElement).click();
    const textarea = shadow.querySelector("textarea") as HTMLTextAreaElement;
    expect(textarea.value).toBe("How does Silver Membership work?");
    textarea.closest("form")!.dispatchEvent(new Event("submit", { cancelable: true }));
    await waitFor(() => calls.some((c) => c.path === "/api/chat/respond"), "respond call");
    expect(calls.find((c) => c.path === "/api/chat/respond")?.body).toMatchObject({
      message: "How does Silver Membership work?",
      intentKey: "silver_how_it_works",
    });

    const posts = calls.filter((c) => c.method === "POST");
    expect(posts.map((c) => c.path)).toEqual(expect.arrayContaining(["/api/chat/heartbeat", "/api/chat/respond"]));
    for (const post of posts) {
      for (const key of SERVER_OWNED_IDENTITY_KEYS) expect(post.body).not.toHaveProperty(key);
    }
    expect(JSON.stringify(calls)).not.toContain("rrb-silver-campaign");

    expect(localStorage.getItem("rrb_silver_chat_session_id")).toMatch(/^[0-9a-f-]{36}$/);
    expect(localStorage.getItem("primewayz_chat_session_id")).toBeNull();
  });

  it("opens the central widget for ?pw_chat=open and keeps the membership link and UTMs", async () => {
    window.history.replaceState(
      {},
      "",
      "/?pw_chat=open&utm_source=qa_f2b&utm_medium=test&utm_campaign=silver_launch_qa",
    );
    stubFetch(healthy);
    vi.resetModules();
    const { SharedChat } = await import("./SharedChat");
    const observer = executeWidgetOnInsert();
    render(createElement(SharedChat, { resolution: { status: "ready", settings } }));

    await waitFor(() => Boolean(widgetHost()), "widget host");
    await waitFor(() => shadowRoots[0]?.querySelector(".pw-chat-panel")?.hasAttribute("hidden") === false, "open panel");
    await waitFor(() => calls.some((call) => call.path === "/api/chat/heartbeat"), "heartbeat");
    observer.disconnect();

    expect(document.querySelectorAll("#pw-chat-root")).toHaveLength(1);
    expect(chatApi().version).toBe("1.3.0");
    expect(localStorage.getItem("rrb_silver_chat_session_id")).toMatch(/^[0-9a-f-]{36}$/);
    expect(window.location.search).toContain("utm_source=qa_f2b");
    expect(window.location.search).toContain("utm_campaign=silver_launch_qa");
    const heartbeat = calls.find((call) => call.path === "/api/chat/heartbeat")?.body;
    expect(heartbeat).toMatchObject({
      utmSource: "qa_f2b",
      utmMedium: "test",
      utmCampaign: "silver_launch_qa",
    });
    expect(document.querySelector("a")?.getAttribute("href")).toBe("https://rentreadbuy.com/subscription-plans");
    expect(visitorFacingText(shadowRoots[0])).not.toMatch(/primewayz uk/i);
  });

  it("does not create a chat session merely because the page loaded", async () => {
    stubFetch(healthy);
    await expect(loadCampaignWidget()).resolves.toBe("loaded");
    await waitFor(() => Boolean(widgetHost()), "widget host");
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(calls.map((call) => `${call.method} ${call.path}`)).toEqual([
      "GET /api/platform/capabilities",
      "GET /api/chat/availability",
    ]);
    expect(localStorage.getItem("rrb_silver_chat_session_id")).toBeNull();
    expect(localStorage.getItem("rrb_silver_chat_visitor_name")).toBeNull();
    expect(localStorage.getItem("rrb_silver_chat_visitor_email")).toBeNull();
    expect(sessionStorage.getItem("rrb_silver_chat_panel_open")).toBeNull();
    expect(sessionStorage.getItem("rrb_silver_chat_open_tracked")).toBeNull();
    expect(sessionStorage.getItem("rrb_silver_chat_first_landing")).toBeNull();
    const embed = JSON.parse(document.getElementById("pwi-chat-config")!.textContent!);
    for (const key of SERVER_OWNED_IDENTITY_KEYS) expect(embed).not.toHaveProperty(key);
    expect(document.querySelector("a")?.getAttribute("href")).toBe("https://rentreadbuy.com/subscription-plans");
  });

  it("installs once even if the script executes twice", async () => {
    stubFetch(healthy);
    await loadCampaignWidget();
    await waitFor(() => Boolean(widgetHost()), "widget host");
    window.eval(artifact!);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(document.querySelectorAll("#pw-chat-root")).toHaveLength(1);
    expect(calls.filter((c) => c.path === "/api/platform/capabilities")).toHaveLength(1);
  });

  it.each([
    ["an unregistered Origin (403)", 403, { error: "forbidden" }],
    ["chat not enabled for the tenant", 200, { capabilities: { chat: false } }],
    ["the API being down (503)", 503, null],
  ])("stays hidden and leaves the page working for %s", async (_label, status, body) => {
    stubFetch((method, path) =>
      path === "/api/platform/capabilities" ? { status, body } : healthy(method, path),
    );
    await loadCampaignWidget();
    await waitFor(() => calls.length > 0, "capabilities call");
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(widgetHost()).toBeNull();
    expect(calls.map((c) => c.path)).toEqual(["/api/platform/capabilities"]);
    expect(document.querySelector("a")?.getAttribute("href")).toBe("https://rentreadbuy.com/subscription-plans");
  });

  it("does not swap in another session when the stored one is refused", async () => {
    localStorage.setItem("rrb_silver_chat_session_id", "11111111-2222-4333-8444-555555555555");
    stubFetch((method, path) =>
      method === "GET" && path.startsWith("/api/chat/1") ? { status: 403, body: { error: "forbidden" } } : healthy(method, path),
    );
    await loadCampaignWidget();
    await waitFor(() => calls.some((c) => c.path.startsWith("/api/chat/1")), "history call");
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(localStorage.getItem("rrb_silver_chat_session_id")).toBe("11111111-2222-4333-8444-555555555555");
    expect(calls.filter((c) => c.method === "POST")).toHaveLength(0);
  });

  it("keeps working when storage is unavailable", async () => {
    stubFetch(healthy);
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    await loadCampaignWidget();
    await waitFor(() => Boolean(widgetHost()), "widget host");
    expect(widgetHost()).not.toBeNull();
  });

  it("restores a stored RentReadBuy session and does not read the default Primewayz key", async () => {
    const stored = "3f2b8c1e-7a4d-4e9b-8c2a-1d5e6f7a8b9c";
    localStorage.setItem("rrb_silver_chat_session_id", stored);
    localStorage.setItem("primewayz_chat_session_id", "11111111-1111-4111-8111-111111111111");
    stubFetch((method, path) => {
      if (method === "GET" && path === `/api/chat/${stored}`) {
        return {
          status: 200,
          body: [{ id: 1, text: "Earlier answer", sender: "bot", timestamp: new Date().toISOString() }],
        };
      }
      return healthy(method, path);
    });
    await loadCampaignWidget();
    await waitFor(() => shadowRoots[0]?.textContent?.includes("Earlier answer") ?? false, "restored history");

    expect(localStorage.getItem("rrb_silver_chat_session_id")).toBe(stored);
    expect(localStorage.getItem("primewayz_chat_session_id")).toBe("11111111-1111-4111-8111-111111111111");
    expect(calls.filter((call) => call.method === "POST")).toHaveLength(0);
    expect(calls.map((call) => call.path)).toContain(`/api/chat/${stored}`);
  });

  it("keeps one widget across a client-side navigation and reports the live URL", async () => {
    stubFetch(healthy);
    await loadCampaignWidget();
    await waitFor(() => Boolean(widgetHost()), "widget host");
    const origin = window.location.origin;
    window.history.pushState({}, "", "/next-book");

    expect(window.location.pathname).toBe("/next-book");
    expect(document.querySelectorAll("#pw-chat-root")).toHaveLength(1);
    chatApi().open();
    await waitFor(() => calls.some((call) => call.path === "/api/chat/heartbeat"), "heartbeat");

    expect(calls.find((call) => call.path === "/api/chat/heartbeat")?.body?.currentPageUrl).toBe(`${origin}/next-book`);
    expect(calls.filter((call) => call.path === "/api/platform/capabilities")).toHaveLength(1);
    expect(window.location.pathname).toBe("/next-book");
    expect(document.querySelector("a")?.getAttribute("href")).toBe("https://rentreadbuy.com/subscription-plans");
  });

  it("stays closed on a phone and opens as a full-screen sheet", async () => {
    setViewport(390, 844);
    sessionStorage.setItem("rrb_silver_chat_panel_open", "true");
    stubFetch(healthy);
    await loadCampaignWidget();
    await waitFor(() => Boolean(widgetHost()), "widget host");
    const shadow = shadowRoots[0];
    const panel = shadow.querySelector(".pw-chat-panel") as HTMLElement;
    const launcher = shadow.querySelector(".pw-chat-launcher") as HTMLElement;

    expect(panel.hidden).toBe(true);
    expect(document.body.style.position).toBe("");
    chatApi().open();
    expect(document.body.style.position).toBe("fixed");
    expect(launcher.hidden).toBe(true);
    expect(shadow.querySelector(".pw-chat-title")?.textContent).toBe("RentReadBuy Reading Assistant");
    chatApi().close();
    expect(document.body.style.position).toBe("");
    expect(launcher.hidden).toBe(false);
  });

  it("restores an open panel on desktop without locking the page", async () => {
    setViewport(1440, 900);
    sessionStorage.setItem("rrb_silver_chat_panel_open", "true");
    stubFetch(healthy);
    await loadCampaignWidget();
    await waitFor(() => Boolean(widgetHost()), "widget host");
    const panel = shadowRoots[0].querySelector(".pw-chat-panel") as HTMLElement;

    expect(panel.hidden).toBe(false);
    expect(document.body.style.position).toBe("");
  });

  it.each(["Pause scenery animation", "Play scenery animation"])(
    "lifts the launcher above the hero %s control and does not modify it",
    async (label) => {
      setViewport(1280, 800);
      const pause = document.createElement("button");
      pause.setAttribute("aria-label", label);
      pause.setAttribute("data-pw-chat-avoid", "");
      placeAt(pause, { top: 740, bottom: 784, left: 1218, right: 1262 });
      document.body.appendChild(pause);
      stubFetch(healthy);
      await loadCampaignWidget();
      await waitFor(() => Boolean(widgetHost()), "widget host");

      const root = shadowRoots[0].querySelector(".pw-chat-root") as HTMLElement;
      expect(root.style.getPropertyValue("--pw-chat-bottom")).toBe("72px");
      expect(pause.getAttribute("style")).toBeNull();
      expect(pause.getAttribute("aria-label")).toBe(label);
    },
  );

  it("stays hidden when server branding names a different site", async () => {
    stubFetch((method, path) =>
      path === "/api/platform/capabilities"
        ? {
            status: 200,
            body: {
              capabilities: { chat: true },
              chatWidget: { ...RENTREADBUY_CHAT_WIDGET, publicSiteKey: "other-site" },
            },
          }
        : healthy(method, path),
    );
    await loadCampaignWidget();
    await waitFor(() => calls.length > 0, "capabilities call");
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(widgetHost()).toBeNull();
    expect(calls.map((call) => call.path)).toEqual(["/api/platform/capabilities"]);
    expect(document.querySelector("a")?.getAttribute("href")).toBe("https://rentreadbuy.com/subscription-plans");
  });

  it("stays hidden when the API cannot be reached", async () => {
    stubFetch(() => {
      throw new TypeError("Failed to fetch");
    });
    await expect(loadCampaignWidget()).resolves.toBe("loaded");
    await waitFor(() => calls.length > 0, "capabilities call");
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(widgetHost()).toBeNull();
    expect(document.querySelector("a")?.getAttribute("href")).toBe("https://rentreadbuy.com/subscription-plans");
    expect(window.location.pathname).toBe("/");
  });
});
