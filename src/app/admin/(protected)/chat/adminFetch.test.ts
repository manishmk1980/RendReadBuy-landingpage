// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { adminGet, adminMutate, errorMessage, isAbortError } from "./adminFetch";

describe("adminFetch resilience", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns status 0 for network failures instead of throwing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );

    const result = await adminGet<{ error?: { message?: string } }>(
      "/api/admin/chat/readiness",
    );
    expect(result.status).toBe(0);
    expect(result.body.error?.message).toMatch(/network error/i);
  });

  it("returns a controlled body when JSON is invalid", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response("not-json", {
            status: 502,
            headers: { "content-type": "text/plain" },
          }),
      ),
    );

    const result = await adminGet<{ error?: { message?: string } }>(
      "/api/admin/chat/diagnostics",
    );
    expect(result.status).toBe(502);
    expect(result.body.error?.message).toMatch(/unreadable/i);
  });

  it("rethrows AbortError so callers can ignore cancelled requests", async () => {
    const abortError = new DOMException("Aborted", "AbortError");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw abortError;
      }),
    );

    await expect(adminGet("/api/admin/chat/dashboard")).rejects.toBe(abortError);
    expect(isAbortError(abortError)).toBe(true);
  });

  it("returns status 0 for mutate network failures", async () => {
    document.cookie = "rrb_silver_chat_admin_csrf=test-csrf; path=/";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );

    const result = await adminMutate<{ error?: { message?: string } }>(
      "/api/admin/chat/reply",
      { sessionId: "s1", text: "hi" },
    );
    expect(result.status).toBe(0);
    expect(errorMessage(result.body, "fallback")).toMatch(/network error/i);
  });
});
