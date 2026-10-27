// @vitest-environment node
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const script = path.join("scripts", "assert-shared-chat-production.mjs");

describe("assert-shared-chat-production", () => {
  it("fails closed when packaging join.rentreadbuy.com with chat disabled", async () => {
    await expect(
      execFileAsync(process.execPath, [script], {
        env: {
          ...process.env,
          NEXT_PUBLIC_SITE_URL: "https://join.rentreadbuy.com",
          NEXT_PUBLIC_SHARED_CHAT_ENABLED: "off",
        },
      }),
    ).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringMatching(/Shared Chat disabled/i),
    });
  });

  it("allows the live join host when Shared Chat is enabled", async () => {
    const { stdout } = await execFileAsync(process.execPath, [script], {
      env: {
        ...process.env,
        NEXT_PUBLIC_SITE_URL: "https://join.rentreadbuy.com",
        NEXT_PUBLIC_SHARED_CHAT_ENABLED: "on",
      },
    });
    expect(stdout).toMatch(/Shared Chat enabled/i);
  });

  it("skips the guard for non-production site URLs", async () => {
    const { stdout } = await execFileAsync(process.execPath, [script], {
      env: {
        ...process.env,
        NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3010",
        NEXT_PUBLIC_SHARED_CHAT_ENABLED: "off",
      },
    });
    expect(stdout).toBe("");
  });
});
