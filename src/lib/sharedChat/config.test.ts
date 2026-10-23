import { describe, expect, it } from "vitest";
import { sharedChatIntents, sharedChatLauncher, sharedChatStorageKeys } from "@/config/sharedChat";
import {
  buildSharedChatEmbedConfig,
  resolveSharedChatSettings,
  sharedChatOpenRequested,
  type SharedChatEnv,
  type SharedChatSettings,
} from "./config";

const valid: SharedChatEnv = {
  enabled: "on",
  apiBaseUrl: "https://chat.example.test",
  widgetUrl: "https://chat.example.test/embed/pw-chat.js",
};

/** Public values for the Silver tenant after Origin activation. */
const publishedSilver: SharedChatEnv = {
  enabled: "on",
  apiBaseUrl: "https://uk.primewayz.com",
  widgetUrl: "https://uk.primewayz.com/embed/chat/1.3.3/pw-chat.js",
  widgetIntegrity: "sha384-jaRJqzda7FgtN2U/hubbo/jUzx9+qp+bhtrN+K1QGZYc4FgebxlyCukI/BxkpAGJ",
};

const settings: SharedChatSettings = {
  apiBaseUrl: "https://chat.example.test",
  widgetUrl: "https://chat.example.test/embed/pw-chat.js",
  widgetIntegrity: null,
};

/** Constraints the shared widget (1.3.3) applies before accepting a field. */
const WIDGET_KEY_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/i;
const WIDGET_STORAGE_KEY_PATTERN = /^[A-Za-z0-9_.:-]{1,100}$/;
const WIDGET_DEFAULT_STORAGE_PREFIX = "primewayz_chat_";
const SERVER_OWNED_IDENTITY_KEYS = ["tenantId", "market", "sourceSite", "sourceOrigin", "sourceChannel"];

describe("resolveSharedChatSettings", () => {
  it("is disabled when nothing is configured", () => {
    expect(resolveSharedChatSettings({}, true)).toEqual({ status: "disabled" });
  });

  it.each([undefined, "", "off", "false", "0", "yes", "enabled"])(
    "stays disabled for enabled=%j even with valid URLs",
    (enabled) => {
      expect(resolveSharedChatSettings({ ...valid, enabled }, true).status).toBe("disabled");
    },
  );

  it.each(["on", "ON", " true "])("enables for %j with valid https URLs", (enabled) => {
    expect(resolveSharedChatSettings({ ...valid, enabled }, true)).toEqual({
      status: "ready",
      settings,
    });
  });

  it("normalises a trailing slash on the API base URL", () => {
    const result = resolveSharedChatSettings({ ...valid, apiBaseUrl: "https://chat.example.test/" }, true);
    expect(result.status === "ready" && result.settings.apiBaseUrl).toBe("https://chat.example.test");
  });

  it.each([
    "http://chat.example.test",
    "http://localhost:3000",
    "https://user:pass@chat.example.test",
    "https://chat.example.test?tenantId=rrb",
    "https://chat.example.test#x",
    "javascript:alert(1)",
    "chat.example.test",
    "",
  ])("rejects API base URL %j in production", (apiBaseUrl) => {
    expect(resolveSharedChatSettings({ ...valid, apiBaseUrl }, true).status).toBe("invalid");
  });

  it.each([
    "http://chat.example.test/pw-chat.js",
    "//chat.example.test/pw-chat.js",
    "/\\chat.example.test/pw-chat.js",
    "https://user@chat.example.test/pw-chat.js",
    "data:text/javascript,alert(1)",
    "pw-chat.js",
  ])("rejects widget URL %j in production", (widgetUrl) => {
    expect(resolveSharedChatSettings({ ...valid, widgetUrl }, true).status).toBe("invalid");
  });

  it("accepts a same-origin path for a self-hosted widget copy", () => {
    const result = resolveSharedChatSettings({ ...valid, widgetUrl: "/vendor/pw-chat.js?v=1.3.3" }, true);
    expect(result.status === "ready" && result.settings.widgetUrl).toBe("/vendor/pw-chat.js?v=1.3.3");
  });

  it("allows plain http on localhost only outside production", () => {
    const local = { ...valid, apiBaseUrl: "http://localhost:3000", widgetUrl: "http://127.0.0.1:3000/pw-chat.js" };
    expect(resolveSharedChatSettings(local, false).status).toBe("ready");
    expect(resolveSharedChatSettings(local, true).status).toBe("invalid");
  });

  it("validates the optional SRI hash", () => {
    const good = resolveSharedChatSettings({ ...valid, widgetIntegrity: "sha384-abc+/def=" }, true);
    expect(good.status === "ready" && good.settings.widgetIntegrity).toBe("sha384-abc+/def=");
    expect(resolveSharedChatSettings({ ...valid, widgetIntegrity: "md5-abc" }, true).status).toBe("invalid");
  });

  it("accepts the published Silver URLs, integrity and enablement", () => {
    expect(resolveSharedChatSettings(publishedSilver, true)).toEqual({
      status: "ready",
      settings: {
        apiBaseUrl: "https://uk.primewayz.com",
        widgetUrl: "https://uk.primewayz.com/embed/chat/1.3.3/pw-chat.js",
        widgetIntegrity: "sha384-jaRJqzda7FgtN2U/hubbo/jUzx9+qp+bhtrN+K1QGZYc4FgebxlyCukI/BxkpAGJ",
      },
    });
  });

  it("can still disable the published Silver URLs without removing them", () => {
    expect(resolveSharedChatSettings({ ...publishedSilver, enabled: "off" }, true)).toEqual({
      status: "disabled",
    });
  });
});

