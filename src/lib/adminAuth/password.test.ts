// @vitest-environment node
import { describe, expect, it } from "vitest";
import { hashPassword, timingSafeEqualString, verifyPassword } from "./password";

describe("admin password hashing", () => {
  it("hashes with scrypt and verifies the same password", () => {
    const encoded = hashPassword("correct horse battery");
    expect(encoded.startsWith("$scrypt$")).toBe(true);
    expect(verifyPassword("correct horse battery", encoded)).toBe(true);
  });

  it("rejects the wrong password", () => {
    const encoded = hashPassword("correct horse battery");
    expect(verifyPassword("wrong password", encoded)).toBe(false);
  });

  it("rejects malformed hashes", () => {
    expect(verifyPassword("x", "plaintext")).toBe(false);
    expect(verifyPassword("x", "$scrypt$n=1,r=1,p=1$abc$def")).toBe(false);
  });

  it("compares usernames in a length-safe way", () => {
    expect(timingSafeEqualString("ops", "ops")).toBe(true);
    expect(timingSafeEqualString("ops", "op")).toBe(false);
    expect(timingSafeEqualString("ops", "opsx")).toBe(false);
  });
});
