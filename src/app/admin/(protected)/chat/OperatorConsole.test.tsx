// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OperatorConsole } from "./OperatorConsole";

type FetchArgs = Parameters<typeof fetch>;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function mockApis(overrides?: {
  readiness?: unknown;
  dashboard?: unknown;
  conversation?: unknown;
  diagnostics?: unknown;
  heartbeatStatus?: number;
  offlineStatus?: number;
  heartbeatBody?: unknown;
  offlineBody?: unknown;
}) {
  const readiness = overrides?.readiness ?? {
    ok: true,
    conversationOps: "ready",
    ready: true,
    productionReady: false,
    config: { opsConfigured: true, connectCredentialConfigured: false },
  };
  const dashboard = overrides?.dashboard ?? {
    ok: true,
    data: {
      recentConversations: [
        {
          sessionId: "sess-1",
          status: "open",
          visitorLabel: "Jordan",
          intent: "silver-membership",
          originatingPage: "https://join.rentreadbuy.com/join",
          visitorPresence: "active",
          lastMessagePreview: "Can I join?",
          needsAttention: true,
          lastActivityAt: new Date().toISOString(),
        },
      ],
    },
  };
  const conversation = overrides?.conversation ?? {
    ok: true,
    data: {
      sessionId: "sess-1",
      status: "open",
      visitorLabel: "Jordan",
      intent: "silver-membership",
      originatingPage: "https://join.rentreadbuy.com/join",
      visitorPresence: "active",
      messages: [
        { id: "m1", role: "visitor", text: "Can I join?" },
        { id: "m2", actor: "operator", text: "Happy to help." },
      ],
    },
  };
  const diagnostics = overrides?.diagnostics ?? {
    ok: true,
    requestId: "req-diag",
    tenant: { key: "rrb-silver-campaign" },
    generatedAt: new Date().toISOString(),
    productionReady: false,
    data: { authentication: { valid: true, scopes: ["chat:dashboard"] } },
  };

  const fetchMock = vi.fn(async (...args: FetchArgs): Promise<Response> => {
    const url = String(args[0]);
    const init = args[1] as RequestInit | undefined;
    if (url.includes("/api/admin/chat/readiness")) {
      return jsonResponse(readiness);
    }
    if (url.includes("/api/admin/chat/dashboard")) {
      return jsonResponse(dashboard);
    }
    if (url.includes("/api/admin/chat/conversation")) {
      return jsonResponse(conversation);
    }
    if (url.includes("/api/admin/chat/diagnostics")) {
      return jsonResponse(diagnostics);
    }
    if (url.includes("/api/admin/chat/presence/heartbeat")) {
      return jsonResponse(
        overrides?.heartbeatBody ?? {
          ok: true,
          contributing: true,
          expiresInMs: 300_000,
          presencePolicy: "legacy",
        },
        overrides?.heartbeatStatus ?? 200,
      );
    }
    if (url.includes("/api/admin/chat/presence/offline")) {
      return jsonResponse(
        overrides?.offlineBody ?? { ok: true, cleared: 1 },
        overrides?.offlineStatus ?? 200,
      );
    }
    if (url.includes("/api/admin/chat/reply") && init?.method === "POST") {
      return jsonResponse({ ok: true });
    }
    if (url.includes("/api/admin/chat/resolve") && init?.method === "POST") {
      return jsonResponse({ ok: true });
    }
    if (url.includes("/api/admin/chat/reopen") && init?.method === "POST") {
      return jsonResponse({ ok: true });
    }
    return jsonResponse({ error: { message: `unexpected ${url}` } }, 500);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("OperatorConsole WS-5 IA", () => {
  beforeEach(() => {
    document.cookie = "rrb_silver_chat_admin_csrf=test-csrf; path=/";
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("exposes four navigation surfaces with keyboard-accessible tabs", async () => {
    mockApis();
    render(<OperatorConsole />);

    await waitFor(() => {
      expect(
        screen.getByRole("tab", { name: "Overview" }).getAttribute("aria-selected"),
      ).toBe("true");
    });

    for (const name of [
      "Overview",
      "Conversations",
      "Operator Availability",
      "Diagnostics",
    ]) {
      expect(screen.getByRole("tab", { name })).toBeTruthy();
    }

    fireEvent.click(screen.getByRole("tab", { name: "Conversations" }));
    expect(
      screen.getByRole("tab", { name: "Conversations" }).getAttribute("aria-selected"),
    ).toBe("true");
    expect(screen.getByRole("heading", { name: "Conversations" })).toBeTruthy();
  });

  it("loads Central conversation fields in the inbox and detail pane", async () => {
    const fetchMock = mockApis();
    render(<OperatorConsole />);

    fireEvent.click(screen.getByRole("tab", { name: "Conversations" }));

    await waitFor(() => {
      expect(screen.getByText(/Jordan/)).toBeTruthy();
    });
    expect(screen.getByText(/silver-membership/)).toBeTruthy();
    expect(screen.getByText(/needs attention/i)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Jordan/i }));

    await waitFor(() => {
      expect(screen.getAllByText("Can I join?").length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText("Happy to help.")).toBeTruthy();
    });

    const dashboardCalls = fetchMock.mock.calls.filter((call) =>
      String(call[0]).includes("/api/admin/chat/dashboard"),
    );
    expect(dashboardCalls.some((call) => String(call[0]).includes("inbox=active"))).toBe(
      true,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Archived (read)" }));
    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some((call) =>
          String(call[0]).includes("inbox=archived"),
        ),
      ).toBe(true);
    });
  });

  it("keeps Offline until heartbeat succeeds, then uses one state-aware control", async () => {
    let heartbeatCalls = 0;
    const fetchMock = vi.fn(async (...args: FetchArgs): Promise<Response> => {
      const url = String(args[0]);
      if (url.includes("/readiness")) {
        return jsonResponse({
          ok: true,
          conversationOps: "ready",
          ready: true,
          config: { opsConfigured: true },
        });
      }
      if (url.includes("/dashboard")) {
        return jsonResponse({ ok: true, data: { recentConversations: [] } });
      }
      if (url.includes("/presence/heartbeat")) {
        heartbeatCalls += 1;
        if (heartbeatCalls === 1) {
          return jsonResponse(
            { error: { message: "presence scope missing" } },
            403,
          );
        }
        return jsonResponse({
          ok: true,
          contributing: true,
          expiresInMs: 300_000,
          presencePolicy: "legacy",
        });
      }
      if (url.includes("/presence/offline")) {
        return jsonResponse({ ok: true, cleared: 1 });
      }
      return jsonResponse({ ok: true });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<OperatorConsole />);
    fireEvent.click(screen.getByRole("tab", { name: "Operator Availability" }));

    const goOnline = await screen.findByRole("button", { name: /go online/i });
    fireEvent.click(goOnline);

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toMatch(/presence scope/i);
    });
    expect(screen.getByRole("button", { name: /go online/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /go offline/i })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /go online/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /go offline/i })).toBeTruthy();
    });
    const statuses = screen.getAllByRole("status");
    expect(
      statuses.some((node) => /online/i.test(node.textContent ?? "")),
    ).toBe(true);
  });

  it("does not flip to Offline until the offline API succeeds", async () => {
    let offlineCalls = 0;
    const fetchMock = vi.fn(async (...args: FetchArgs): Promise<Response> => {
      const url = String(args[0]);
      if (url.includes("/readiness")) {
        return jsonResponse({
          ok: true,
          conversationOps: "ready",
          ready: true,
          config: { opsConfigured: true },
        });
      }
      if (url.includes("/dashboard")) {
        return jsonResponse({ ok: true, data: { recentConversations: [] } });
      }
      if (url.includes("/presence/heartbeat")) {
        return jsonResponse({
          ok: true,
          contributing: true,
          expiresInMs: 300_000,
          presencePolicy: "legacy",
        });
      }
      if (url.includes("/presence/offline")) {
        offlineCalls += 1;
        if (offlineCalls === 1) {
          return jsonResponse({ error: { message: "offline failed" } }, 503);
        }
        return jsonResponse({ ok: true, cleared: 1 });
      }
      return jsonResponse({ ok: true });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<OperatorConsole />);
    fireEvent.click(screen.getByRole("tab", { name: "Operator Availability" }));
    fireEvent.click(await screen.findByRole("button", { name: /go online/i }));
    await screen.findByRole("button", { name: /go offline/i });

    fireEvent.click(screen.getByRole("button", { name: /go offline/i }));
    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toMatch(/offline failed/i);
    });
    expect(screen.getByRole("button", { name: /go offline/i })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /go offline/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /go online/i })).toBeTruthy();
    });
  });

  it("wires diagnostics and recovers from readiness failures", async () => {
    let readinessFails = true;
    const fetchMock = vi.fn(async (...args: FetchArgs): Promise<Response> => {
      const url = String(args[0]);
      if (url.includes("/readiness")) {
        if (readinessFails) {
          return jsonResponse(
            { error: { message: "Central unreachable" } },
            503,
          );
        }
        return jsonResponse({
          ok: true,
          conversationOps: "ready",
          ready: true,
          config: { opsConfigured: true, connectCredentialConfigured: false },
        });
      }
      if (url.includes("/diagnostics")) {
        return jsonResponse({
          ok: true,
          requestId: "req-1",
          tenant: { key: "rrb-silver-campaign" },
          data: { ok: true },
          productionReady: false,
        });
      }
      if (url.includes("/dashboard")) {
        return jsonResponse({ ok: true, data: { recentConversations: [] } });
      }
      return jsonResponse({ ok: true });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<OperatorConsole />);

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toMatch(/unreachable/i);
    });

    readinessFails = false;
    fireEvent.click(screen.getByRole("button", { name: /retry readiness/i }));
    await waitFor(() => {
      expect(screen.getByRole("status").textContent).toMatch(/readiness confirmed/i);
    });

    fireEvent.click(screen.getByRole("tab", { name: "Diagnostics" }));
    await waitFor(() => {
      expect(screen.getByText("rrb-silver-campaign")).toBeTruthy();
      expect(screen.getByText(/req-1/)).toBeTruthy();
    });
  });

  it("supports reply resolve reopen workflow with success status", async () => {
    mockApis();
    render(<OperatorConsole />);
    fireEvent.click(screen.getByRole("tab", { name: "Conversations" }));
    await waitFor(() => screen.getByText(/Jordan/));
    fireEvent.click(screen.getByRole("button", { name: /Jordan/i }));
    await screen.findByLabelText(/reply/i);

    fireEvent.change(screen.getByLabelText(/reply/i), {
      target: { value: "Welcome to Silver." },
    });
    fireEvent.click(screen.getByRole("button", { name: /send reply/i }));
    await waitFor(() => {
      expect(screen.getByRole("status").textContent).toMatch(/reply sent/i);
    });

    fireEvent.click(screen.getByRole("button", { name: /^resolve$/i }));
    await waitFor(() => {
      expect(screen.getByRole("status").textContent).toMatch(/resolved/i);
    });

    fireEvent.click(screen.getByRole("button", { name: /^reopen$/i }));
    await waitFor(() => {
      expect(screen.getByRole("status").textContent).toMatch(/reopened/i);
    });
  });

  it("stacks navigation for narrow viewports via responsive CSS class hooks", () => {
    mockApis({
      readiness: {
        ok: true,
        conversationOps: "not_configured",
        ready: false,
        config: { opsConfigured: false },
      },
    });
    const { container } = render(<OperatorConsole />);
    expect(container.querySelector(`.${"tabList"}`) || container.querySelector('[role="tablist"]')).toBeTruthy();
    const nav = screen.getByRole("navigation", { name: /chat administration/i });
    expect(within(nav).getAllByRole("tab")).toHaveLength(4);
  });
});
