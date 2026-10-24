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
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 })),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("navigates to login only after a successful logout response", async () => {
    render(<LogoutButton />);
    fireEvent.click(screen.getByRole("button", { name: /log out/i }));

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/admin/login");
    });
    expect(refresh).toHaveBeenCalled();
  });

  it("does not navigate when logout fails so the session stays on the operator UI", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ error: "Invalid CSRF token." }), { status: 403 })),
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
      vi.fn(async () => {
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
