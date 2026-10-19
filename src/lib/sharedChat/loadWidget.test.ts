import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SharedChatSettings } from "./config";

const settings: SharedChatSettings = {
  apiBaseUrl: "https://chat.example.test",
  widgetUrl: "https://chat.example.test/embed/pw-chat.js",
  widgetIntegrity: null,
};

type Loader = typeof import("./loadWidget");

async function freshLoader(): Promise<Loader> {
  vi.resetModules();
  return import("./loadWidget");
}

const widgetScripts = () => document.querySelectorAll('script[data-rrb-shared-chat="widget"]');
const configScripts = () => document.querySelectorAll("#pwi-chat-config");

function settle(script: Element, type: "load" | "error") {
  script.dispatchEvent(new Event(type));
}

beforeEach(() => {
  document.body.innerHTML = "";
  delete (window as { __primewayzChatEmbedInstalled?: boolean }).__primewayzChatEmbedInstalled;
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("loadSharedChatWidget", () => {
  it("writes the config element before the widget script is inserted", async () => {
    const { loadSharedChatWidget } = await freshLoader();
    let configAtInsertion: string | null = null;
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node instanceof HTMLScriptElement && node.dataset.rrbSharedChat === "widget") {
            configAtInsertion = document.getElementById("pwi-chat-config")?.textContent ?? null;
          }
        }
      }
    });
    observer.observe(document.body, { childList: true });

    const result = loadSharedChatWidget(window, settings);
    await Promise.resolve();
    observer.disconnect();
    settle(widgetScripts()[0], "load");

    await expect(result).resolves.toBe("loaded");
    expect(configAtInsertion).not.toBeNull();
    const parsed = JSON.parse(configAtInsertion!);
    expect(parsed).toMatchObject({ apiBaseUrl: settings.apiBaseUrl, siteKey: "rentreadbuy-silver" });

    const config = document.getElementById("pwi-chat-config") as HTMLScriptElement;
    expect(config.type).toBe("application/json");
    expect(config.compareDocumentPosition(widgetScripts()[0]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("loads the widget script asynchronously from the configured URL", async () => {
    const { loadSharedChatWidget } = await freshLoader();
    void loadSharedChatWidget(window, settings);
    const script = widgetScripts()[0] as HTMLScriptElement;
    expect(script.src).toBe(settings.widgetUrl);
    expect(script.async).toBe(true);
    expect(script.hasAttribute("integrity")).toBe(false);
  });

  it("requests CORS mode when an SRI hash is configured", async () => {
    const { loadSharedChatWidget } = await freshLoader();
    void loadSharedChatWidget(window, { ...settings, widgetIntegrity: "sha384-abc" });
    const script = widgetScripts()[0] as HTMLScriptElement;
    expect(script.integrity).toBe("sha384-abc");
    expect(script.crossOrigin).toBe("anonymous");
  });

  it("loads the published widget with its integrity hash and anonymous CORS", async () => {
    const { loadSharedChatWidget } = await freshLoader();
    const published = {
      apiBaseUrl: "https://uk.primewayz.com",
      widgetUrl: "https://uk.primewayz.com/embed/chat/1.1.0/pw-chat.js",
      widgetIntegrity: "sha384-NoTM6nKvWU6U4TPvQ2rbNTuxv6aP4fj8BWZBSG5XIDPPuz9IhKp1EjwJ3BNOo4XO",
    };
    void loadSharedChatWidget(window, published);
    const script = widgetScripts()[0] as HTMLScriptElement;
    expect(script.src).toBe(published.widgetUrl);
    expect(script.async).toBe(true);
    expect(script.integrity).toBe(published.widgetIntegrity);
    expect(script.crossOrigin).toBe("anonymous");
    const embed = JSON.parse(document.getElementById("pwi-chat-config")!.textContent!);
    expect(embed).toMatchObject({ apiBaseUrl: published.apiBaseUrl, siteKey: "rentreadbuy-silver" });
    expect(embed).not.toHaveProperty("tenantId");
    expect(embed).not.toHaveProperty("market");
    expect(embed).not.toHaveProperty("sourceSite");
    expect(embed).not.toHaveProperty("sourceOrigin");
    expect(embed).not.toHaveProperty("sourceChannel");
  });

  it("initialises once however often it is called", async () => {
    const { loadSharedChatWidget } = await freshLoader();
    const first = loadSharedChatWidget(window, settings);
    const second = loadSharedChatWidget(window, settings);
    expect(second).toBe(first);
    expect(widgetScripts()).toHaveLength(1);
    expect(configScripts()).toHaveLength(1);
  });

  it("does not inject again after a module reload when its own elements exist", async () => {
    void (await freshLoader()).loadSharedChatWidget(window, settings);
    const result = await (await freshLoader()).loadSharedChatWidget(window, settings);
    expect(result).toBe("already_installed");
    expect(widgetScripts()).toHaveLength(1);
    expect(configScripts()).toHaveLength(1);
  });

  it("leaves an already installed widget alone", async () => {
    (window as { __primewayzChatEmbedInstalled?: boolean }).__primewayzChatEmbedInstalled = true;
    const { loadSharedChatWidget } = await freshLoader();
    await expect(loadSharedChatWidget(window, settings)).resolves.toBe("already_installed");
    expect(widgetScripts()).toHaveLength(0);
    expect(configScripts()).toHaveLength(0);
  });

  it("never overwrites a config element it does not own", async () => {
    const foreign = document.createElement("script");
    foreign.type = "application/json";
    foreign.id = "pwi-chat-config";
    foreign.textContent = '{"siteKey":"other"}';
    document.body.appendChild(foreign);

    const { loadSharedChatWidget } = await freshLoader();
    await expect(loadSharedChatWidget(window, settings)).resolves.toBe("config_conflict");
    expect(foreign.textContent).toBe('{"siteKey":"other"}');
    expect(widgetScripts()).toHaveLength(0);
  });

  it("cleans up and does not retry when the script fails to load", async () => {
    const { loadSharedChatWidget } = await freshLoader();
    const result = loadSharedChatWidget(window, settings);
    settle(widgetScripts()[0], "error");

    await expect(result).resolves.toBe("script_failed");
    expect(widgetScripts()).toHaveLength(0);
    expect(configScripts()).toHaveLength(0);

    await expect(loadSharedChatWidget(window, settings)).resolves.toBe("script_failed");
    expect(widgetScripts()).toHaveLength(0);
  });
});
