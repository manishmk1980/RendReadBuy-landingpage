// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ADMIN_CSRF_HEADER } from "@/lib/adminAuth/constants";
import { LoginForm } from "./LoginForm";

const replace = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh }),
}));

describe("LoginForm CSRF initialization", () => {
  beforeEach(() => {
    replace.mockReset();
    refresh.mockReset();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
    window.sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("fetches CSRF before enabling submit and posts matching token on login", async () => {
    const csrfToken = "csrf.test-token-value";
    window.sessionStorage.setItem("rrb_silver_chat_presence_intent", "offline");
    const fetchMock = vi.fn(async (...args: Parameters<typeof fetch>): Promise<Response> => {
      const url = String(args[0]);
      if (url.includes("/api/admin/auth/csrf")) {
        return new Response(JSON.stringify({ csrfToken, configured: true }), {
          status: 200,
          headers: { "Cache-Control": "no-store" },
        });
      }
      if (url.includes("/api/admin/auth/login")) {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      return new Response(JSON.stringify({ error: "unexpected" }), { status: 500 });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<LoginForm configured initialError={null} />);

    const submit = screen.getByRole("button", { name: /sign in|preparing/i });
    expect((submit as HTMLButtonElement).disabled).toBe(true);

    await waitFor(() => {
      expect(
        (screen.getByRole("button", { name: /^sign in$/i }) as HTMLButtonElement).disabled,
      ).toBe(false);
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/auth/csrf",
      expect.objectContaining({
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      }),
    );

    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: "ops" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "secret" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/admin");
    });

    const loginCall = fetchMock.mock.calls.find((call) =>
      String(call[0]).includes("/api/admin/auth/login"),
    );
    expect(loginCall).toBeTruthy();
    const loginInit = (loginCall?.[1] ?? {}) as RequestInit;
    const headers = new Headers(loginInit.headers);
    expect(headers.get(ADMIN_CSRF_HEADER)).toBe(csrfToken);
    expect(JSON.parse(String(loginInit.body))).toMatchObject({
      username: "ops",
      password: "secret",
      csrfToken,
    });
    // New login clears prior presence confirmation so console announces fresh Online.
    expect(window.sessionStorage.getItem("rrb_silver_chat_presence_intent")).toBeNull();
  });

  it("keeps submit disabled and never bypasses CSRF when init fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ error: "down" }), { status: 503 })),
    );

    render(<LoginForm configured initialError={null} />);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent ?? "").toMatch(/secure sign-in|initialize/i);
    expect(
      (screen.getByRole("button", { name: /sign in|preparing/i }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(replace).not.toHaveBeenCalled();
  });

  it("does not call CSRF init when admin auth is not configured", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<LoginForm configured={false} initialError="Admin login is not configured on this server." />);

    expect(
      (screen.getByRole("button", { name: /^sign in$/i }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
