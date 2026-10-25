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

  it("returns a controlled body when JSON is invalid on HTTP error statuses", async () => {
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

  it("treats invalid/non-JSON HTTP 2xx GET responses as failures (status 0)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response("<html>ok</html>", {
            status: 200,
            headers: { "content-type": "text/html" },
          }),
      ),
    );

    const result = await adminGet<{ error?: { message?: string } }>(
      "/api/admin/chat/conversation?sessionId=s1",
    );
    expect(result.status).toBe(0);
    expect(result.body.error?.message).toMatch(/unreadable/i);
  });

  it("treats invalid/non-JSON HTTP 2xx mutate responses as failures (status 0)", async () => {
    document.cookie = "rrb_silver_chat_admin_csrf=test-csrf; path=/";
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response("not-json", {
            status: 200,
            headers: { "content-type": "text/plain" },
          }),
      ),
    );

    const result = await adminMutate<{ error?: { message?: string } }>(
      "/api/admin/chat/reply",
      { sessionId: "s1", text: "hi" },
    );
    expect(result.status).toBe(0);
    expect(errorMessage(result.body, "fallback")).toMatch(/unreadable/i);
  });

  it("still sends CSRF token on mutate when the response body is unreadable 2xx", async () => {
    document.cookie = "rrb_silver_chat_admin_csrf=csrf-from-cookie; path=/";
    const fetchMock = vi.fn(
      async () =>
        new Response("oops", {
          status: 200,
          headers: { "content-type": "text/plain" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await adminMutate("/api/admin/chat/presence/heartbeat", {
      consoleInstanceId: "c1",
    });

    expect(fetchMock).toHaveBeenCalled();
    const call = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const headers = new Headers(call[1].headers);
    expect(headers.get("x-csrf-token")).toBe("csrf-from-cookie");
    expect(String(call[1].body)).toContain("csrf-from-cookie");
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
