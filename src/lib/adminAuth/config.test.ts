// @vitest-environment node
import { describe, expect, it } from "vitest";
import { hashPassword } from "./password";
import { readAdminAuthConfig } from "./config";

describe("readAdminAuthConfig", () => {
  it("fails closed when any value is missing", () => {
    expect(readAdminAuthConfig({}).configured).toBe(false);
    expect(
      readAdminAuthConfig({
        CHAT_ADMIN_USERNAME: "ops",
        CHAT_ADMIN_PASSWORD_HASH: hashPassword("x"),
      }).configured,
    ).toBe(false);
  });

  it("rejects a short session secret", () => {
    const result = readAdminAuthConfig({
      CHAT_ADMIN_USERNAME: "ops",
      CHAT_ADMIN_PASSWORD_HASH: hashPassword("x"),
      CHAT_ADMIN_SESSION_SECRET: "too-short",
    });
    expect(result.configured).toBe(false);
  });

  it("rejects plaintext password hashes", () => {
    const result = readAdminAuthConfig({
      CHAT_ADMIN_USERNAME: "ops",
      CHAT_ADMIN_PASSWORD_HASH: "not-a-scrypt-hash",
      CHAT_ADMIN_SESSION_SECRET: "a".repeat(32),
    });
    expect(result.configured).toBe(false);
  });

  it("accepts a complete configuration", () => {
    const result = readAdminAuthConfig({
      CHAT_ADMIN_USERNAME: "ops",
      CHAT_ADMIN_PASSWORD_HASH: hashPassword("x"),
      CHAT_ADMIN_SESSION_SECRET: "a".repeat(32),
    });
    expect(result).toMatchObject({ configured: true, username: "ops" });
  });
});
