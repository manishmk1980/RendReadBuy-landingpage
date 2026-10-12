import {
  buildSharedChatEmbedConfig,
  SHARED_CHAT_CONFIG_ELEMENT_ID,
  type SharedChatSettings,
} from "./config";

/** Set by the shared widget's installer the first time its script executes. */
const WIDGET_INSTALL_FLAG = "__primewayzChatEmbedInstalled";
const OWNER_ATTRIBUTE = "data-rrb-shared-chat";

export type SharedChatLoadResult =
  | "loaded"
  | "already_installed"
  | "config_conflict"
  | "script_failed";

type WidgetWindow = Window & { [WIDGET_INSTALL_FLAG]?: boolean };

let pending: Promise<SharedChatLoadResult> | null = null;

/**
 * Adds the shared widget to the page once. The config element is written
 * before the widget script so it is present when the widget boots. A failed
 * script is not retried for the rest of the page's life; the page itself
 * never depends on the outcome.
 *
 * The widget publishes no unmount API, so nothing here tears it down.
 */
export function loadSharedChatWidget(
  win: Window,
  settings: SharedChatSettings,
): Promise<SharedChatLoadResult> {
  if (pending) return pending;
  pending = inject(win, settings);
  return pending;
}

function inject(win: Window, settings: SharedChatSettings): Promise<SharedChatLoadResult> {
  const doc = win.document;
  if ((win as WidgetWindow)[WIDGET_INSTALL_FLAG]) return Promise.resolve("already_installed");

  const existing = doc.getElementById(SHARED_CHAT_CONFIG_ELEMENT_ID);
  if (existing) {
    return Promise.resolve(existing.hasAttribute(OWNER_ATTRIBUTE) ? "already_installed" : "config_conflict");
  }

  const config = doc.createElement("script");
  config.type = "application/json";
  config.id = SHARED_CHAT_CONFIG_ELEMENT_ID;
  config.setAttribute(OWNER_ATTRIBUTE, "config");
  config.textContent = JSON.stringify(buildSharedChatEmbedConfig(settings, win.location));
  doc.body.appendChild(config);

  const script = doc.createElement("script");
  script.src = settings.widgetUrl;
  script.async = true;
  script.setAttribute(OWNER_ATTRIBUTE, "widget");
  if (settings.widgetIntegrity) {
    script.integrity = settings.widgetIntegrity;
    script.crossOrigin = "anonymous";
  }

  return new Promise((resolve) => {
    script.addEventListener("load", () => resolve("loaded"), { once: true });
    script.addEventListener(
      "error",
      () => {
        script.remove();
        config.remove();
        resolve("script_failed");
      },
      { once: true },
    );
    doc.body.appendChild(script);
  });
}
