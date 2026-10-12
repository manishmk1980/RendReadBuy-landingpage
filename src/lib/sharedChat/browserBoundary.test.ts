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

/** Credential-shaped strings that must never reach a browser bundle. */
const CREDENTIAL_MARKERS = [
  /Authorization/i,
  /Bearer\s/,
  /\bx-api-key\b/i,
  /WORDPRESS_CHAT/i,
  /ADMIN_(TOKEN|PASSWORD|SECRET|KEY)/i,
  /JWT_SECRET/i,
  /client_secret/i,
];

describe("browser boundary for the shared chat", () => {
  it("reads only public or build-mode environment variables in application code", () => {
    const offenders = sourceFiles.flatMap((file) =>
      [...readFileSync(file, "utf8").matchAll(/process\.env\.([A-Z0-9_]+)/g)]
        .map((match) => match[1])
        .filter((name) => name !== "NODE_ENV" && !name.startsWith("NEXT_PUBLIC_"))
        .map((name) => `${path.relative(root, file)}: ${name}`),
    );
    expect(offenders).toEqual([]);
  });

  it("contains no credential-shaped strings in application code", () => {
    const offenders = sourceFiles.filter((file) =>
      CREDENTIAL_MARKERS.some((marker) => marker.test(readFileSync(file, "utf8"))),
    );
    expect(offenders.map((file) => path.relative(root, file))).toEqual([]);
  });

  it("does not proxy chat traffic through a Next.js route", () => {
    const routes = listFiles(path.join(root, "src", "app"), /^route\.(ts|js)$/);
    const proxies = listFiles(path.join(root, "src"), /^(proxy|middleware)\.(ts|js)$/);
    expect([...routes, ...proxies]).toEqual([]);
  });

  it("does not hard-code tenant identity in chat code", () => {
    const chatCode = sourceFiles.filter((file) => /sharedChat/i.test(file));
    expect(chatCode.length).toBeGreaterThan(0);
    for (const file of chatCode) {
      const code = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
      expect(code, path.relative(root, file)).not.toMatch(/tenantId|sourceSite|sourceOrigin|sourceChannel|\bmarket\b/);
      expect(code, path.relative(root, file)).not.toMatch(/["'](rrb|pw-uk|pw-infotech|rrb-silver-campaign)["']/);
    }
  });

  const staticDir = path.join(root, ".next", "static");
  it.skipIf(!existsSync(staticDir))("ships no credentials in built browser assets", () => {
    const offenders = listFiles(staticDir, /\.js$/).filter((file) => {
      const text = readFileSync(file, "utf8");
      return [/Bearer\s/, /WORDPRESS_CHAT/i, /ADMIN_(TOKEN|PASSWORD|SECRET|KEY)/i, /JWT_SECRET/].some((m) =>
        m.test(text),
      );
    });
    expect(offenders.map((file) => path.relative(root, file))).toEqual([]);
  });
});
