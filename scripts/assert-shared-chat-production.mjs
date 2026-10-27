/**
 * Pre-build guard for the live Silver join host.
 *
 * Next inlines NEXT_PUBLIC_* at compile time. A production artifact built with
 * ENABLED=off ships no Chat Connect launcher. Fail the build when packaging
 * https://join.rentreadbuy.com without Shared Chat enablement.
 *
 * Loads the same env file precedence Next uses for production builds.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PRODUCTION_SITE = "https://join.rentreadbuy.com";
const ENABLED = new Set(["on", "true"]);

function parseEnvFile(filePath, target) {
  if (!existsSync(filePath)) return;
  const text = readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in target)) target[key] = value;
  }
}

/** Match Next production env precedence (later files do not override earlier). */
function loadProductionEnv() {
  const env = { ...process.env };
  // Highest precedence first so lower files cannot clobber.
  const files = [
    ".env.production.local",
    ".env.local",
    ".env.production",
    ".env",
  ];
  const layered = {};
  for (const name of files) {
    parseEnvFile(path.join(root, name), layered);
  }
  return { ...layered, ...env };
}

const env = loadProductionEnv();
const site = (env.NEXT_PUBLIC_SITE_URL ?? "").trim().replace(/\/+$/, "");
if (site !== PRODUCTION_SITE) {
  process.exit(0);
}

const enabled = (env.NEXT_PUBLIC_SHARED_CHAT_ENABLED ?? "").trim().toLowerCase();
if (!ENABLED.has(enabled)) {
  console.error(
    `[assert-shared-chat-production] Refusing to build ${site} with Shared Chat disabled.`,
  );
  console.error(
    `Set NEXT_PUBLIC_SHARED_CHAT_ENABLED=on (got ${JSON.stringify(env.NEXT_PUBLIC_SHARED_CHAT_ENABLED ?? "")}).`,
  );
  process.exit(1);
}

console.log(
  `[assert-shared-chat-production] Shared Chat enabled for ${site}; continuing build.`,
);