describe("sharedChatOpenRequested", () => {
  it("accepts only the exact pw_chat=open query used by widget 1.3.3", () => {
    expect(sharedChatOpenRequested("?pw_chat=open")).toBe(true);
    expect(sharedChatOpenRequested("pw_chat=open")).toBe(true);
    expect(sharedChatOpenRequested("?utm_source=qa_f2b&utm_medium=test&pw_chat=open")).toBe(true);
    expect(sharedChatOpenRequested("?pw_chat=open&utm_campaign=silver_launch_qa")).toBe(true);
    for (const search of ["", "?", "?pw_chat=closed", "?pw_chat=OPEN", "?pw_chat=openextra", "?chat=open"]) {
      expect(sharedChatOpenRequested(search)).toBe(false);
    }
  });
});

describe("buildSharedChatEmbedConfig", () => {
  const config = buildSharedChatEmbedConfig(settings, {
    origin: "https://silver.example.test",
    pathname: "/",
  });

  it("identifies the campaign by its public site key and name", () => {
    expect(config.siteKey).toBe("rentreadbuy-silver");
    expect(config.siteName).toBe("RentReadBuy Silver Membership");
    expect(config.apiBaseUrl).toBe(settings.apiBaseUrl);
  });

  it("never carries server-owned tenant identity", () => {
    const json = JSON.stringify(config);
    for (const key of SERVER_OWNED_IDENTITY_KEYS) expect(json).not.toContain(`"${key}"`);
    expect(json).not.toContain("rrb-silver-campaign");
  });

  it("offers exactly the six approved intents, in order", () => {
    expect(config.intents).toEqual([
      { key: "silver_how_it_works", label: "How does Silver Membership work?" },
      { key: "silver_price_inclusions", label: "What is included in ₹899?" },
      { key: "silver_book_limits", label: "How many books can I read?" },
      { key: "silver_returns", label: "How do returns and my next book work?" },
      { key: "silver_gifting", label: "Can I gift Silver Membership?" },
      { key: "silver_joining", label: "How do I join?" },
    ]);
    expect(sharedChatIntents).toHaveLength(6);
  });

  it("uses tenant-specific storage keys, distinct from the widget defaults", () => {
    const keys = Object.values(config.storageKeys);
    expect(Object.keys(config.storageKeys).sort()).toEqual(
      ["firstLanding", "openTracked", "panelOpen", "sessionId", "visitorEmail", "visitorName"],
    );
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of keys) {
      expect(key).toMatch(WIDGET_STORAGE_KEY_PATTERN);
      expect(key.startsWith("rrb_silver_chat_")).toBe(true);
      expect(key.startsWith(WIDGET_DEFAULT_STORAGE_PREFIX)).toBe(false);
    }
    expect(config.storageKeys).toEqual(sharedChatStorageKeys);
  });

  it("asks the widget to keep its launcher clear of the hero pause and play control", () => {
    expect(config.launcher).toEqual({
      collisionSelectors: [
        'button[aria-label="Pause scenery animation"]',
        'button[aria-label="Play scenery animation"]',
      ],
    });
    expect(config.launcher.collisionSelectors).toEqual([...sharedChatLauncher.collisionSelectors]);
    expect(config.launcher).not.toHaveProperty("bottomOffsetPx");
    for (const selector of config.launcher.collisionSelectors) {
      expect(selector.length).toBeLessThanOrEqual(200);
    }
  });

  it("passes the widget's own field constraints, so nothing is silently dropped", () => {
    expect(config.siteKey).toMatch(WIDGET_KEY_PATTERN);
    expect(config.pageType).toMatch(WIDGET_KEY_PATTERN);
    expect(config.siteName.length).toBeLessThanOrEqual(80);
    expect(config.pageContext.greeting.length).toBeLessThanOrEqual(200);
    expect(config.pageContext.supportingText.length).toBeLessThanOrEqual(400);
    for (const intent of config.intents) {
      expect(intent.key).toMatch(WIDGET_KEY_PATTERN);
      expect(intent.label.length).toBeLessThanOrEqual(80);
    }
  });

  it("passes the real page URL without query or fragment", () => {
    const withQuery = buildSharedChatEmbedConfig(settings, {
      origin: "https://silver.example.test",
      pathname: "/offer",
    });
    expect(withQuery.pageUrl).toBe("https://silver.example.test/offer");
    expect(withQuery.isFrontPage).toBe(false);
    expect(config.pageUrl).toBe("https://silver.example.test/");
    expect(config.isFrontPage).toBe(true);
  });

  it("states only approved Silver facts in the chat introduction", () => {
    expect(config.pageContext.supportingText).toContain("₹899 for 3 months");
    expect(config.pageContext.supportingText).toContain("up to 2 physical books at a time");
    expect(JSON.stringify(config).toLowerCase()).not.toContain("unlimited");
  });
});
