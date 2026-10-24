// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  isTrustedMutationOrigin,
  parseConfiguredPublicOrigin,
  resolveTrustedMutationOrigin,
} from "./origin";
import { guardAdminMutation, guardAdminMutationWithToken } from "./http";

const PUBLIC = "https://join.rentreadbuy.com";
const INTERNAL = "http://127.0.0.1:3100/api/admin/auth/login";

function mutationRequest(
  url: string,
  headers: Record<string, string>,
): Request {
  return new Request(url, { method: "POST", headers });
}

describe("parseConfiguredPublicOrigin", () => {
  it("accepts a bare https origin", () => {
    expect(parseConfiguredPublicOrigin(PUBLIC)?.origin).toBe(PUBLIC);
  });

  it("rejects credentials, query, hash, and non-root paths", () => {
    expect(parseConfiguredPublicOrigin("https://user:pass@join.rentreadbuy.com")).toBeNull();
    expect(parseConfiguredPublicOrigin(`${PUBLIC}?x=1`)).toBeNull();
    expect(parseConfiguredPublicOrigin(`${PUBLIC}#frag`)).toBeNull();
    expect(parseConfiguredPublicOrigin(`${PUBLIC}/admin`)).toBeNull();
  });

  it("rejects non-http(s) schemes and malformed values", () => {
    expect(parseConfiguredPublicOrigin("ftp://join.rentreadbuy.com")).toBeNull();
    expect(parseConfiguredPublicOrigin("not-a-url")).toBeNull();
    expect(parseConfiguredPublicOrigin("")).toBeNull();
  });
});

describe("resolveTrustedMutationOrigin", () => {
  it("uses CHAT_ADMIN_PUBLIC_ORIGIN when valid", () => {
    const requestUrl = new URL(INTERNAL);
    const trusted = resolveTrustedMutationOrigin(requestUrl, {
      CHAT_ADMIN_PUBLIC_ORIGIN: PUBLIC,
      NODE_ENV: "production",
    });
    expect(trusted?.origin).toBe(PUBLIC);
  });

  it("fails closed in production when the public origin is missing", () => {
    const requestUrl = new URL(INTERNAL);
    expect(
      resolveTrustedMutationOrigin(requestUrl, { NODE_ENV: "production" }),
    ).toBeNull();
  });

  it("fails closed when the configured public origin is invalid", () => {
    const requestUrl = new URL(INTERNAL);
    expect(
      resolveTrustedMutationOrigin(requestUrl, {
        CHAT_ADMIN_PUBLIC_ORIGIN: "https://join.rentreadbuy.com/admin",
        NODE_ENV: "development",
      }),
    ).toBeNull();
  });

  it("falls back to the request URL origin outside production", () => {
    const requestUrl = new URL("http://localhost:3000/api/admin/auth/login");
    const trusted = resolveTrustedMutationOrigin(requestUrl, {
      NODE_ENV: "development",
    });
    expect(trusted?.origin).toBe("http://localhost:3000");
  });
});

describe("isTrustedMutationOrigin", () => {
  it("accepts HTTPS reverse-proxy traffic when the public origin matches Origin", () => {
    const request = mutationRequest(INTERNAL, {
      origin: PUBLIC,
      "x-forwarded-host": "evil.example",
      "x-forwarded-proto": "http",
    });
    expect(
      isTrustedMutationOrigin(request, {
        CHAT_ADMIN_PUBLIC_ORIGIN: PUBLIC,
        NODE_ENV: "production",
      }),
    ).toBe(true);
  });

  it("accepts Referer when Origin is absent behind the reverse proxy", () => {
    const request = mutationRequest(INTERNAL, {
      referer: `${PUBLIC}/admin/login`,
    });
    expect(
      isTrustedMutationOrigin(request, {
        CHAT_ADMIN_PUBLIC_ORIGIN: PUBLIC,
        NODE_ENV: "production",
      }),
    ).toBe(true);
  });

  it("accepts valid same-origin local development requests", () => {
    const request = mutationRequest("http://localhost:3000/api/admin/auth/login", {
      origin: "http://localhost:3000",
    });
    expect(
      isTrustedMutationOrigin(request, { NODE_ENV: "development" }),
    ).toBe(true);
  });

  it("rejects mismatched origins", () => {
    const request = mutationRequest(INTERNAL, {
      origin: "https://evil.example",
    });
    expect(
      isTrustedMutationOrigin(request, {
        CHAT_ADMIN_PUBLIC_ORIGIN: PUBLIC,
        NODE_ENV: "production",
      }),
    ).toBe(false);
  });

  it("rejects missing Origin and Referer", () => {
    const request = mutationRequest(INTERNAL, {});
    expect(
      isTrustedMutationOrigin(request, {
        CHAT_ADMIN_PUBLIC_ORIGIN: PUBLIC,
        NODE_ENV: "production",
      }),
    ).toBe(false);
  });

  it("rejects malformed Origin values", () => {
    const request = mutationRequest(INTERNAL, { origin: "null" });
    expect(
      isTrustedMutationOrigin(request, {
        CHAT_ADMIN_PUBLIC_ORIGIN: PUBLIC,
        NODE_ENV: "production",
      }),
    ).toBe(false);
  });

  it("does not trust spoofed X-Forwarded-Host / X-Forwarded-Proto", () => {
    // Backend URL matches nothing useful; forwarded headers claim the public host,
    // but Origin is attacker-controlled. Must fail — we never read forwarded headers.
    const request = mutationRequest(INTERNAL, {
      origin: "https://evil.example",
      "x-forwarded-host": "join.rentreadbuy.com",
      "x-forwarded-proto": "https",
      host: "join.rentreadbuy.com",
    });
    expect(
      isTrustedMutationOrigin(request, {
        CHAT_ADMIN_PUBLIC_ORIGIN: PUBLIC,
        NODE_ENV: "production",
      }),
    ).toBe(false);
  });

  it("does not accept internal request.url when production public origin is unset", () => {
    const request = mutationRequest(INTERNAL, {
      origin: "http://127.0.0.1:3100",
      "x-forwarded-host": "join.rentreadbuy.com",
      "x-forwarded-proto": "https",
    });
    expect(
      isTrustedMutationOrigin(request, { NODE_ENV: "production" }),
    ).toBe(false);
  });

  it("rejects cross-origin even when forwarded headers match the public origin", () => {
    const request = mutationRequest("https://join.rentreadbuy.com/api/admin/auth/login", {
      origin: "https://attacker.example",
      "x-forwarded-host": "join.rentreadbuy.com",
      "x-forwarded-proto": "https",
    });
    expect(
      isTrustedMutationOrigin(request, {
        CHAT_ADMIN_PUBLIC_ORIGIN: PUBLIC,
        NODE_ENV: "production",
      }),
    ).toBe(false);
  });
});

describe("shared mutation guards use the origin validator", () => {
  it("guardAdminMutation rejects untrusted origins before CSRF", () => {
    const request = mutationRequest(INTERNAL, {
      origin: "https://evil.example",
      "x-csrf-token": "anything",
    });
    const result = guardAdminMutation(request);
    expect(result).toEqual({ ok: false, status: 403, error: "Invalid origin." });
  });

  it("guardAdminMutationWithToken rejects untrusted origins before CSRF", () => {
    const request = mutationRequest(INTERNAL, {
      origin: "https://evil.example",
    });
    const result = guardAdminMutationWithToken(request, "token");
    expect(result).toEqual({ ok: false, status: 403, error: "Invalid origin." });
  });
});
