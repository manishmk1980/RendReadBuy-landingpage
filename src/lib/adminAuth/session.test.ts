// @vitest-environment node
import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { CAMPAIGN_OPERATOR_ROLE } from "./constants";
import {
  clearRevokedSessionsForTests,
  createSessionToken,
  revokeSession,
  verifySessionToken,
} from "./session";

const SECRET = "test-session-secret-with-enough-bytes-0123456789";

afterEach(() => {
  clearRevokedSessionsForTests();
});

describe("admin session tokens", () => {
  it("creates and verifies a signed session", () => {
    const now = 1_700_000_000;
    const { token, payload } = createSessionToken("silver-ops", SECRET, now, 3600);
    expect(payload.role).toBe(CAMPAIGN_OPERATOR_ROLE);
    const verified = verifySessionToken(token, SECRET, now + 10);
    expect(verified?.sub).toBe("silver-ops");
    expect(verified?.sid).toBe(payload.sid);
  });

  it("rejects a forged cookie MAC", () => {
    const { token } = createSessionToken("silver-ops", SECRET, 1_700_000_000);
    const [body] = token.split(".");
    const forged = `${body}.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`;
    expect(verifySessionToken(forged, SECRET)).toBeNull();
  });

  it("rejects tokens signed with a different secret", () => {
    const { token } = createSessionToken("silver-ops", SECRET, 1_700_000_000);
    expect(verifySessionToken(token, `${SECRET}-other`)).toBeNull();
  });

  it("rejects expired sessions", () => {
    const now = 1_700_000_000;
    const { token } = createSessionToken("silver-ops", SECRET, now, 60);
    expect(verifySessionToken(token, SECRET, now + 61)).toBeNull();
  });

  it("rejects revoked sessions before expiry", () => {
    const now = 1_700_000_000;
    const { token, payload } = createSessionToken("silver-ops", SECRET, now, 3600);
    revokeSession(payload.sid, payload.exp);
    expect(verifySessionToken(token, SECRET, now + 10)).toBeNull();
  });

  it("rejects payloads that claim a non-campaign role", () => {
    const now = 1_700_000_000;
    const body = Buffer.from(
      JSON.stringify({
        v: 1,
        sid: "abc",
        sub: "silver-ops",
        iat: now,
        exp: now + 3600,
        role: "host_owner",
      }),
      "utf8",
    ).toString("base64url");
    const mac = createHmac("sha256", SECRET).update(body).digest("base64url");
    expect(verifySessionToken(`${body}.${mac}`, SECRET, now)).toBeNull();
  });
});
