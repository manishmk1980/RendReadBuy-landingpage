// @vitest-environment node
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function listFiles(dir: string, pattern: RegExp): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return listFiles(full, pattern);
    return pattern.test(name) ? [full] : [];
  });
}

const sourceFiles = listFiles(path.join(root, "src"), /\.(ts|tsx)$/).filter(
  (file) => !/\.test\.tsx?$/.test(file),
);

function rel(file: string): string {
  return path.relative(root, file).replace(/\\/g, "/");
}

function isAdminServerModule(file: string): boolean {
  const r = rel(file);
  return (
    r.startsWith("src/lib/adminAuth/") ||
    r.startsWith("src/lib/chatOps/") ||
    r.startsWith("src/app/api/admin/") ||
    r.startsWith("src/app/admin/") ||
    r === "src/proxy.ts"
  );
}

function isClientModule(file: string): boolean {
  const text = readFileSync(file, "utf8");
  return /^\s*["']use client["']/m.test(text);
}

/** Credential-shaped strings that must never reach a browser bundle. */
const CREDENTIAL_MARKERS = [
  /Authorization/i,
  /Bearer\s/,
  /\bx-api-key\b/i,
  /WORDPRESS_CHAT/i,
  /RRB_SILVER_CHAT_INTEGRATION_TOKEN/,
  /RRB_SILVER_CHAT_CONNECT_CREDENTIAL/,
  /CHAT_INTEGRATION_API_BASE_URL/,
  /\bcck_[a-f0-9]{8,}/,
  /\bccs_[A-Za-z0-9_-]{8,}/,
  /ADMIN_(TOKEN|PASSWORD|SECRET|KEY)/i,
  /CHAT_ADMIN_(PASSWORD_HASH|SESSION_SECRET)/,
  /JWT_SECRET/i,
  /client_secret/i,
];

const ALLOWED_SERVER_ENV = new Set([
  "NODE_ENV",
  "CHAT_ADMIN_USERNAME",
  "CHAT_ADMIN_PASSWORD_HASH",
  "CHAT_ADMIN_SESSION_SECRET",
  "CHAT_INTEGRATION_API_BASE_URL",
  "RRB_SILVER_CHAT_INTEGRATION_TOKEN",
  "RRB_SILVER_CHAT_CONNECT_CREDENTIAL",
]);

const ALLOWED_ADMIN_API_PREFIXES = [
  "src/app/api/admin/auth/",
  "src/app/api/admin/chat/",
];

/** Lifecycle activate/heartbeat must not be ordinary operator routes. */
const FORBIDDEN_ADMIN_API_SEGMENTS = [
  "/connect/activate/",
  "/connect/heartbeat/",
  "/chat-connect/",
];

describe("browser boundary for the shared chat", () => {
  it("reads only public env in non-admin application code", () => {
    const offenders = sourceFiles.flatMap((file) => {
      if (isAdminServerModule(file)) {
        // Admin server modules may read CHAT_ADMIN_* and NODE_ENV only.
        return [...readFileSync(file, "utf8").matchAll(/process\.env\.([A-Z0-9_]+)/g)]
          .map((match) => match[1])
          .filter((name) => !ALLOWED_SERVER_ENV.has(name) && !name.startsWith("NEXT_PUBLIC_"))
          .map((name) => `${rel(file)}: ${name}`);
      }
      return [...readFileSync(file, "utf8").matchAll(/process\.env\.([A-Z0-9_]+)/g)]
        .map((match) => match[1])
        .filter((name) => name !== "NODE_ENV" && !name.startsWith("NEXT_PUBLIC_"))
        .map((name) => `${rel(file)}: ${name}`);
    });
    expect(offenders).toEqual([]);
  });

  it("keeps credential markers out of client and public chat code", () => {
    const offenders = sourceFiles.filter((file) => {
      if (isAdminServerModule(file) && !isClientModule(file)) return false;
      return CREDENTIAL_MARKERS.some((marker) => marker.test(readFileSync(file, "utf8")));
    });
    expect(offenders.map(rel)).toEqual([]);
  });

  it("allows only admin auth and chat-ops API routes — no public chat proxy", () => {
    const routes = listFiles(path.join(root, "src", "app"), /^route\.(ts|js)$/).map(rel);
    expect(routes.length).toBeGreaterThan(0);
    for (const file of routes) {
      expect(
        ALLOWED_ADMIN_API_PREFIXES.some((prefix) => file.startsWith(prefix)),
        file,
      ).toBe(true);
      expect(
        FORBIDDEN_ADMIN_API_SEGMENTS.some((segment) => file.includes(segment)),
        file,
      ).toBe(false);
    }

    const proxies = listFiles(path.join(root, "src"), /^(proxy|middleware)\.(ts|js)$/).map(rel);
    expect(proxies).toEqual(["src/proxy.ts"]);
    const proxySource = readFileSync(path.join(root, "src", "proxy.ts"), "utf8");
    expect(proxySource).toMatch(/\/admin/);
    expect(proxySource).not.toMatch(/sharedChat|pw-chat|primewayz|uk\.primewayz/i);
  });

  it("does not hard-code tenant identity in chat code", () => {
    const chatCode = sourceFiles.filter((file) => /sharedChat/i.test(file));
    expect(chatCode.length).toBeGreaterThan(0);
    for (const file of chatCode) {
      const code = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
      expect(code, rel(file)).not.toMatch(/tenantId|sourceSite|sourceOrigin|sourceChannel|\bmarket\b/);
      expect(code, rel(file)).not.toMatch(/["'](rrb|pw-uk|pw-infotech|rrb-silver-campaign)["']/);
    }
  });

  it("does not expose CHAT_ADMIN or integration secrets in client components", () => {
    const clients = sourceFiles.filter(isClientModule);
    const offenders = clients.filter((file) => {
      const text = readFileSync(file, "utf8");
      return /CHAT_ADMIN_|RRB_SILVER_CHAT_INTEGRATION_TOKEN|RRB_SILVER_CHAT_CONNECT_CREDENTIAL|CHAT_INTEGRATION_API_BASE_URL|passwordHash|sessionSecret|scrypt|cck_[a-f0-9]{8,}|ccs_[A-Za-z0-9_-]{8,}/i.test(
        text,
      );
    });
    expect(offenders.map(rel)).toEqual([]);
  });

  const staticDir = path.join(root, ".next", "static");
  it.skipIf(!existsSync(staticDir))("ships no credentials in built browser assets", () => {
    const offenders = listFiles(staticDir, /\.js$/).filter((file) => {
      const text = readFileSync(file, "utf8");
      return [
        /Bearer\s/,
        /WORDPRESS_CHAT/i,
        /RRB_SILVER_CHAT_INTEGRATION_TOKEN/,
        /RRB_SILVER_CHAT_CONNECT_CREDENTIAL/,
        /CHAT_INTEGRATION_API_BASE_URL/,
        /\bcck_[a-f0-9]{8,}/,
        /ADMIN_(TOKEN|PASSWORD|SECRET|KEY)/i,
        /CHAT_ADMIN_(PASSWORD_HASH|SESSION_SECRET)/,
        /JWT_SECRET/,
      ].some((m) => m.test(text));
    });
    expect(offenders.map(rel)).toEqual([]);
  });
});
