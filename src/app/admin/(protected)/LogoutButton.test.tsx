// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LogoutButton } from "./LogoutButton";

const replace = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh }),
}));

describe("LogoutButton", () => {
  beforeEach(() => {
    replace.mockReset();
    refresh.mockReset();
    window.sessionStorage.clear();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 })),
    );
  });

  afterEach(() => {
    cleanup();
    window.sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("best-effort Offline then navigates after successful logout", async () => {
    window.sessionStorage.setItem("rrb_silver_chat_presence_intent", "online");
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/admin/chat/presence/offline")) {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<LogoutButton />);
    fireEvent.click(screen.getByRole("button", { name: /log out/i }));

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/admin/login");
    });
    expect(refresh).toHaveBeenCalled();
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
      "/api/admin/chat/presence/offline",
    );
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("/api/admin/auth/logout");
    expect(window.sessionStorage.getItem("rrb_silver_chat_presence_intent")).toBeNull();
  });

  it("does not navigate when logout fails so the session stays on the operator UI", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/presence/offline")) {
          return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }
        return new Response(JSON.stringify({ error: "Invalid CSRF token." }), {
          status: 403,
        });
      }),
    );

    render(<LogoutButton />);
    fireEvent.click(screen.getByRole("button", { name: /log out/i }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent ?? "").toMatch(/sign-out failed|csrf/i);
    expect(replace).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("does not navigate when the logout request throws", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/presence/offline")) {
          return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }
        throw new Error("network down");
      }),
    );

    render(<LogoutButton />);
    fireEvent.click(screen.getByRole("button", { name: /log out/i }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent ?? "").toMatch(/sign-out failed/i);
    expect(replace).not.toHaveBeenCalled();
  });
});
